import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"

def request(path, method="GET", data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=5) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def run():
    print("Testing /api/health...")
    status, data = request("/api/health")
    assert status == 200 and data["status"] == "ok"
    print("PASS: /api/health")

    print("Testing /api/auth/login and /auth/login...")
    status, data = request("/api/auth/login", method="POST", data={"username": "operator", "password": "robot123"})
    assert status == 200 and "access_token" in data
    token = data["access_token"]
    assert data["role"] == "operator"
    print("PASS: /api/auth/login")

    status, data = request("/auth/login", method="POST", data={"username": "operator", "password": "robot123"})
    assert status == 200 and "access_token" in data
    print("PASS: /auth/login (root compatibility)")

    print("Testing /api/destinations and /destinations...")
    status, data = request("/api/destinations")
    assert status == 200 and "destinations" in data
    assert any(d["name"] == "Home Base" for d in data["destinations"])
    print("PASS: /api/destinations")

    status, data = request("/destinations")
    assert status == 200 and "destinations" in data
    print("PASS: /destinations (root compatibility)")

    print("Testing /teleop/connection and /teleop/cmd_vel...")
    status, data = request("/teleop/connection")
    assert status == 200 and data["connected"] is True
    print("PASS: /teleop/connection")

    status, data = request("/teleop/cmd_vel", method="POST", data={"linear": 0.2, "angular": -0.1, "speed_limit": 0.4})
    assert status == 200 and data["ok"] is True
    print("PASS: /teleop/cmd_vel")

    print("Testing /api/navigation/map...")
    status, data = request("/api/navigation/map")
    assert status == 200 and "resolution" in data
    print("PASS: /api/navigation/map")

    print("Testing /api/missions...")
    status, data = request("/api/missions", method="POST", data={"destinations": ["Table 1", "Table 2"]})
    assert status == 200 and data["destinations"] == ["Table 1", "Table 2"]
    print("PASS: /api/missions")

    print("Testing /logs...")
    status, data = request("/logs")
    assert status == 200 and "logs" in data
    print("PASS: /logs")

    print("\n>>> ALL API VERIFICATION TESTS COMPLETED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run()
