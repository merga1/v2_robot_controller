# MQTT Communication Contract: App Group ↔ Navigation Group

*This contract is frozen as specified in the Restaurant Delivery Robot Plan.*

## Architecture
- **Broker**: Mosquitto running on Port `1883` (and WebSockets on `9001`).
- **Connection**: Robot dials OUTWARD to the broker. Backend connects to the broker.
- **Security**: ROS 2 DDS is strictly internal to the robot; the Gateway node is the sole bridge.

---

## 1. Backend to Robot (Commands)

### A. Dispatch Mission (`backend/commands`)
Sent when Chef dispatches orders for one or more tables.
```json
{
  "command": "dispatch",
  "delivery_id": 104,
  "stops": [5, 2]
}
```

### B. Control Commands (`backend/commands`)
Cancel delivery, dock, change mode, or change speaker volume.
```json
{
  "command": "cancel"
}
```
```json
{
  "command": "go_dock"
}
```
```json
{
  "command": "set_mode",
  "mode": "delivery" | "manual" | "survey" | "maintenance"
}
```
```json
{
  "command": "set_volume",
  "volume": 75
}
```

### C. Manual Teleoperation (`backend/teleop`)
Published at 10 Hz from Admin UI drive pad. Robot stops if silence > 0.5 s.
```json
{
  "linear": 0.25,
  "angular": -0.15,
  "speed_limit": 0.5
}
```

---

## 2. Robot to Backend (Status & Events)

### A. Status Broadcast (`robot/status`)
Sent periodically every 1.0 second. Retained message on broker.
```json
{
  "mode": "delivery",
  "state": "going_to_table",
  "battery_pct": 87.5,
  "pose": {
    "x": 2.45,
    "y": 3.12,
    "yaw": 0.78
  },
  "current_delivery_id": 104,
  "current_stop": 5
}
```
*Possible states*: `idle`, `going_to_table`, `arrived`, `waiting_confirm`, `going_home`, `docking`, `blocked`, `emergency_stop`.

### B. Robot Events (`robot/events`)
Triggered on state changes or user interactions.
- **Arrived**: `{"event": "arrived", "delivery_id": 104, "stop": 5}`
- **Confirmed**: `{"event": "confirmed", "delivery_id": 104, "stop": 5, "method": "done_button" | "weight_sensor" | "timeout"}`
- **Blocked**: `{"event": "blocked", "delivery_id": 104, "message": "Obstacle detected in path"}`
- **E-Stop**: `{"event": "e_stop", "active": true}`
- **Rating submitted**: `{"event": "rating", "order_id": 42, "stars": 5}`
- **Delivery Done**: `{"event": "delivery_done", "delivery_id": 104, "trip_seconds": 128}`
