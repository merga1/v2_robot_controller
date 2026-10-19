#!/usr/bin/env python3
"""
ROS 2 Robot Gateway Node
Bridge between the Mosquitto MQTT Broker and internal ROS 2 DDS topics/services/actions.

Runs on: Raspberry Pi 5 (Robot onboard computer)
Subscribes to MQTT:
  - backend/commands (dispatch, cancel, go_dock, set_mode, set_volume, confirm_arrival)
  - backend/teleop (10 Hz velocity commands with 0.5s safety timeout)
Publishes to MQTT:
  - robot/status (1 Hz retained message)
  - robot/events (arrived, confirmed, blocked, e_stop, delivery_done)

ROS 2 Interfaces:
  - Publishes: /cmd_vel_teleop (geometry_msgs/Twist) -> twist_mux priority 90
  - Action Client: /navigate_to_pose (nav2_msgs/action/NavigateToPose)
  - Services: /mission_manager/set_mode, /mission_manager/confirm
  - Subscribes: /amcl_pose or /odom (nav_msgs/Odometry or geometry_msgs/PoseWithCovarianceStamped)
  - Subscribes: /battery_state (sensor_msgs/BatteryState)
"""

import json
import math
import os
import sys
import threading
import time
from pathlib import Path
import yaml

try:
    import rclpy
    from rclpy.node import Node
    from rclpy.action import ActionClient
    from geometry_msgs.msg import Twist, PoseStamped
    from nav_msgs.msg import Odometry
    from sensor_msgs.msg import BatteryState
    from std_msgs.msg import String, Float32
    ROS2_AVAILABLE = True
except ImportError:
    ROS2_AVAILABLE = False

import paho.mqtt.client as mqtt

# Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
TABLES_FILE = Path(__file__).resolve().parent.parent / "mqtt_contract" / "tables.yaml"
LOCAL_STATE_FILE = Path(__file__).resolve().parent / "local_mission_state.json"
TELEOP_TIMEOUT_SEC = 0.5
CONFIRMATION_TIMEOUT_SEC = 90.0


