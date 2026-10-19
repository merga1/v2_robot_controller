import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/robot_state.dart';
import '../models/map_models.dart';

/// REST + WebSocket client for the shared backend.
/// Connects to the central FastAPI backend and receives real-time telemetry
/// via WebSockets with automatic fallback to HTTP polling.
class RobotService {
  final String baseUrl;
  String? _token;
  String? role;
  Timer? _poller;
  WebSocketChannel? _wsChannel;
  StreamSubscription? _wsSub;
  bool _wsConnected = false;

  final _states = StreamController<RobotState>.broadcast();
  Stream<RobotState> get stateStream => _states.stream;

  final _events = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get eventStream => _events.stream;

  // Fires once when the API rejects the current token (expired/invalid, HTTP 401)
  final _authExpired = StreamController<void>.broadcast();
  Stream<void> get authExpiredStream => _authExpired.stream;
  bool _authExpiredFired = false;

  RobotService({required this.baseUrl});

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<Map<String, dynamic>> _request(String method, String path, {Object? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final encoded = body == null ? null : jsonEncode(body);
    late http.Response response;
    try {
      response = switch (method) {
        'GET' => await http.get(uri, headers: _headers).timeout(const Duration(seconds: 15)),
        'DELETE' => await http.delete(uri, headers: _headers).timeout(const Duration(seconds: 15)),
        _ => await http.post(uri, headers: _headers, body: encoded).timeout(const Duration(seconds: 75)),
      };
    } catch (e) {
      throw Exception('Cannot reach robot API: $e');
    }
    Map<String, dynamic> data = {};
    if (response.body.isNotEmpty) {
      try {
        final value = jsonDecode(response.body);
        if (value is Map<String, dynamic>) data = value;
      } on FormatException {
        data = {'detail': response.body.trim()};
      }
    }
    if (response.statusCode == 401 && !_authExpiredFired) {
      _authExpiredFired = true;
      _authExpired.add(null);
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(data['detail'] ?? 'Robot API returned HTTP ${response.statusCode}');
    }
    return data;
  }

  Future<void> login(String username, String password) async {
    final data = await _request('POST', '/api/auth/login', body: {'username': username, 'password': password});
    _token = data['access_token']?.toString();
    role = data['role']?.toString();
    _authExpiredFired = false;
  }

  void connect() {
    _connectWebSocket();
    _poller?.cancel();
    // 1-second polling ensures telemetry even if WebSocket is disconnected
    _poller = Timer.periodic(const Duration(seconds: 1), (_) => _poll());
    _poll();
  }

  void _connectWebSocket() {
    try {
      final baseUri = Uri.parse(baseUrl);
      final wsScheme = baseUri.scheme == 'https' ? 'wss' : 'ws';
      final wsUri = Uri(
        scheme: wsScheme,
        host: baseUri.host,
        port: baseUri.port,
        path: '/ws',
      );

      _wsSub?.cancel();
      _wsChannel?.sink.close();
      _wsChannel = WebSocketChannel.connect(wsUri);
      _wsConnected = true;

      _wsSub = _wsChannel!.stream.listen(
        (data) {
          try {
            final msg = jsonDecode(data.toString());
            if (msg is Map<String, dynamic>) {
              final type = msg['type'];
              final payload = msg['data'];
              if (type == 'robot_status' && payload is Map<String, dynamic>) {
                _states.add(RobotState.fromJson(payload));
              } else if (payload is Map<String, dynamic>) {
                _events.add({'type': type, ...payload});
              }
            }
          } catch (_) {}
        },
        onError: (err) {
          _wsConnected = false;
        },
        onDone: () {
          _wsConnected = false;
        },
      );
    } catch (_) {
      _wsConnected = false;
    }
  }

  Future<void> _poll() async {
    try {
      final data = await _request('GET', '/robot/status');
      _states.add(RobotState.fromJson(data));
    } catch (_) {}
  }

  void disconnect() {
    _poller?.cancel();
    _poller = null;
    _wsSub?.cancel();
    _wsChannel?.sink.close();
    _wsConnected = false;
  }

  void logout() {
    disconnect();
    _token = null;
    role = null;
  }

  Future<void> startRobot() async { await _request('POST', '/robot/start'); }
  Future<void> stopRobot() async { await _request('POST', '/robot/stop'); }
  Future<Map<String, dynamic>> setReady() => _request('POST', '/robot/ready');

  Future<Map<String, dynamic>> checkReal1Link() => _request('GET', '/robot/link-check');
  Future<Map<String, dynamic>> getBridgeStatus() => _request('GET', '/robot/bridge-status');

  Future<Map<String, dynamic>> enableTeleop(bool enabled) =>
      _request('POST', '/teleop/enable', body: {'enabled': enabled});

  /// Send teleoperation velocity commands (10 Hz rate with speed limit)
  Future<Map<String, dynamic>> sendCmdVel(double linear, double angular, {double speedLimit = 0.5}) =>
      _request('POST', '/teleop/cmd_vel', body: {
        'linear': linear,
        'angular': angular,
        'speed_limit': speedLimit,
      });

  Future<Map<String, dynamic>> enableMotors() => _request('POST', '/robot/enable-motors');
  Future<Map<String, dynamic>> testDrive() => _request('POST', '/teleop/test-drive');
  Future<Map<String, dynamic>> getTeleopDebug() => _request('GET', '/teleop/debug');
  Future<Map<String, dynamic>> getTeleopConnection() => _request('GET', '/teleop/connection');
  Future<void> stopTeleop() async { await _request('POST', '/teleop/stop'); }

  Future<void> cancelNavigation() async { await _request('POST', '/navigation/cancel'); }

  Future<void> sendGoal(String name) async {
    await _request('POST', '/navigation/goal', body: {'destination': name});
  }

  Future<List<String>> getDestinations() async {
    final raw = (await _request('GET', '/destinations'))['destinations'];
    if (raw is List) {
      return raw.map((e) {
        if (e is Map) return (e['name'] ?? '').toString();
        return e.toString();
      }).toList()..sort();
    }
    if (raw is Map) {
      return (raw.keys.map((e) => e.toString()).toList())..sort();
    }
    return [];
  }

  /// Returns destinations with full pose data for the NavigationScreen.
  Future<List<DestinationPose>> getDestinationPoses() async {
    final raw = (await _request('GET', '/destinations'))['destinations'];
    if (raw is List) {
      return raw
          .map((e) {
            if (e is Map<String, dynamic>) {
              return DestinationPose.fromJson(e);
            }
            return DestinationPose(
              name: e.toString(),
              x: 0,
              y: 0,
              theta: 0,
            );
          })
          .toList();
    }
    return [];
  }

  /// Full URL for the map image — used by NavigationScreen to load the map.
  String get mapImageUrl => '$baseUrl/navigation/map/image';

  /// Current auth token (needed to add Authorization header to image requests).
  String? get authToken => _token;

  /// Fetch map metadata (resolution, origin, image size).
  Future<MapMeta> getMapMeta() async {
    final data = await _request('GET', '/navigation/map');
    return MapMeta.fromJson(data);
  }

  Future<void> addDestination(String name, double x, double y, double theta) async =>
      _request('POST', '/destinations', body: {'name': name, 'x': x, 'y': y, 'theta': theta});

  Future<void> deleteDestination(String name) async =>
      _request('DELETE', '/destinations/${Uri.encodeComponent(name)}');

  Future<Map<String, dynamic>> createMission(List<String> destinations) =>
      _request('POST', '/missions', body: {'destinations': destinations});

  Future<Map<String, dynamic>> getMission(int id) => _request('GET', '/missions/$id');

  Future<Map<String, dynamic>> getLogs({String? severity, int limit = 100}) {
    final params = <String>[];
    if (severity != null) params.add('severity=$severity');
    params.add('limit=$limit');
    final query = params.isEmpty ? '' : '?${params.join('&')}';
    return _request('GET', '/logs$query');
  }
}
