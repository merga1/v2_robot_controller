from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

def test_auth_login_api():
    res = client.post("/api/auth/login", json={"username": "operator", "password": "robot123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "operator"

def test_auth_login_root_compat():
    res = client.post("/auth/login", json={"username": "operator", "password": "robot123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "operator"

def test_destinations_api():
    res = client.get("/api/destinations")
    assert res.status_code == 200
    data = res.json()
    assert "destinations" in data
    names = [d["name"] for d in data["destinations"]]
    assert "Home Base" in names
    assert any("Table" in n for n in names)

def test_destinations_root_compat():
    res = client.get("/destinations")
    assert res.status_code == 200
    data = res.json()
    assert "destinations" in data

def test_teleop_connection():
    res = client.get("/teleop/connection")
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert data["rate_hz"] == 10

def test_teleop_cmd_vel():
    res = client.post("/teleop/cmd_vel", json={"linear": 0.2, "angular": -0.1, "speed_limit": 0.4})
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["linear"] == 0.2

def test_navigation_map():
    res = client.get("/api/navigation/map")
    assert res.status_code == 200
    data = res.json()
    assert "resolution" in data
    assert "image_url" in data

def test_missions_create():
    res = client.post("/api/missions", json={"destinations": ["Table 1", "Table 2"]})
    assert res.status_code == 200
    data = res.json()
    assert data["destinations"] == ["Table 1", "Table 2"]
    assert data["stops"] == [1, 2]

if __name__ == "__main__":
    test_health()
    test_auth_login_api()
    test_auth_login_root_compat()
    test_destinations_api()
    test_destinations_root_compat()
    test_teleop_connection()
    test_teleop_cmd_vel()
    test_navigation_map()
    test_missions_create()
    print("ALL API ENDPOINT TESTS PASSED SUCCESSFULLY!")
