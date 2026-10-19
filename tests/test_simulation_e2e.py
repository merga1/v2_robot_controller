import json
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"

def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=5) as resp:
        return json.loads(resp.read().decode())

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read().decode())

def run_simulation_e2e():
    print("--- 1. Testing Robot Connection & Status ---")
    status = get("/api/robot/status")
    print(f"Status: mode={status.get('mode')}, state={status.get('state')}, battery={status.get('battery_pct')}%")
    assert "battery_pct" in status
    print("PASS: Robot status query")

    print("\n--- 2. Testing 10 Hz Teleoperation Command Stream ---")
    teleop_res = post("/api/teleop/cmd_vel", {"linear": 0.3, "angular": 0.1, "speed_limit": 0.5})
    assert teleop_res.get("ok") is True
    assert teleop_res.get("linear") == 0.3
    print("PASS: Teleop cmd_vel published")

    print("\n--- 3. Testing Multi-Stop Mission Dispatch ---")
    mission_res = post("/api/missions", {"destinations": ["Table 1", "Table 2"]})
    print(f"Mission Dispatched: ID={mission_res.get('id')}, Stops={mission_res.get('stops')}")
    assert mission_res.get("stops") == [1, 2]
    print("PASS: Multi-stop mission dispatched")

    print("\n--- 4. Testing Navigation Goal to Table ---")
    goal_res = post("/api/navigation/goal", {"destination": "Table 3"})
    assert goal_res.get("ok") is True
    print(f"Nav Goal Sent: destination={goal_res.get('destination')}, x={goal_res.get('x')}, y={goal_res.get('y')}")
    print("PASS: Navigation goal dispatched")

    print("\n==========================================")
    print(">>> SIMULATION E2E WORKFLOW VERIFIED! <<<")
    print("==========================================")

if __name__ == "__main__":
    run_simulation_e2e()