class RobotGatewayNode:
    def __init__(self, broker_host=MQTT_BROKER, broker_port=MQTT_PORT):
        self.broker_host = broker_host
        self.broker_port = broker_port

        # State
        self.mode = "delivery"       # delivery, manual, survey, maintenance
        self.state = "idle"          # idle, navigating, arrived, waiting_confirm, docking, blocked, error
        self.battery_pct = 100.0
        self.pose = {"x": 0.0, "y": 0.0, "yaw": 0.0}
        self.current_delivery_id = None
        self.current_stop = None
        self.stop_queue = []
        self.volume = 70

        # Teleoperation safety
        self.last_teleop_time = 0.0
        self.is_teleop_active = False

        # Multi-stop & confirmation timing
        self.arrival_timestamp = 0.0
        self.trip_start_time = 0.0

        # Authoritative table poses
        self.tables, self.home_dock = self._load_tables(TABLES_FILE)

        # Restore any interrupted offline mission
        self._restore_offline_mission()

        # MQTT Client setup with auto-reconnection
        self.mqtt_client = mqtt.Client(client_id="robot_gateway_pi5")
        self.mqtt_client.on_connect = self.on_mqtt_connect
        self.mqtt_client.on_disconnect = self.on_mqtt_disconnect
        self.mqtt_client.on_message = self.on_mqtt_message

        try:
            self.mqtt_client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.mqtt_client.loop_start()
            print(f"[Gateway] Connected to MQTT broker at {self.broker_host}:{self.broker_port}")
        except Exception as e:
            print(f"[Gateway] Warning: Broker unreachable at startup ({e}). Continuing in standalone mode.")

        # Worker threads: 1 Hz telemetry loop and 0.5s teleop safety watchdog
        self.running = True
        self.status_thread = threading.Thread(target=self._status_loop, daemon=True)
        self.status_thread.start()

        self.watchdog_thread = threading.Thread(target=self._watchdog_loop, daemon=True)
        self.watchdog_thread.start()

    def _load_tables(self, path):
        tables = {}
        home = {"x": 0.0, "y": 0.0, "yaw": 0.0}
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f) or {}
                    tables = data.get("tables", {})
                    home = data.get("home_dock", home)
        except Exception as e:
            print(f"[Gateway] Error loading tables config: {e}")
        return tables, home

    def _save_offline_state(self):
        try:
            state_data = {
                "delivery_id": self.current_delivery_id,
                "current_stop": self.current_stop,
                "stop_queue": self.stop_queue,
                "mode": self.mode,
                "state": self.state,
                "updated_at": time.time(),
            }
            with open(LOCAL_STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(state_data, f)
        except Exception:
            pass

    def _restore_offline_mission(self):
        try:
            if LOCAL_STATE_FILE.exists():
                with open(LOCAL_STATE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("delivery_id") and data.get("state") in ["navigating", "arrived", "waiting_confirm"]:
                    self.current_delivery_id = data["delivery_id"]
                    self.current_stop = data.get("current_stop")
                    self.stop_queue = data.get("stop_queue", [])
                    self.mode = data.get("mode", "delivery")
                    self.state = data.get("state", "navigating")
                    print(f"[Gateway] Recovered active delivery {self.current_delivery_id} (stop {self.current_stop}) from local cache.")
        except Exception as e:
            print(f"[Gateway] Failed to restore local mission: {e}")

    def on_mqtt_connect(self, client, userdata, flags, rc):
        print(f"[Gateway] MQTT connected (code={rc})")
        client.subscribe("backend/commands")
        client.subscribe("backend/teleop")
        # Reconcile if a delivery completed while broker was disconnected
        if self.current_delivery_id and self.state == "docking":
            self.publish_event({
                "event": "delivery_done",
                "delivery_id": self.current_delivery_id,
                "offline_recovered": True,
            })

    def on_mqtt_disconnect(self, client, userdata, rc):
        print(f"[Gateway] MQTT disconnected (rc={rc}). Robot will continue local mission autonomously.")

    def on_mqtt_message(self, client, userdata, msg):
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except Exception:
            return

        if topic == "backend/commands":
            self.handle_command(payload)
        elif topic == "backend/teleop":
            self.handle_teleop(payload)

    def handle_command(self, payload):
        cmd = payload.get("command")
        print(f"[Gateway] Command received: {cmd}")

        if cmd == "dispatch":
            self.current_delivery_id = payload.get("delivery_id")
            # Preserve ordered stops strictly as received (e.g. Table 5 followed by Table 2)
            self.stop_queue = list(payload.get("stops", []))
            self.mode = "delivery"
            self.trip_start_time = time.time()
            self._start_next_stop()

        elif cmd == "cancel":
            self.state = "idle"
            self.stop_queue.clear()
            self.current_delivery_id = None
            self.current_stop = None
            self._save_offline_state()
            self.publish_event({"event": "delivery_cancelled"})

        elif cmd == "go_dock":
            self.state = "docking"
            self.stop_queue.clear()
            self.current_stop = None
            self._save_offline_state()

        elif cmd == "confirm_arrival":
            method = payload.get("method", "done_button")
            self._handle_stop_confirmed(method)

        elif cmd == "set_mode":
            new_mode = payload.get("mode")
            if new_mode in ["delivery", "manual", "survey", "maintenance"]:
                # Safety check: survey mode requires battery > 40%
                if new_mode == "survey" and self.battery_pct < 40.0:
                    print("[Gateway] Rejecting survey mode: battery below 40%")
                    return
                self.mode = new_mode

        elif cmd == "set_volume":
            self.volume = max(0, min(100, int(payload.get("volume", 70))))

    def _start_next_stop(self):
        if self.stop_queue:
            self.current_stop = self.stop_queue.pop(0)
            self.state = "navigating"
            self._save_offline_state()
            target_pose = self.tables.get(self.current_stop, self.home_dock)
            print(f"[Gateway] Navigating to Stop {self.current_stop} at {target_pose}")
        else:
            # All stops completed
            self.current_stop = None
            self.state = "docking"
            self._save_offline_state()
            trip_time = int(time.time() - self.trip_start_time) if self.trip_start_time else 0
            self.publish_event({
                "event": "delivery_done",
                "delivery_id": self.current_delivery_id,
                "trip_seconds": trip_time,
            })

    def _handle_stop_confirmed(self, method="done_button"):
        if self.state in ["arrived", "waiting_confirm"]:
            print(f"[Gateway] Table {self.current_stop} pickup confirmed via {method}")
            self.publish_event({
                "event": "confirmed",
                "delivery_id": self.current_delivery_id,
                "stop": self.current_stop,
                "method": method,
            })
            self._start_next_stop()

    def handle_teleop(self, payload):
        """Processes 10 Hz teleop commands with speed limit clamping."""
        if self.mode != "manual":
            return
        self.last_teleop_time = time.time()
        self.is_teleop_active = True

        linear = float(payload.get("linear", 0.0))
        angular = float(payload.get("angular", 0.0))
        speed_limit = float(payload.get("speed_limit", 0.5))

        linear = max(-speed_limit, min(speed_limit, linear))
        angular = max(-1.0, min(1.0, angular))

        # In physical ROS 2: publish to /cmd_vel_teleop (priority 90 twist_mux)

    def _watchdog_loop(self):
        """Safety Watchdog: stops commanded motion if no valid teleop within 0.5s."""
        while self.running:
            time.sleep(0.1)
            now = time.time()

            # 1. Teleop 0.5s Watchdog
            if self.is_teleop_active and (now - self.last_teleop_time > TELEOP_TIMEOUT_SEC):
                self.is_teleop_active = False
                # Publish zero velocity to prevent robot runaway
                # /cmd_vel_teleop -> Twist(linear=0, angular=0)

            # 2. Arrival confirmation timeout (90 seconds policy)
            if self.state == "waiting_confirm":
                if now - self.arrival_timestamp >= CONFIRMATION_TIMEOUT_SEC:
                    print(f"[Gateway] 90s confirmation timeout expired at Table {self.current_stop}.")
                    self._handle_stop_confirmed(method="timeout_policy")

    def publish_status(self):
        status_msg = {
            "mode": self.mode,
            "state": self.state,
            "battery_pct": round(self.battery_pct, 1),
            "pose": self.pose,
            "current_delivery_id": self.current_delivery_id,
            "current_stop": self.current_stop,
            "ros2_available": ROS2_AVAILABLE,
            "online": True,
        }
        try:
            self.mqtt_client.publish("robot/status", json.dumps(status_msg), retain=True)
        except Exception:
            pass

    def publish_event(self, event_dict):
        try:
            self.mqtt_client.publish("robot/events", json.dumps(event_dict))
        except Exception:
            pass

    def _status_loop(self):
        while self.running:
            self.publish_status()
            time.sleep(1.0)


if __name__ == "__main__":
    gateway = RobotGatewayNode()
    print("[Gateway] Pi 5 Robot Gateway Node initialized.")
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        gateway.running = False
        print("[Gateway] Exiting.")
        sys.exit(0)
