# ── Analytics router ──────────────────────────────────────────────────────────
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..models import Order, Delivery, RobotStatus, OrderStatus
from ..schemas import AnalyticsSummary

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    # orders total
    orders_total = (await db.execute(func.count(Order.id))).scalar_one()

    # deliveries completed
    deliveries_completed = (
        await db.execute(
            select(func.count(Delivery.id)).where(Delivery.success == True)  # noqa: E712
        )
    ).scalar_one()

    # avg order-to-delivered (seconds): created_at → confirmed_at on delivery
    # rough: use rated_at as proxy for now
    avg_order_to_delivered = (
        await db.execute(
            select(
                func.avg(
                    func.julianday(Delivery.confirmed_at) * 86400
                    - func.julianday(Order.created_at) * 86400
                )
            )
            .join(Order, Delivery.order_id == Order.id)
            .where(Delivery.success == True)  # noqa: E712
        )
    ).scalar_one()

    # avg trip seconds
    avg_trip = (
        await db.execute(
            select(func.avg(Delivery.trip_seconds)).where(Delivery.success == True)  # noqa: E712
        )
    ).scalar_one()

    # blocked events
    blocked_total = (
        await db.execute(select(func.sum(Delivery.blocked_count)))
    ).scalar_one() or 0

    # avg rating
    avg_rating_result = (
        await db.execute(
            select(func.avg(Order.rating), func.count(Order.rating))
            .where(Order.rating != None)  # noqa: E711
        )
    ).one()
    avg_rating, rating_count = avg_rating_result

    # avg battery
    status_result = await db.execute(select(RobotStatus).where(RobotStatus.id == 1))
    status = status_result.scalar_one_or_none()
    avg_battery = status.battery_pct if status else None

    return AnalyticsSummary(
        orders_total=orders_total,
        deliveries_completed=deliveries_completed,
        avg_order_to_delivered_seconds=avg_order_to_delivered,
        avg_trip_seconds=avg_trip,
        blocked_events_total=int(blocked_total),
        avg_rating=avg_rating,
        rating_count=rating_count or 0,
        avg_battery_pct=avg_battery,
    )


@router.get("/orders-by-day")
async def orders_by_day(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            func.date(Order.created_at).label("day"),
            func.count(Order.id).label("count"),
        ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))
    )
    return [{"day": row.day, "count": row.count} for row in result]
