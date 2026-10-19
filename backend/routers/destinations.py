# ─────────────────────────────────────────────────────────────────────────────
#  Destinations Router (Maps to restaurant tables in tables.yaml and DB)
# ─────────────────────────────────────────────────────────────────────────────
from pathlib import Path
import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/destinations", tags=["destinations"])

TABLES_FILE = Path(__file__).resolve().parent.parent.parent / "mqtt_contract" / "tables.yaml"


def _load_tables():
    if TABLES_FILE.exists():
        with open(TABLES_FILE, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {"tables": {}, "home_dock": {"x": 0.0, "y": 0.0, "yaw": 0.0}}


class DestinationBody(BaseModel):
    name: str
    x: float = 0.0
    y: float = 0.0
    theta: float = 0.0


@router.get("")
async def list_destinations():
    data = _load_tables()
    dests = []

    # Add home dock
    home = data.get("home_dock", {"x": 0.0, "y": 0.0, "yaw": 0.0})
    dests.append({
        "name": "Home Base",
        "x": float(home.get("x", 0.0)),
        "y": float(home.get("y", 0.0)),
        "theta": float(home.get("yaw", 0.0)),
    })

    # Add tables
    tables = data.get("tables", {})
    for num, t in tables.items():
        dests.append({
            "name": t.get("name", f"Table {num}"),
            "x": float(t.get("x", 0.0)),
            "y": float(t.get("y", 0.0)),
            "theta": float(t.get("yaw", 0.0)),
        })

    return {"destinations": dests}


@router.post("")
async def upsert_destination(body: DestinationBody):
    data = _load_tables()
    if "tables" not in data:
        data["tables"] = {}

    # Extract number if name is like "Table 5"
    key = body.name.lower().replace("table", "").strip()
    try:
        num = int(key)
        data["tables"][num] = {
            "name": body.name,
            "x": body.x,
            "y": body.y,
            "yaw": body.theta,
        }
        with open(TABLES_FILE, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f)
    except ValueError:
        pass

    return {"ok": True, "name": body.name, "x": body.x, "y": body.y, "theta": body.theta}


@router.delete("/{name}")
async def delete_destination(name: str):
    data = _load_tables()
    key = name.lower().replace("table", "").strip()
    try:
        num = int(key)
        if num in data.get("tables", {}):
            del data["tables"][num]
            with open(TABLES_FILE, "w", encoding="utf-8") as f:
                yaml.safe_dump(data, f)
            return {"ok": True, "name": name}
    except ValueError:
        pass
    raise HTTPException(status_code=404, detail=f"Destination '{name}' not found")
