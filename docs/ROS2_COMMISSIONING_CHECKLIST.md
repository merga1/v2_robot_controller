# 🛠️ ROS 2 Hardware Integration & Commissioning Checklist

Use this checklist during physical robot hardware commissioning and bringup.

---

## 1. Safety Systems (Hardware Level)
- [ ] **Physical E-Stop Circuit:** Verify physical mushroom e-stop physically cuts motor driver power relay independently of software.
- [ ] **Motor Keepalive:** Ensure motor drivers halt if no pulse is received for 500 ms.
- [ ] **Bumper Sensors / Lidar Proximity:** Verify front safety stop halts motion within 10 cm of an obstacle.

---

## 2. ROS 2 Node & Topic Verification
Check topics using `ros2 topic list`:

| Topic Name | Expected Type | Expected Rate | Function |
|---|---|---|---|
| `/cmd_vel_teleop` | `geometry_msgs/msg/Twist` | 10 Hz (when driving) | Manual joystick teleoperation |
| `/cmd_vel_nav` | `geometry_msgs/msg/Twist` | 20 Hz | Nav2 autonomous trajectory output |
| `/cmd_vel_out` | `geometry_msgs/msg/Twist` | 20–50 Hz | Arbitrated motor command from `twist_mux` |
| `/odom` | `nav_msgs/msg/Odometry` | 50 Hz | Wheel encoder odometry |
| `/amcl_pose` | `geometry_msgs/msg/PoseWithCovarianceStamped` | Variable | AMCL localization pose |
| `/battery_state` | `sensor_msgs/msg/BatteryState` | 1 Hz | Onboard battery voltage & percentage |

---

## 3. Twist Multiplexer (`twist_mux`) Priority Matrix
Verify `twist_mux.yaml` enforces strict safety priority ordering:

1. **Hardware / Joystick E-Stop:** Priority `100` (highest)
2. **Manual Teleoperation (`/cmd_vel_teleop`):** Priority `90`
3. **Obstacle Recovery (`/cmd_vel_recovery`):** Priority `50`
4. **Autonomous Tracker (`/cmd_vel_tracker`):** Priority `20`
5. **Nav2 Autonomous (`/cmd_vel_nav`):** Priority `10` (lowest)

---

## 4. Nav2 & Table Poses Commissioning
1. **Map Acquisition:** Drive robot through restaurant dining floor and kitchen pass using SLAM toolbox. Save map to `maps/restaurant_map.yaml`.
2. **Waypoints Verification:** Drive robot physically to each table (Table 1 through 10) and home charging base. Read exact coordinates from `ros2 topic echo /amcl_pose`.
3. **Update `tables.yaml`:**
   ```yaml
   tables:
     1:
       name: "Table 1"
       x: 2.05
       y: 1.48
       yaw: 1.57
   ```
4. **Test Autonomous Run:** Execute test dispatch to Table 1 and verify robot aligns cleanly at the dining table.
