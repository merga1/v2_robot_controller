#!/usr/bin/env python3
"""
Full Robot Simulation & Mission Manager Test Node
Simulates the physical robot navigation, state machine, sensor events, and battery.

Can be run on any PC (Windows / Linux / Mac) with Python and paho-mqtt.
Connects to MQTT: localhost:1883
"""

import json
import math
import sys
import threading
import time
import yaml

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("paho-mqtt not installed. Run: pip install paho-mqtt")
    sys.exit(1)

TABLES = {
    1: {"name": "Table 1", "x": 2.0, "y": 1.5, "yaw": 1.57},
    2: {"name": "Table 2", "x": 4.0, "y": 1.5, "yaw": 1.57},
    3: {"name": "Table 3", "x": 6.0, "y": 1.5, "yaw": 1.57},
    4: {"name": "Table 4", "x": 8.0, "y": 1.5, "yaw": 1.57},
    5: {"name": "Table 5", "x": 2.0, "y": 4.5, "yaw": -1.57},
    6: {"name": "Table 6", "x": 4.0, "y": 4.5, "yaw": -1.57},
    7: {"name": "Table 7", "x": 6.0, "y": 4.5, "yaw": -1.57},
    8: {"name": "Table 8", "x": 8.0, "y": 4.5, "yaw": -1.57},
    9: {"name": "Table 9 - VIP", "x": 10.0, "y": 3.0, "yaw": 3.14},
    10: {"name": "Table 10 - Bar", "x": 0.5, "y": 3.0, "yaw": 0.0},
}

HOME = {"x": 0.0, "y": 0.0, "yaw": 0.0}


