# 🤖 Restaurant Delivery Robot — Autonomous Platform

Implementation of the complete software system defined in **Restaurant Delivery Robot Plan.docx** and the **Flutter Mobile & Robot Controller Integration Specification**.

Includes the **Shared FastAPI Backend**, the **React Frontend (5 Standalone Screens + Launcher Portal)**, the **Flutter Mobile Application**, the **Raspberry Pi 5 Robot Gateway Node / Simulator**, and the **MQTT Contract Specification**.

---

## 🎨 Official Brand Identity

The user interfaces and mobile themes are crafted using the brand two-color palette:
- **Chalk Yellow (`#FFFF99`)**: Highlights, active badges, call-to-action buttons, and waypoint markers. Always rendered with Deep Navy Blue (`#000066`) text for high-contrast accessibility.
- **Deep Navy Blue (`#000066`)**: Brand identity headers, structure, cards, primary action buttons, and text.

---

## 🏛️ System Architecture

```
[Guest Phone] [Kitchen TV] [Chef Tablet] [Robot Touch Screen] [Admin Browser] [Flutter Mobile App]
                              ↕ HTTP & WebSocket (FastAPI on Port 8000)
                         [FastAPI Shared Backend]
                          (SQLite / PostgreSQL)
                              ↕ MQTT (Topics: backend/*, robot/*)
                         [Mosquitto Broker] (Port 1883)
                              ↕ MQTT
                 [Robot Gateway Node] (Raspberry Pi 5)
                              ↕ ROS 2 DDS (Internal Only)
              [Mission Manager] [Nav2 / Twist Mux Priority 90] (L2JD Chassis)
```

---

## 📱 The 5 Dedicated Standalone Web Screens

Each screen runs independently as an isolated application designed for its target hardware:

| Target Device | Standalone Route | Direct URL | Key Features |
|---|---|---|---|
| **Guest Smartphones** | `/?screen=menu&table=1` | `/menu?table=1` | QR ordering, live progress tracker (Received → Preparing → On Way → Delivered), rating widget. |
| **Kitchen TV Monitor** | `/?screen=kitchen` | `/kitchen` | Fullscreen 4-column kanban board with auto-aging colors (amber → red) and new order audio chime. |
| **Chef Pass Tablet** | `/?screen=chef` | `/chef` | Touch grid (Tables 1–10), multi-stop queue builder, 🚀 Dispatch Robot, 🏠 Return Home. |
| **Robot Onboard Screen** | `/?screen=robot` | `/robot` | Touchscreen kiosk for Pi 5: glowing reactive animated eyes, arrival alert, pulsing green **DONE** button, staff PIN pad (1234). |
| **Admin & Teleop Dashboard** | `/?screen=admin` | `/admin` | Mode switcher, 10 Hz virtual drive pad with speed slider, interactive 2D floor map with live coordinates, metrics & MQTT log. |
| **Hardware Launcher** | `/?screen=portal` | `/portal` or `/` | Master multi-screen launcher hub to quickly open any interface on its designated hardware. |

---

## 📱 Flutter Mobile Application

Located in `robot_project/flutter_app/`:
- **Role-Based Auth:** Secure sign-in (`admin`, `chef`, `operator` demo accounts with password `robot123`).
- **Real-Time Telemetry:** Live battery percentage, coordinates, mode, and mission status via WebSockets and HTTP polling.
- **10 Hz Manual Teleoperation:** Virtual joystick with 0.5s safety timeout watchdog on the robot.
- **Ordered Multi-Stop Missions:** Supports multi-stop dispatches (e.g. Table 5 followed by Table 2) with strict order preservation.
- **2D Occupancy Map:** Loads real map metadata and renders dynamic waypoint poses from `tables.yaml`.

---

## 🚀 Quick Start Guide

### 1. Start Mosquitto Broker
```bash
docker compose up -d
# Or start local Mosquitto service on port 1883
```

### 2. Start the Shared FastAPI Backend
```bash
.\.venv\Scripts\python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation & Swagger UI: **[http://localhost:8000/docs](http://localhost:8000/docs)**

### 3. Start the Dedicated Web Applications
```bash
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** to access the Hardware Launcher Portal.

### 4. Run the Mock Robot Simulator (For development without physical robot)
```bash
.\.venv\Scripts\python robot_gateway\mock_robot_sim.py
```

### 5. Run Automated Tests
```bash
# Verify all REST & WebSocket endpoints
.\.venv\Scripts\python tests/test_live_api.py

# Verify end-to-end simulation workflow
.\.venv\Scripts\python tests/test_simulation_e2e.py
```

---

## 📚 Technical Documentation

- **[docs/API_CONTRACT.md](docs/API_CONTRACT.md):** Shared OpenAPI and WebSocket contract specification.
- **[docs/MQTT_SPEC.md](docs/MQTT_SPEC.md):** Mosquitto MQTT topic and message schema specification.
- **[docs/FLUTTER_ANDROID_BUILD.md](docs/FLUTTER_ANDROID_BUILD.md):** Flutter mobile app Android APK build and device setup guide.
- **[docs/RASPBERRY_PI_DEPLOYMENT.md](docs/RASPBERRY_PI_DEPLOYMENT.md):** Raspberry Pi 5 gateway installation and systemd service guide.
- **[docs/ROS2_COMMISSIONING_CHECKLIST.md](docs/ROS2_COMMISSIONING_CHECKLIST.md):** Hardware commissioning, `twist_mux` priority, and Nav2 table poses checklist.
- **[docs/FINAL_INTEGRATION_REPORT.md](docs/FINAL_INTEGRATION_REPORT.md):** Complete 10-phase verification and status report.
# v2_robot_controller
