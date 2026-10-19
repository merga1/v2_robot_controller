# ── Menu & Category router ───────────────────────────────────────────────────
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Category, MenuItem
from ..schemas import (
    CategoryCreate, CategoryOut,
    MenuItemCreate, MenuItemOut,
)

router = APIRouter(prefix="/menu", tags=["menu"])


# ── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.sort_order))
    return result.scalars().all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(body: CategoryCreate, db: AsyncSession = Depends(get_db)):
    cat = Category(**body.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Category not found")
    await db.delete(cat)
    await db.commit()


# ── Menu Items ────────────────────────────────────────────────────────────────

@router.get("/items", response_model=list[MenuItemOut])
async def list_items(
    category_id: int | None = None,
    available_only: bool = True,
    db: AsyncSession = Depends(get_db),
):
    q = select(MenuItem)
    if category_id is not None:
        q = q.where(MenuItem.category_id == category_id)
    if available_only:
        q = q.where(MenuItem.available == True)  # noqa: E712
    result = await db.execute(q.order_by(MenuItem.id))
    return result.scalars().all()


@router.post("/items", response_model=MenuItemOut, status_code=201)
async def create_item(body: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    item = MenuItem(**body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=MenuItemOut)
async def update_item(item_id: int, body: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    await db.commit()
