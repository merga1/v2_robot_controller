# ─────────────────────────────────────────────────────────────────────────────
#  FastAPI Application Entry Point
# ─────────────────────────────────────────────────────────────────────────────
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .database import init_db
from .mqtt_client import mqtt_client
from .ws_manager import ws_manager
from .routers import (
    menu, tables, orders, robot, analytics,
    auth, navigation, destinations, missions, teleop
)
from .seed import seed_demo_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Initialising database…")
    await init_db()
    await seed_demo_data()

    logger.info("Starting MQTT client…")
    mqtt_client.start()

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    await mqtt_client.stop()
    logger.info("Server shut down.")


app = FastAPI(
    title="Restaurant Delivery Robot API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (allow the React dev server and any phone on the same network) ────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers (/api standard prefix for web apps and unified backend) ─────────
app.include_router(menu.router,         prefix="/api")
app.include_router(tables.router,       prefix="/api")
app.include_router(orders.router,       prefix="/api")
app.include_router(robot.router,        prefix="/api")
app.include_router(analytics.router,    prefix="/api")
app.include_router(auth.router,         prefix="/api")
app.include_router(navigation.router,   prefix="/api")
app.include_router(destinations.router, prefix="/api")
app.include_router(missions.router,     prefix="/api")
app.include_router(teleop.router,       prefix="/api")

# ── Direct compatibility mounts (enables Flutter app & legacy Pi client to hit root) ─
app.include_router(auth.router)
app.include_router(navigation.router)
app.include_router(destinations.router)
app.include_router(missions.router)
app.include_router(teleop.router)
app.include_router(robot.router)

# Direct root /logs endpoint for Flutter RobotService compatibility
@app.get("/logs", tags=["logs"])
async def root_logs(severity: str | None = None, limit: int = 100):
    from .routers.robot import get_logs_compat
    from .database import SessionLocal
    async with SessionLocal() as db:
        return await get_logs_compat(severity, limit, db)


# ── WebSocket (real-time browser updates) ─────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            # keep connection alive; browser sends ping {"type":"ping"}
            data = await ws.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Serve React frontend (production build) ────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = os.path.join(FRONTEND_DIST, "index.html")
        return FileResponse(index)