class MockRobotSim:
    def __init__(self, broker_host="localhost", broker_port=1883):
        self.broker_host = broker_host
        self.broker_port = broker_port

        self.mode = "delivery"      # delivery, manual, survey, maintenance
        self.state = "idle"         # idle, going_to_table, arrived, waiting_confirm, going_home, docking, blocked
        self.battery_pct = 95.0
        self.pose = {"x": 0.0, "y": 0.0, "yaw": 0.0}
        self.volume = 70

        self.current_delivery_id = None
        self.current_stop = None
        self.stop_queue = []
        self.target_pose = HOME.copy()
        self.speed = 0.8  # m/s simulated speed
        self.arrival_start_time = 0.0
        self.trip_start_time = 0.0

        self.client = mqtt.Client(client_id="mock_robot_sim_node")
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

        try:
            self.client.connect(self.broker_host, self.broker_port, 60)
            self.client.loop_start()
            print(f"🤖 [Sim] Connected to MQTT broker at {self.broker_host}:{self.broker_port}")
        except Exception as e:
            print(f"🤖 [Sim] Warning: Could not connect to broker ({e}). Retrying in loop.")

        self.running = True
        self.sim_thread = threading.Thread(target=self._run_simulation, daemon=True)
        self.sim_thread.start()

    def on_connect(self, client, userdata, flags, rc):
        print(f"🤖 [Sim] MQTT Online (rc={rc})")
        client.subscribe("backend/commands")
        client.subscribe("backend/teleop")

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode())
        except Exception:
            return

        if topic == "backend/commands":
            cmd = payload.get("command")
            print(f"🤖 [Sim] Command: {cmd} -> {payload}")

            if cmd == "dispatch":
                self.current_delivery_id = payload.get("delivery_id")
                self.stop_queue = list(payload.get("stops", []))
                self.mode = "delivery"
                self.trip_start_time = time.time()
                self._next_stop()

            elif cmd == "cancel":
                print("🤖 [Sim] Delivery cancelled")
                self.state = "idle"
                self.stop_queue.clear()
                self.current_delivery_id = None
                self.current_stop = None
                self.target_pose = HOME.copy()

            elif cmd == "go_dock":
                print("🤖 [Sim] Going to charging dock")
                self.state = "going_home"
                self.stop_queue.clear()
                self.target_pose = HOME.copy()

            elif cmd == "set_mode":
                self.mode = payload.get("mode", self.mode)
                print(f"🤖 [Sim] Mode changed to: {self.mode}")

            elif cmd == "set_volume":
                self.volume = payload.get("volume", self.volume)

            elif cmd == "confirm_arrival":
                # Triggered when guest presses Done on the robot screen
                if self.state in ["arrived", "waiting_confirm"]:
                    self._handle_confirmation("done_button")

        elif topic == "backend/teleop" and self.mode == "manual":
            linear = float(payload.get("linear", 0.0))
            angular = float(payload.get("angular", 0.0))
            # Move robot pose directly based on teleop
            yaw = self.pose["yaw"] + angular * 0.1
            self.pose["yaw"] = yaw
            self.pose["x"] += linear * math.cos(yaw) * 0.1
            self.pose["y"] += linear * math.sin(yaw) * 0.1

    def _next_stop(self):
        if self.stop_queue:
            self.current_stop = self.stop_queue.pop(0)
            self.state = "going_to_table"
            table_info = TABLES.get(self.current_stop, {"x": 2.0, "y": 2.0, "yaw": 0.0})
            self.target_pose = {"x": table_info["x"], "y": table_info["y"], "yaw": table_info["yaw"]}
            print(f"🤖 [Sim] En route to Table {self.current_stop} at ({self.target_pose['x']}, {self.target_pose['y']})")
        else:
            # All stops completed! Return home
            self.current_stop = None
            self.state = "going_home"
            self.target_pose = HOME.copy()
            trip_time = int(time.time() - self.trip_start_time) if self.trip_start_time else 45
            self._publish_event({"event": "delivery_done", "delivery_id": self.current_delivery_id, "trip_seconds": trip_time})
            print(f"🤖 [Sim] All stops completed! Returning to base. Trip time: {trip_time}s")

    def _handle_confirmation(self, method="done_button"):
        print(f"🤖 [Sim] Order confirmed at Table {self.current_stop} via {method}")
        self._publish_event({
            "event": "confirmed",
            "delivery_id": self.current_delivery_id,
            "stop": self.current_stop,
            "method": method
        })
        time.sleep(1.0)
        self._next_stop()

    def _publish_status(self):
        status = {
            "mode": self.mode,
            "state": self.state,
            "battery_pct": round(self.battery_pct, 1),
            "pose": {
                "x": round(self.pose["x"], 2),
                "y": round(self.pose["y"], 2),
                "yaw": round(self.pose["yaw"], 2),
            },
            "current_delivery_id": self.current_delivery_id,
            "current_stop": self.current_stop,
        }
        self.client.publish("robot/status", json.dumps(status), retain=True)

    def _publish_event(self, event_data):
        self.client.publish("robot/events", json.dumps(event_data))

    def _run_simulation(self):
        dt = 0.2  # 5 Hz simulation tick
        status_timer = 0.0

        while self.running:
            time.sleep(dt)
            status_timer += dt

            # 1. Navigation interpolation
            if self.state in ["going_to_table", "going_home"]:
                dx = self.target_pose["x"] - self.pose["x"]
                dy = self.target_pose["y"] - self.pose["y"]
                dist = math.hypot(dx, dy)

                if dist > 0.1:
                    step = min(dist, self.speed * dt)
                    angle = math.atan2(dy, dx)
                    self.pose["x"] += step * math.cos(angle)
                    self.pose["y"] += step * math.sin(angle)
                    self.pose["yaw"] = angle
                    self.battery_pct = max(5.0, self.battery_pct - 0.005)
                else:
                    # Reached target
                    self.pose["x"] = self.target_pose["x"]
                    self.pose["y"] = self.target_pose["y"]
                    self.pose["yaw"] = self.target_pose["yaw"]

                    if self.state == "going_to_table":
                        self.state = "arrived"
                        self.arrival_start_time = time.time()
                        print(f"🤖 [Sim] Arrived at Table {self.current_stop}! Waiting for guest confirmation.")
                        self._publish_event({
                            "event": "arrived",
                            "delivery_id": self.current_delivery_id,
                            "stop": self.current_stop
                        })
                    elif self.state == "going_home":
                        self.state = "docking"
                        print("🤖 [Sim] Reached base dock. Docking & recharging...")

            elif self.state == "arrived":
                # Wait 2 seconds, then transition to waiting_confirm
                if time.time() - self.arrival_start_time > 2.0:
                    self.state = "waiting_confirm"

            elif self.state == "waiting_confirm":
                # Auto-confirm timeout simulation (after 15 seconds) if user hasn't clicked Done
                if time.time() - self.arrival_start_time > 15.0:
                    self._handle_confirmation("timeout")

            elif self.state == "docking":
                # Recharging
                self.battery_pct = min(100.0, self.battery_pct + 0.1)
                if self.battery_pct >= 99.0:
                    self.state = "idle"
                    self.current_delivery_id = None

            # Periodic 1 Hz status broadcast
            if status_timer >= 1.0:
                self._publish_status()
                status_timer = 0.0


if __name__ == "__main__":
    sim = MockRobotSim()
    print("🤖 Mock Robot Simulator started. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        sim.running = False
        print("Simulator stopped.")
