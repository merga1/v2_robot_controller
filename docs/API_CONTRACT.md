# 📡 Shared REST & WebSocket API Contract Specification

This document details the shared OpenAPI/REST and WebSocket contract between:
1. **Web Frontends** (Guest Menu, Kitchen Board, Chef Pass, Robot Touchscreen, Admin Dashboard)
2. **Flutter Mobile Application** (Tablet / Phone Robot Controller)
3. **Raspberry Pi 5 Robot Gateway**

All endpoints are hosted on the **FastAPI Backend (Port 8000)**.
Both `/api/<resource>` and direct root aliases (for mobile backward compatibility) are supported.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login` (and `/auth/login`)
Signs in a staff member or robot operator. Returns a standard JWT bearer token.

- **Request Body:**
  ```json
  {
    "username": "operator",
    "password": "robot123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "role": "operator",
    "username": "operator"
  }
  ```
- **Available Roles:**
  - `admin`: Full system, configuration, and telemetry access.
  - `chef`: Order queue and multi-stop dispatch permissions.
  - `operator`: Manual driving, teleop, mode switching, and diagnostics.

---

## 2. Teleoperation & Driving (`/api/teleop`)

### `POST /api/teleop/enable` (and `/teleop/enable`)
Arms or disarms the virtual joystick teleoperation mode.

- **Request Body:**
  ```json
  {
    "enabled": true
  }
  ```

### `POST /api/teleop/cmd_vel` (and `/teleop/cmd_vel`)
Streams velocity commands at **10 Hz** while control is held.
Robot-side safety watchdog halts the robot if commands cease for >0.5 seconds.

- **Request Body:**
  ```json
  {
    "linear": 0.35,
    "angular": -0.15,
    "speed_limit": 0.5
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ok": true,
    "linear": 0.35,
    "angular": -0.15
  }
  ```

### `POST /api/teleop/stop` (and `/teleop/stop`)
Immediately broadcasts zero velocity and disengages manual driving.

---

## 3. Navigation & Table Waypoints (`/api/navigation` & `/api/destinations`)

### `GET /api/destinations` (and `/destinations`)
Returns all authorized restaurant table poses loaded from `tables.yaml`.

- **Response (200 OK):**
  ```json
  {
    "destinations": [
      { "name": "Home Base", "x": 0.0, "y": 0.0, "theta": 0.0 },
      { "name": "Table 1", "x": 2.0, "y": 1.5, "theta": 1.57 },
      { "name": "Table 2", "x": 4.0, "y": 1.5, "theta": 1.57 },
      { "name": "Table 5", "x": 2.0, "y": 4.5, "theta": -1.57 }
    ]
  }
  ```

### `POST /api/navigation/goal` (and `/navigation/goal`)
Dispatches the robot to a single destination.

- **Request Body:**
  ```json
  {
    "destination": "Table 5"
  }
  ```

### `GET /api/navigation/map` (and `/navigation/map`)
Occupancy grid map metadata (resolution, origin, dimensions) for Flutter canvas painter.

### `GET /api/navigation/map/image` (and `/navigation/map/image`)
Dynamic PNG render of restaurant occupancy map.

---

## 4. Multi-Stop Delivery Missions (`/api/missions`)

### `POST /api/missions` (and `/missions`)
Dispatches ordered multi-stop delivery (e.g. Stop at Table 5, then Table 2).

- **Request Body:**
  ```json
  {
    "destinations": ["Table 5", "Table 2"]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": 102,
    "status": "running",
    "destinations": ["Table 5", "Table 2"],
    "stops": [5, 2],
    "current_stop_idx": 0,
    "created_at": "2026-10-19T12:00:00"
  }
  ```

---

## 5. WebSocket Telemetry Stream (`/ws`)

Clients connect to `ws://<backend_host>:8000/ws` for real-time live events.

- **Incoming Messages from Server:**
  - `robot_status`: Live battery, state, coordinates, current mission, and online flag.
  - `robot_event`: Arrival alerts, pickup confirmation, delivery completion, e-stop warnings.
  - `orders_update`: Order placement and kitchen status transitions.
- **Client Keepalive:**
  - Client sends: `{"type": "ping"}`
  - Server replies: `{"type": "pong"}`
