# ─────────────────────────────────────────────
#  Database – SQLite via SQLAlchemy (async)
# ─────────────────────────────────────────────
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = "sqlite+aiosqlite:///./robot_restaurant.db"

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        from . import models  # noqa: F401 – ensure models are imported
        await conn.run_sync(Base.metadata.create_all)
