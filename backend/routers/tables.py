# ── Tables router ────────────────────────────────────────────────────────────
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import RestaurantTable
from ..schemas import TableCreate, TableOut

router = APIRouter(prefix="/tables", tags=["tables"])


@router.get("", response_model=list[TableOut])
async def list_tables(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RestaurantTable).order_by(RestaurantTable.number))
    return result.scalars().all()


@router.get("/{table_number}", response_model=TableOut)
async def get_table(table_number: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RestaurantTable).where(RestaurantTable.number == table_number)
    )
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(404, "Table not found")
    return table


@router.post("", response_model=TableOut, status_code=201)
async def create_table(body: TableCreate, db: AsyncSession = Depends(get_db)):
    table = RestaurantTable(**body.model_dump())
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return table


@router.put("/{table_id}", response_model=TableOut)
async def update_table(table_id: int, body: TableCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RestaurantTable).where(RestaurantTable.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(404, "Table not found")
    for k, v in body.model_dump().items():
        setattr(table, k, v)
    await db.commit()
    await db.refresh(table)
    return table


@router.delete("/{table_id}", status_code=204)
async def delete_table(table_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RestaurantTable).where(RestaurantTable.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(404, "Table not found")
    await db.delete(table)
    await db.commit()
