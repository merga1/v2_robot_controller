# ─────────────────────────────────────────────
#  Pydantic Schemas (request / response models)
# ─────────────────────────────────────────────
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from .models import OrderStatus, RobotMode


# ── Tables ──────────────────────────────────────────────────────────────────

class TableBase(BaseModel):
    number: int
    label: str = ""
    pose_x: float = 0.0
    pose_y: float = 0.0
    pose_yaw: float = 0.0
    active: bool = True


class TableCreate(TableBase):
    pass


class TableOut(TableBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    qr_code: Optional[str] = None


# ── Menu ────────────────────────────────────────────────────────────────────

class CategoryBase(BaseModel):
    name: str
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class MenuItemBase(BaseModel):
    name: str
    description: str = ""
    price: float
    image_url: Optional[str] = None
    available: bool = True
    prep_minutes: int = 10
    category_id: int


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemOut(MenuItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category: Optional[CategoryOut] = None


# ── Orders ──────────────────────────────────────────────────────────────────

class OrderItemIn(BaseModel):
    menu_item_id: int
    quantity: int = 1
    notes: str = ""


class OrderCreate(BaseModel):
    table_id: int
    items: list[OrderItemIn]
    notes: str = ""


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    menu_item_id: int
    quantity: int
    unit_price: float
    notes: str


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    table_id: int
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    notes: str
    rating: Optional[int] = None
    items: list[OrderItemOut] = []


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class RatingUpdate(BaseModel):
    rating: int  # 1-5


# ── Dispatch ─────────────────────────────────────────────────────────────────

class DispatchRequest(BaseModel):
    """Chef sends: list of table numbers in stop order."""
    table_numbers: list[int]


# ── Robot ─────────────────────────────────────────────────────────────────────

class RobotStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    mode: RobotMode
    state: str
    battery_pct: float
    pose_x: float
    pose_y: float
    pose_yaw: float
    current_delivery_id: Optional[int]
    current_stop: Optional[int]
    volume: int
    online: bool
    last_seen: Optional[datetime]


class RobotCommand(BaseModel):
    command: str           # "cancel" | "go_dock" | "set_mode" | "set_volume"
    mode: Optional[RobotMode] = None
    volume: Optional[int] = None


class TeleopCommand(BaseModel):
    linear: float = 0.0
    angular: float = 0.0
    speed_limit: float = 0.3


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    orders_total: int
    deliveries_completed: int
    avg_order_to_delivered_seconds: Optional[float]
    avg_trip_seconds: Optional[float]
    blocked_events_total: int
    avg_rating: Optional[float]
    rating_count: int
    avg_battery_pct: Optional[float]
