# ─────────────────────────────────────────────────────────────────────────────
#  Navigation & Map Router
#  Reads authoritative poses from tables.yaml and serves map metadata
# ─────────────────────────────────────────────────────────────────────────────
import os
import yaml
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from ..mqtt_client import mqtt_client
from ..ws_manager import ws_manager

router = APIRouter(prefix="/navigation", tags=["navigation"])

TABLES_FILE = Path(__file__).resolve().parent.parent.parent / "mqtt_contract" / "tables.yaml"


def _load_tables_yaml() -> dict:
    if TABLES_FILE.exists():
        try:
            with open(TABLES_FILE, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
        except Exception:
            pass
    return {"tables": {}, "home_dock": {"x": 0.0, "y": 0.0, "yaw": 0.0}}


class NavGoalBody(BaseModel):
    destination: str


@router.get("/map")
async def get_map_metadata():
    """Returns occupancy grid map metadata for Flutter navigation widget."""
    return {
        "image_url": "/api/navigation/map/image",
        "resolution": 0.05,
        "origin": {"x": -2.0, "y": -2.0, "yaw": 0.0},
        "width": 300,
        "height": 200,
        "frame_id": "map",
        "negate": 0,
    }


@router.get("/map/image")
async def get_map_image():
    """Generates a clean 300x200 PNG occupancy grid map for client canvas."""
    # Create simple 1x1 or blank PNG bytes if file doesn't exist
    from io import BytesIO
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (300, 200), color=(248, 249, 252))
        draw = ImageDraw.Draw(img)
        # Draw outer walls in Deep Navy Blue
        draw.rectangle([5, 5, 295, 195], outline=(0, 0, 102), width=3)
        # Draw kitchen pass
        draw.rectangle([10, 80, 50, 120], fill=(255, 255, 153), outline=(0, 0, 102), width=2)
        buf = BytesIO()
        img.save(buf, format="PNG")
        return Response(content=buf.getvalue(), media_type="image/png")
    except Exception:
        # 1x1 transparent PNG fallback
        transparent_png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff"
            b"?\x00\x05\xfe\x02\xfe\x1c\xef\x8a\xa9\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        return Response(content=transparent_png, media_type="image/png")


@router.post("/goal")
async def send_navigation_goal(body: NavGoalBody):
    """Sends a navigation goal to the robot gateway via MQTT."""
    data = _load_tables_yaml()
    tables = data.get("tables", {})
    home = data.get("home_dock", {"x": 0.0, "y": 0.0, "yaw": 0.0})

    dest_key = body.destination.lower().replace("table ", "").strip()
    target_pose = None
    target_stop = None

    if dest_key in ["dock", "home", "base"]:
        target_pose = home
        await mqtt_client.send_command("go_dock")
    else:
        try:
            table_num = int(dest_key)
            if table_num in tables:
                target_pose = tables[table_num]
                target_stop = table_num
                # Dispatch as a single destination
                await mqtt_client.send_dispatch(999, [table_num])
        except ValueError:
            pass

    if not target_pose:
        raise HTTPException(status_code=404, detail=f"Destination '{body.destination}' not found in tables.yaml")

    await ws_manager.broadcast("nav_goal", {
        "destination": body.destination,
        "pose": target_pose,
    })

    return {
        "ok": True,
        "destination": body.destination,
        "x": target_pose.get("x", 0.0),
        "y": target_pose.get("y", 0.0),
        "theta": target_pose.get("yaw", 0.0),
    }


@router.post("/cancel")
async def cancel_navigation():
    await mqtt_client.send_command("cancel")
    await ws_manager.broadcast("nav_cancelled", {})
    return {"ok": True}
