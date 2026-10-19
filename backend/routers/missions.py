# ─────────────────────────────────────────────────────────────────────────────
#  Missions Router
#  Handles sequential multi-stop missions and dispatching
# ─────────────────────────────────────────────────────────────────────────────
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..mqtt_client import mqtt_client
from ..ws_manager import ws_manager

router = APIRouter(prefix="/missions", tags=["missions"])

# In-memory mission registry (persisted into Delivery table in DB as well)
_missions: dict[int, dict] = {}
_mission_seq = 100


class MissionCreate(BaseModel):
    destinations: list[str]


@router.post("")
async def create_mission(body: MissionCreate):
    global _mission_seq
    if not body.destinations:
        raise HTTPException(status_code=400, detail="Destinations list is empty")

    _mission_seq += 1
    mission_id = _mission_seq

    # Parse table numbers from names (e.g. "Table 5" -> 5)
    stops: list[int] = []
    for d in body.destinations:
        num_str = d.lower().replace("table", "").strip()
        try:
            stops.append(int(num_str))
        except ValueError:
            pass

    record = {
        "id": mission_id,
        "status": "running",
        "destinations": body.destinations,
        "stops": stops,
        "current_stop_idx": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    _missions[mission_id] = record

    if stops:
        await mqtt_client.send_dispatch(mission_id, stops)

    await ws_manager.broadcast("mission_created", record)
    return record


@router.get("/{mission_id}")
async def get_mission(mission_id: int):
    record = _missions.get(mission_id)
    if not record:
        raise HTTPException(status_code=404, detail="Mission not found")
    return record


@router.get("")
async def list_missions():
    return list(_missions.values())
