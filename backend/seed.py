# ─────────────────────────────────────────────────────────────────────────────
#  Seed demo data on first run (skips if data already exists)
# ─────────────────────────────────────────────────────────────────────────────
import logging
from sqlalchemy import select

from .database import SessionLocal
from .models import Category, MenuItem, RestaurantTable

logger = logging.getLogger(__name__)


async def seed_demo_data():
    async with SessionLocal() as db:
        # Skip if data already exists
        result = await db.execute(select(Category).limit(1))
        if result.scalar_one_or_none():
            return

        logger.info("Seeding demo data…")

        # Categories
        categories = [
            Category(name="Starters", sort_order=1),
            Category(name="Main Course", sort_order=2),
            Category(name="Desserts", sort_order=3),
            Category(name="Drinks", sort_order=4),
        ]
        db.add_all(categories)
        await db.flush()

        # Menu Items
        items = [
            # Starters
            MenuItem(category_id=categories[0].id, name="Spring Rolls", description="Crispy vegetable rolls with sweet chilli dip", price=8.50, prep_minutes=8),
            MenuItem(category_id=categories[0].id, name="Soup of the Day", description="Ask your server for today's selection", price=6.00, prep_minutes=5),
            MenuItem(category_id=categories[0].id, name="Garlic Bread", description="Toasted sourdough with herb butter", price=5.50, prep_minutes=5),
            # Mains
            MenuItem(category_id=categories[1].id, name="Grilled Chicken", description="Herb-marinated chicken breast, seasonal vegetables, mashed potato", price=18.50, prep_minutes=15),
            MenuItem(category_id=categories[1].id, name="Beef Burger", description="200g beef patty, aged cheddar, lettuce, tomato, fries", price=16.00, prep_minutes=12),
            MenuItem(category_id=categories[1].id, name="Pasta Arrabiata", description="Penne in spicy tomato sauce, fresh basil, parmesan", price=14.00, prep_minutes=10),
            MenuItem(category_id=categories[1].id, name="Grilled Salmon", description="Atlantic salmon fillet, lemon butter sauce, asparagus", price=22.00, prep_minutes=15),
            # Desserts
            MenuItem(category_id=categories[2].id, name="Chocolate Lava Cake", description="Warm chocolate cake, vanilla ice cream", price=9.00, prep_minutes=10),
            MenuItem(category_id=categories[2].id, name="Crème Brûlée", description="Classic vanilla custard with caramelised sugar crust", price=8.00, prep_minutes=5),
            # Drinks
            MenuItem(category_id=categories[3].id, name="Still Water (500ml)", description="", price=2.50, prep_minutes=1),
            MenuItem(category_id=categories[3].id, name="Soft Drink (330ml)", description="Cola, Lemonade, Orange", price=3.50, prep_minutes=1),
            MenuItem(category_id=categories[3].id, name="Fresh Juice", description="Orange, Apple or Mango", price=5.00, prep_minutes=3),
            MenuItem(category_id=categories[3].id, name="Coffee / Tea", description="Espresso, Americano, Cappuccino or English Breakfast Tea", price=4.00, prep_minutes=3),
        ]
        db.add_all(items)

        # Tables (10 tables with dummy poses)
        tables = [
            RestaurantTable(number=i, label=f"Table {i}", pose_x=float(i) * 1.5, pose_y=2.0, pose_yaw=0.0)
            for i in range(1, 11)
        ]
        db.add_all(tables)

        await db.commit()
        logger.info("Demo data seeded: 4 categories, 13 items, 10 tables.")
