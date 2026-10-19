# ─────────────────────────────────────────────
#  SQLAlchemy ORM Models
# ─────────────────────────────────────────────
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


# ── Enums ──────────────────────────────────────────────────────────────────

class OrderStatus(str, enum.Enum):
    received   = "received"
    preparing  = "preparing"
    ready      = "ready"
    on_the_way = "on_the_way"
    delivered  = "delivered"
    cancelled  = "cancelled"


class RobotMode(str, enum.Enum):
    delivery    = "delivery"
    manual      = "manual"
    survey      = "survey"
    maintenance = "maintenance"


# ── Tables ─────────────────────────────────────────────────────────────────

class RestaurantTable(Base):
    __tablename__ = "tables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(50), default="")
    pose_x: Mapped[float] = mapped_column(Float, default=0.0)
    pose_y: Mapped[float] = mapped_column(Float, default=0.0)
    pose_yaw: Mapped[float] = mapped_column(Float, default=0.0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    qr_code: Mapped[str | None] = mapped_column(String(200), nullable=True)

    orders: Mapped[list["Order"]] = relationship("Order", back_populates="table")


# ── Menu ───────────────────────────────────────────────────────────────────

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    items: Mapped[list["MenuItem"]] = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[float] = mapped_column(Float, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    prep_minutes: Mapped[int] = mapped_column(Integer, default=10)

    category: Mapped[Category] = relationship("Category", back_populates="items")


# ── Orders ─────────────────────────────────────────────────────────────────

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    table_id: Mapped[int] = mapped_column(ForeignKey("tables.id"))
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.received
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
    notes: Mapped[str] = mapped_column(Text, default="")
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    table: Mapped[RestaurantTable] = relationship("RestaurantTable", back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order")
    deliveries: Mapped[list["Delivery"]] = relationship("Delivery", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")

    order: Mapped[Order] = relationship("Order", back_populates="items")
    menu_item: Mapped[MenuItem] = relationship("MenuItem")


# ── Deliveries ─────────────────────────────────────────────────────────────

class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    confirm_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # "done_button" | "weight_sensor" | "timeout"
    trip_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    blocked_count: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[bool] = mapped_column(Boolean, default=False)

    order: Mapped[Order] = relationship("Order", back_populates="deliveries")


# ── Robot State (single-row live snapshot) ─────────────────────────────────

class RobotStatus(Base):
    __tablename__ = "robot_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    mode: Mapped[RobotMode] = mapped_column(Enum(RobotMode), default=RobotMode.delivery)
    state: Mapped[str] = mapped_column(String(50), default="idle")
    battery_pct: Mapped[float] = mapped_column(Float, default=100.0)
    pose_x: Mapped[float] = mapped_column(Float, default=0.0)
    pose_y: Mapped[float] = mapped_column(Float, default=0.0)
    pose_yaw: Mapped[float] = mapped_column(Float, default=0.0)
    current_delivery_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_stop: Mapped[int | None] = mapped_column(Integer, nullable=True)
    volume: Mapped[int] = mapped_column(Integer, default=70)
    online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


# ── Robot Event Log ────────────────────────────────────────────────────────

class RobotEvent(Base):
    __tablename__ = "robot_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[str] = mapped_column(Text, default="{}")
    recorded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
