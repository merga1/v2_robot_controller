// Dedicated Robot Kiosk API Client
const BACKEND_HOST = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
const API_BASE = import.meta.env.VITE_API_BASE || `http://${BACKEND_HOST}:8000/api`;
const WS_URL = import.meta.env.VITE_WS_BASE || `ws://${BACKEND_HOST}:8000/ws`;

export async function fetchRobotStatus() {
  const res = await fetch(`${API_BASE}/robot/status`);
  return res.json();
}

export async function sendRobotCommand(command, extra = {}) {
  const res = await fetch(`${API_BASE}/robot/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, ...extra }),
  });
  return res.json();
}

export async function submitRating(orderId, rating) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/rating`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  });
  return res.json();
}

export function connectWebSocket(onMessage) {
  let ws = null;
  let retryTimer = null;
  let isClosed = false;

  function connect() {
    if (isClosed) return;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('WS Parse Error', e);
        }
      };
      ws.onclose = () => {
        if (!isClosed) retryTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        if (ws) ws.close();
      };
    } catch (e) {
      if (!isClosed) retryTimer = setTimeout(connect, 3000);
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (ws) ws.close();
  };
}
