# ── Orders router ────────────────────────────────────────────────────────────
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..models import Order, OrderItem, MenuItem, OrderStatus
from ..schemas import OrderCreate, OrderOut, OrderStatusUpdate, RatingUpdate
from ..ws_manager import ws_manager

router = APIRouter(prefix="/orders", tags=["orders"])


def _order_dict(order: Order) -> dict:
    return {
        "id": order.id,
        "table_id": order.table_id,
        "status": order.status.value,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "notes": order.notes,
        "rating": order.rating,
        "items": [
            {
                "id": i.id,
                "menu_item_id": i.menu_item_id,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
                "notes": i.notes,
            }
            for i in order.items
        ],
    }


@router.get("", response_model=list[OrderOut])
async def list_orders(
    status: OrderStatus | None = None,
    table_id: int | None = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    q = select(Order)
    if status:
        q = q.where(Order.status == status)
    if table_id:
        q = q.where(Order.table_id == table_id)
    q = q.order_by(Order.created_at.desc()).limit(limit)
    result = await db.execute(q)
    orders = result.scalars().all()
    # eagerly load items
    for order in orders:
        _ = order.items
    return orders


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    _ = order.items
    return order


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(body: OrderCreate, db: AsyncSession = Depends(get_db)):
    order = Order(table_id=body.table_id, notes=body.notes)
    db.add(order)
    await db.flush()   # get order.id

    for item_in in body.items:
        # look up current price
        res = await db.execute(select(MenuItem).where(MenuItem.id == item_in.menu_item_id))
        menu_item = res.scalar_one_or_none()
        if not menu_item:
            raise HTTPException(400, f"MenuItem {item_in.menu_item_id} not found")
        db.add(OrderItem(
            order_id=order.id,
            menu_item_id=item_in.menu_item_id,
            quantity=item_in.quantity,
            unit_price=menu_item.price,
            notes=item_in.notes,
        ))

    await db.commit()
    await db.refresh(order)
    _ = order.items

    await ws_manager.broadcast("new_order", _order_dict(order))
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: int, body: OrderStatusUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = body.status
    await db.commit()
    await db.refresh(order)
    _ = order.items
    await ws_manager.broadcast("order_status", _order_dict(order))
    return order


@router.patch("/{order_id}/rating", response_model=OrderOut)
async def rate_order(order_id: int, body: RatingUpdate, db: AsyncSession = Depends(get_db)):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "Rating must be 1–5")
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    order.rating = body.rating
    order.rated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(order)
    _ = order.items
    await ws_manager.broadcast("order_rated", {"order_id": order_id, "rating": body.rating})
    return order
