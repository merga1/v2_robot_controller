# ─────────────────────────────────────────────────────────────────────────────
#  MQTT Client — bridges Mosquitto ↔ FastAPI backend
#  Robot connects outward to the broker; backend subscribes here.
# ─────────────────────────────────────────────────────────────────────────────
import asyncio
import json
import logging
from datetime import datetime
from typing import Optional

import aiomqtt

from .ws_manager import ws_manager

logger = logging.getLogger(__name__)

BROKER_HOST = "localhost"
BROKER_PORT = 1883

# ── Topic map (matches robot_gateway topics) ──────────────────────────────────
TOPIC_ROBOT_STATUS   = "robot/status"
TOPIC_ROBOT_EVENTS   = "robot/events"
TOPIC_BACKEND_CMD    = "backend/commands"
TOPIC_BACKEND_TELEOP = "backend/teleop"


class MQTTClient:
    def __init__(self):
        self._client: Optional[aiomqtt.Client] = None
        self._task: Optional[asyncio.Task] = None
        self._running = False

    # ── Publishing ────────────────────────────────────────────────────────────

    async def publish(self, topic: str, payload: dict):
        """Send a command to the robot."""
        if self._client is None:
            logger.warning("MQTT not connected – cannot publish to %s", topic)
            return
        try:
            await self._client.publish(topic, json.dumps(payload))
            logger.debug("MQTT → %s: %s", topic, payload)
        except Exception as exc:
            logger.error("MQTT publish error: %s", exc)

    async def send_dispatch(self, delivery_id: int, table_numbers: list[int]):
        await self.publish(TOPIC_BACKEND_CMD, {
            "command": "dispatch",
            "delivery_id": delivery_id,
            "stops": table_numbers,
        })

    async def send_command(self, command: str, **kwargs):
        await self.publish(TOPIC_BACKEND_CMD, {"command": command, **kwargs})

    async def send_teleop(self, linear: float, angular: float, speed_limit: float = 0.3):
        await self.publish(TOPIC_BACKEND_TELEOP, {
            "linear": linear,
            "angular": angular,
            "speed_limit": speed_limit,
        })

    # ── Receiving ─────────────────────────────────────────────────────────────

    async def _handle_status(self, payload: dict):
        """Update robot_status row and broadcast to browsers."""
        from .database import SessionLocal
        from .models import RobotStatus

        async with SessionLocal() as db:
            from sqlalchemy import select
            result = await db.execute(select(RobotStatus).where(RobotStatus.id == 1))
            status = result.scalar_one_or_none()
            if status is None:
                status = RobotStatus(id=1)
                db.add(status)

            status.mode = payload.get("mode", status.mode)
            status.state = payload.get("state", status.state)
            status.battery_pct = payload.get("battery_pct", status.battery_pct)
            status.pose_x = payload.get("pose", {}).get("x", status.pose_x)
            status.pose_y = payload.get("pose", {}).get("y", status.pose_y)
            status.pose_yaw = payload.get("pose", {}).get("yaw", status.pose_yaw)
            status.current_delivery_id = payload.get("current_delivery_id")
            status.current_stop = payload.get("current_stop")
            status.online = True
            status.last_seen = datetime.utcnow()

            await db.commit()

        await ws_manager.broadcast("robot_status", payload)

    async def _handle_event(self, payload: dict):
        """Log robot events and forward to browsers."""
        from .database import SessionLocal
        from .models import RobotEvent, Order, Delivery, OrderStatus
        from sqlalchemy import select

        event_type = payload.get("event")
        logger.info("Robot event: %s — %s", event_type, payload)

        async with SessionLocal() as db:
            db.add(RobotEvent(event_type=event_type, payload=json.dumps(payload)))

            # Handle delivery_done → mark order delivered
            if event_type == "delivery_done":
                delivery_id = payload.get("delivery_id")
                if delivery_id:
                    res = await db.execute(
                        select(Delivery).where(Delivery.id == delivery_id)
                    )
                    delivery = res.scalar_one_or_none()
                    if delivery:
                        delivery.success = True
                        delivery.confirmed_at = datetime.utcnow()
                        order_res = await db.execute(
                            select(Order).where(Order.id == delivery.order_id)
                        )
                        order = order_res.scalar_one_or_none()
                        if order:
                            order.status = OrderStatus.delivered

            # Handle rating
            if event_type == "rating":
                order_id = payload.get("order_id")
                stars = payload.get("stars")
                if order_id and stars:
                    res = await db.execute(select(Order).where(Order.id == order_id))
                    order = res.scalar_one_or_none()
                    if order:
                        order.rating = stars
                        order.rated_at = datetime.utcnow()

            await db.commit()

        await ws_manager.broadcast("robot_event", payload)

    # ── Main loop ─────────────────────────────────────────────────────────────

    async def run(self):
        self._running = True
        while self._running:
            try:
                async with aiomqtt.Client(BROKER_HOST, BROKER_PORT) as client:
                    self._client = client
                    logger.info("MQTT connected to %s:%d", BROKER_HOST, BROKER_PORT)

                    await client.subscribe(TOPIC_ROBOT_STATUS)
                    await client.subscribe(TOPIC_ROBOT_EVENTS)

                    async for message in client.messages:
                        if not self._running:
                            break
                        try:
                            payload = json.loads(message.payload)
                        except Exception:
                            continue

                        topic = str(message.topic)
                        if topic == TOPIC_ROBOT_STATUS:
                            await self._handle_status(payload)
                        elif topic == TOPIC_ROBOT_EVENTS:
                            await self._handle_event(payload)

            except Exception as exc:
                self._client = None
                logger.warning("MQTT disconnected (%s). Reconnecting in 5 s…", exc)
                await asyncio.sleep(5)

    def start(self):
        self._task = asyncio.create_task(self.run())

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()


mqtt_client = MQTTClient()
