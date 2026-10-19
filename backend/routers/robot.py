# ── Robot control router ──────────────────────────────────────────────────────
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import (
    RobotStatus, RobotMode, Order, Delivery, OrderStatus, RestaurantTable
)
from ..schemas import (
    RobotStatusOut, RobotCommand, TeleopCommand, DispatchRequest
)
from ..mqtt_client import mqtt_client
from ..ws_manager import ws_manager

router = APIRouter(prefix="/robot", tags=["robot"])


async def _get_or_create_status(db: AsyncSession) -> RobotStatus:
    result = await db.execute(select(RobotStatus).where(RobotStatus.id == 1))
    status = result.scalar_one_or_none()
    if status is None:
        status = RobotStatus(id=1)
        db.add(status)
        await db.commit()
        await db.refresh(status)
    return status


@router.get("/status", response_model=RobotStatusOut)
async def get_robot_status(db: AsyncSession = Depends(get_db)):
    return await _get_or_create_status(db)


@router.post("/dispatch")
async def dispatch(body: DispatchRequest, db: AsyncSession = Depends(get_db)):
    """
    Chef sends a list of table numbers.  We look up the active orders for
    those tables, create a Delivery record, then publish to MQTT.
    """
    if not body.table_numbers:
        raise HTTPException(400, "No tables specified")

    # Find one pending order per table (first ready order)
    delivery_order_ids: list[int] = []
    for tn in body.table_numbers:
        res = await db.execute(
            select(RestaurantTable).where(RestaurantTable.number == tn)
        )
        table = res.scalar_one_or_none()
        if not table:
            raise HTTPException(404, f"Table {tn} not found")
        res2 = await db.execute(
            select(Order)
            .where(Order.table_id == table.id)
            .where(Order.status == OrderStatus.ready)
            .order_by(Order.created_at)
            .limit(1)
        )
        order = res2.scalar_one_or_none()
        if order:
            delivery_order_ids.append(order.id)

    if not delivery_order_ids:
        raise HTTPException(400, "No ready orders found for those tables")

    # Create delivery record for the first order (multi-stop is one delivery)
    delivery = Delivery(
        order_id=delivery_order_ids[0],
        dispatched_at=datetime.utcnow(),
    )
    db.add(delivery)

    # Mark all orders as on_the_way
    for oid in delivery_order_ids:
        res = await db.execute(select(Order).where(Order.id == oid))
        order = res.scalar_one_or_none()
        if order:
            order.status = OrderStatus.on_the_way

    await db.commit()
    await db.refresh(delivery)

    await mqtt_client.send_dispatch(delivery.id, body.table_numbers)
    await ws_manager.broadcast("dispatch", {
        "delivery_id": delivery.id,
        "table_numbers": body.table_numbers,
    })
    return {"delivery_id": delivery.id, "stops": body.table_numbers}


@router.post("/command")
async def send_command(body: RobotCommand, db: AsyncSession = Depends(get_db)):
    """Send cancel, go_dock, set_mode, or set_volume to the robot."""
    payload: dict = {"command": body.command}
    if body.mode:
        payload["mode"] = body.mode.value

        # Update local status too
        status = await _get_or_create_status(db)
        status.mode = body.mode
        await db.commit()

    if body.volume is not None:
        payload["volume"] = body.volume
        status = await _get_or_create_status(db)
        status.volume = body.volume
        await db.commit()

    await mqtt_client.send_command(**payload)
    return {"sent": payload}


@router.post("/teleop")
async def teleop(body: TeleopCommand):
    """Manual drive from admin page — published at ~10 Hz from the browser."""
    await mqtt_client.send_teleop(body.linear, body.angular, body.speed_limit)
    return {"ok": True}


@router.get("/events")
async def get_events(limit: int = 50, db: AsyncSession = Depends(get_db)):
    from ..models import RobotEvent
    result = await db.execute(
        select(RobotEvent).order_by(RobotEvent.recorded_at.desc()).limit(limit)
    )
    events = result.scalars().all()
    return [{"id": e.id, "type": e.event_type, "payload": e.payload,
             "recorded_at": e.recorded_at.isoformat()} for e in events]


# ── Flutter App Compatibility Endpoints ──────────────────────────────────────

@router.post("/start")
async def start_robot():
    await mqtt_client.send_command("start")
    return {"ok": True, "status": "launching"}


@router.post("/stop")
async def stop_robot():
    await mqtt_client.send_command("cancel")
    return {"ok": True, "status": "idle"}


@router.post("/ready")
async def set_ready():
    await mqtt_client.send_command("set_mode", mode="delivery")
    return {"ok": True, "status": "ready"}


@router.get("/link-check")
async def link_check(db: AsyncSession = Depends(get_db)):
    status = await _get_or_create_status(db)
    return {
        "ok": status.online,
        "mqtt_connected": mqtt_client._client is not None,
        "battery": status.battery_pct,
        "mode": status.mode.value,
        "state": status.state,
    }


@router.get("/bridge-status")
async def bridge_status(db: AsyncSession = Depends(get_db)):
    status = await _get_or_create_status(db)
    return {
        "ok": status.online,
        "mode": status.mode.value,
        "state": status.state,
        "battery_pct": status.battery_pct,
        "pose": {"x": status.pose_x, "y": status.pose_y, "yaw": status.pose_yaw},
    }


@router.post("/enable-motors")
async def enable_motors():
    await mqtt_client.send_command("enable_motors")
    return {"ok": True, "motors": "enabled"}


@router.get("/logs")
async def get_logs_compat(severity: str | None = None, limit: int = 100, db: AsyncSession = Depends(get_db)):
    from ..models import RobotEvent
    result = await db.execute(
        select(RobotEvent).order_by(RobotEvent.recorded_at.desc()).limit(limit)
    )
    events = result.scalars().all()
    logs = [f"[{e.recorded_at.strftime('%H:%M:%S')}] [{e.event_type.upper()}] {e.payload}" for e in events]
    return {"logs": logs, "count": len(logs)}
