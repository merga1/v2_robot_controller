# ─────────────────────────────────────────────
#  WebSocket Connection Manager
#  Broadcasts real-time events to all browsers
# ─────────────────────────────────────────────
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._clients.append(ws)
        logger.info("WS client connected. Total: %d", len(self._clients))

    def disconnect(self, ws: WebSocket):
        self._clients.remove(ws)
        logger.info("WS client disconnected. Total: %d", len(self._clients))

    async def broadcast(self, event_type: str, data: Any):
        """Broadcast a JSON message to all connected browser clients."""
        payload = json.dumps({"type": event_type, "data": data})
        dead: list[WebSocket] = []
        for client in self._clients:
            try:
                await client.send_text(payload)
            except Exception:
                dead.append(client)
        for d in dead:
            self._clients.remove(d)


ws_manager = ConnectionManager()
