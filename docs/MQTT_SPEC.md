# 📡 Mosquitto MQTT Topic & Schema Specification

This document specifies the frozen MQTT message contract between the **FastAPI Backend** and the **Raspberry Pi 5 Robot Gateway**.

The Mosquitto MQTT broker operates on port `1883`.

---

## Topic Architecture

```
FastAPI Backend                     Mosquitto (1883)                    Pi 5 Robot Gateway
      │                                     │                                    │
      ├─────── backend/commands ───────────►├─────── backend/commands ──────────►│
      ├─────── backend/teleop ─────────────►├─────── backend/teleop ────────────►│
      │                                     │                                    │
      │◄────── robot/status ────────────────┤◄────── robot/status ───────────────┤ (1 Hz Retained)
      │◄────── robot/events ────────────────┤◄────── robot/events ───────────────┤
```

---

## 1. Backend to Robot Topics

### `backend/commands` (QoS 1)
High-level state transitions, mission dispatches, volume, and cancellations.

#### A. Dispatch Mission (Multi-stop)
```json
{
  "command": "dispatch",
  "delivery_id": 105,
  "stops": [5, 2]
}
```

#### B. Cancel Current Action
```json
{
  "command": "cancel"
}
```

#### C. Return to Charging Dock
```json
{
  "command": "go_dock"
}
```

#### D. Mode Switching
```json
{
  "command": "set_mode",
  "mode": "delivery" // delivery | manual | survey | maintenance
}
```

#### E. Confirm Arrival (Guest pickup)
```json
{
  "command": "confirm_arrival",
  "method": "done_button" // done_button | tray_weight | timeout
}
```

---

### `backend/teleop` (QoS 0)
High-frequency (10 Hz) manual velocity stream.

```json
{
  "linear": 0.30,
  "angular": -0.10,
  "speed_limit": 0.50
}
```
> **Safety Watchdog Rule:**
> If the robot receives no message on `backend/teleop` for **0.50 seconds**, the motor controllers must autonomously decelerate to 0.0 m/s.

---

## 2. Robot to Backend Topics

### `robot/status` (QoS 1, Retained, 1 Hz)
Heartbeat and full telemetry state published once every second.

```json
{
  "mode": "delivery",
  "state": "navigating",
  "battery_pct": 87.5,
  "pose": {
    "x": 2.14,
    "y": 3.82,
    "yaw": 1.57
  },
  "current_delivery_id": 105,
  "current_stop": 5,
  "ros2_available": true,
  "online": true
}
```

### `robot/events` (QoS 1)
Asynchronous mission state change events.

- **Arrived at Table:**
  ```json
  { "event": "arrived", "delivery_id": 105, "stop": 5 }
  ```
- **Pickup Confirmed:**
  ```json
  { "event": "confirmed", "delivery_id": 105, "stop": 5, "method": "done_button" }
  ```
- **Delivery Complete (All Stops Finished):**
  ```json
  { "event": "delivery_done", "delivery_id": 105, "trip_seconds": 64 }
  ```
- **Path Blocked (Obstruction Detected):**
  ```json
  { "event": "blocked", "stop": 5, "duration_sec": 4.2 }
  ```
- **Emergency Stop Tripped:**
  ```json
  { "event": "e_stop", "tripped": true }
  ```
