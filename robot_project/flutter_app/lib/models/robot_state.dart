/// Live robot status from backend WebSocket / REST
class RobotState {
  final String connection;
  final String status;
  final RobotPose pose;
  final String? currentAction;
  final String? destination;
  final bool rosRunning;
  final String message;
  final Map<String, String> nodeHealth;
  final int? currentMission;
  final Map<String, dynamic> bridgeStatus;
  // Battery fields — populated by /robot/status, /api/robot/status, and /ws payloads
  final int battery;
  final double batteryVoltage;
  final String batteryAlert;

  const RobotState({
    required this.connection,
    required this.status,
    required this.pose,
    this.currentAction,
    this.destination,
    required this.rosRunning,
    required this.message,
    required this.nodeHealth,
    this.currentMission,
    this.bridgeStatus = const {},
    this.battery = 100,
    this.batteryVoltage = 12.6,
    this.batteryAlert = 'normal',
  });

  factory RobotState.initial() => RobotState(
        connection: 'connecting',
        status: 'idle',
        pose: RobotPose.zero(),
        rosRunning: false,
        message: 'Connecting to backend...',
        nodeHealth: {},
        bridgeStatus: {},
        battery: 100,
        batteryVoltage: 12.6,
        batteryAlert: 'normal',
      );

  factory RobotState.fromJson(Map<String, dynamic> j) {
    // Map status/state flexibly
    final rawStatus = j['status'] ?? j['state'] ?? 'idle';
    final rawMode = j['current_action'] ?? j['mode'];
    final rawMission = j['current_mission'] ?? j['current_delivery_id'];
    final rawStop = j['destination'] ?? (j['current_stop'] != null ? 'Table ${j['current_stop']}' : null);

    // Battery calculation and alert
    final batteryLevel = (j['battery'] ?? j['battery_pct'] as num?)?.toInt() ?? 100;
    String alert = j['battery_alert']?.toString() ?? 'normal';
    if (alert == 'normal') {
      if (batteryLevel <= 15) {
        alert = 'critical';
      } else if (batteryLevel <= 25) {
        alert = 'warning';
      }
    }

    return RobotState(
      connection: j['connection'] ?? (j['online'] == false ? 'disconnected' : 'connected'),
      status: rawStatus.toString(),
      pose: j['pose'] != null
          ? RobotPose.fromJson(j['pose'] as Map<String, dynamic>)
          : (j['pose_x'] != null
              ? RobotPose(
                  x: (j['pose_x'] as num?)?.toDouble() ?? 0,
                  y: (j['pose_y'] as num?)?.toDouble() ?? 0,
                  theta: (j['pose_yaw'] as num?)?.toDouble() ?? 0,
                )
              : RobotPose.zero()),
      currentAction: rawMode?.toString(),
      destination: rawStop?.toString(),
      rosRunning: j['ros_running'] ?? (j['online'] ?? true),
      message: j['message'] ?? (j['state'] != null ? 'State: ${j['state']}' : ''),
      nodeHealth: (j['node_health'] as Map<String, dynamic>? ?? {})
          .map((k, v) => MapEntry(k, v.toString())),
      currentMission: rawMission != null ? (rawMission as num).toInt() : null,
      bridgeStatus: (j['bridge_status'] as Map<String, dynamic>? ?? {'ok': true}),
      battery: batteryLevel,
      batteryVoltage: (j['battery_voltage'] as num?)?.toDouble() ?? 12.6,
      batteryAlert: alert,
    );
  }

  bool get isLaunching => status == 'launching';
  bool get isRunning => status == 'running' || status == 'navigating';
  bool get isNavigating => status == 'navigating';
  bool get isTeleop => currentAction == 'teleop' || currentAction == 'manual';
  bool get isReady => status == 'ready' || status == 'idle';
  bool get isError => status == 'error';
  /// True when backend reports a live bridge or online status.
  bool get bridgeVerified =>
      bridgeStatus['ok'] == true || bridgeStatus['ros_node_visible'] == true || isConnected;
  /// START is enough to operate. READY / re-init is optional.
  bool get canOperate => rosRunning && !isLaunching;
  /// START is clickable whenever the robot is not already running.
  bool get canStart => isConnected && !rosRunning && !isLaunching;
  bool get isConnected => connection == 'connected';

  /// True when battery level is below warning threshold.
  bool get isBatteryLow => batteryAlert == 'warning' || batteryAlert == 'critical';
  bool get isBatteryCritical => batteryAlert == 'critical';
}

class RobotPose {
  final double x;
  final double y;
  final double theta;

  const RobotPose({required this.x, required this.y, required this.theta});

  factory RobotPose.zero() => const RobotPose(x: 0, y: 0, theta: 0);

  factory RobotPose.fromJson(Map<String, dynamic> j) => RobotPose(
        x: (j['x'] as num?)?.toDouble() ?? 0,
        y: (j['y'] as num?)?.toDouble() ?? 0,
        theta: ((j['theta'] ?? j['yaw']) as num?)?.toDouble() ?? 0,
      );

  @override
  String toString() =>
      'x: ${x.toStringAsFixed(2)}, y: ${y.toStringAsFixed(2)}, θ: ${theta.toStringAsFixed(1)}°';
}
