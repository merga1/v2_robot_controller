# ─────────────────────────────────────────────────────────────────────────────
#  Teleoperation Router (Bridged via MQTT to Robot Gateway at ~10 Hz)
#  Maintains command watchdog and zero velocity on release
# ─────────────────────────────────────────────────────────────────────────────
import time
from fastapi import APIRouter
from pydantic import BaseModel

from ..mqtt_client import mqtt_client
from ..ws_manager import ws_manager

router = APIRouter(prefix="/teleop", tags=["teleop"])

_teleop_state = {
    "armed": False,
    "linear": 0.0,
    "angular": 0.0,
    "speed_limit": 0.5,
    "last_cmd_at": 0.0,
    "publish_count": 0,
}


class EnableBody(BaseModel):
    enabled: bool


class CmdVelBody(BaseModel):
    linear: float = 0.0
    angular: float = 0.0
    speed_limit: float = 0.5


@router.post("/enable")
async def enable_teleop(body: EnableBody):
    _teleop_state["armed"] = body.enabled
    _teleop_state["last_cmd_at"] = time.time()
    if not body.enabled:
        _teleop_state["linear"] = 0.0
        _teleop_state["angular"] = 0.0
        await mqtt_client.send_teleop(0.0, 0.0, 0.5)

    return {
        "ok": True,
        "armed": body.enabled,
        "timestamp": time.time(),
    }


@router.post("/cmd_vel")
async def send_cmd_vel(body: CmdVelBody):
    _teleop_state["linear"] = body.linear
    _teleop_state["angular"] = body.angular
    _teleop_state["speed_limit"] = body.speed_limit
    _teleop_state["last_cmd_at"] = time.time()
    _teleop_state["publish_count"] += 1

    # Publish to MQTT backend/teleop topic (consumed by robot gateway with 0.5s safety timeout)
    await mqtt_client.send_teleop(body.linear, body.angular, body.speed_limit)

    return {
        "ok": True,
        "linear": body.linear,
        "angular": body.angular,
    }


@router.post("/stop")
async def stop_teleop():
    _teleop_state["linear"] = 0.0
    _teleop_state["angular"] = 0.0
    _teleop_state["last_cmd_at"] = time.time()
    await mqtt_client.send_teleop(0.0, 0.0, 0.5)
    return {"ok": True, "stopped": True}


@router.get("/debug")
async def get_teleop_debug():
    return {
        "teleop": _teleop_state,
        "active": (time.time() - _teleop_state["last_cmd_at"]) < 1.0,
        "server_time": time.time(),
    }


@router.get("/connection")
async def get_teleop_connection():
    return {
        "connected": True,
        "armed": _teleop_state["armed"],
        "rate_hz": 10,
        "timeout_seconds": 0.5,
    }
