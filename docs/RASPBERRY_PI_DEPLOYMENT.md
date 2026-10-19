# 🍓 Raspberry Pi 5 Robot Gateway Deployment Guide

This guide covers installing and running the **Robot Gateway Node** on the onboard Raspberry Pi 5 computer.

---

## 1. Hardware Architecture

- **SBC:** Raspberry Pi 5 (8 GB RAM recommended)
- **OS:** Ubuntu 24.04 LTS (Noble) with ROS 2 Jazzy OR Ubuntu 22.04 LTS (Jammy) with ROS 2 Humble
- **Connectivity:** Dual-band 802.11ac/ax Wi-Fi connected to the restaurant LAN
- **Base Interface:** USB-to-UART / CAN bus to the motor driver microcontroller

---

## 2. Directory Layout on Pi

Clone or rsync the repository to `/opt/robot_controller`:

```bash
sudo mkdir -p /opt/robot_controller
sudo chown -R $USER:$USER /opt/robot_controller
cd /opt/robot_controller
git clone https://github.com/merga1/robot_controller.git .
```

---

## 3. Python Virtual Environment

```bash
cd /opt/robot_controller
python3 -m venv .venv
source .venv/bin/activate
pip install -r robot_project/raspberry_pi/requirements.txt
```

---

## 4. Systemd Service Setup

Create the systemd unit file at `/etc/systemd/system/robot-gateway.service`:

```ini
[Unit]
Description=Restaurant Delivery Robot Gateway (MQTT <-> ROS 2)
After=network-online.target mosquitto.service
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/robot_controller
Environment="MQTT_BROKER=192.168.1.100"
Environment="MQTT_PORT=1883"
ExecStart=/opt/robot_controller/.venv/bin/python robot_gateway/robot_gateway_node.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable robot-gateway.service
sudo systemctl start robot-gateway.service
```

Check status and logs:
```bash
sudo systemctl status robot-gateway.service
journalctl -u robot-gateway.service -f
```

---

## 5. Offline Recovery Policy

If network connectivity is lost during a delivery run:
1. The Pi 5 gateway preserves the current active stop in `local_mission_state.json`.
2. Navigation to the customer table continues autonomously using local Nav2.
3. Upon arrival, the local touchscreen kiosk presents the Done button.
4. When Wi-Fi/MQTT reconnects, all pending delivery events are reconciled with the central database.
