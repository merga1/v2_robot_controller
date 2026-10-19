// Centralized API and WebSocket client
const API_BASE = 'http://localhost:8000/api';
const WS_URL = 'ws://localhost:8000/ws';

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/menu/categories`);
  return res.json();
}

export async function fetchMenuItems(categoryId = null) {
  const url = categoryId 
    ? `${API_BASE}/menu/items?category_id=${categoryId}`
    : `${API_BASE}/menu/items`;
  const res = await fetch(url);
  return res.json();
}

export async function createMenuItem(item) {
  const res = await fetch(`${API_BASE}/menu/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function fetchTables() {
  const res = await fetch(`${API_BASE}/tables`);
  return res.json();
}

export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`);
  return res.json();
}

export async function createOrder(tableId, items, notes = '') {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_id: tableId,
      items: items.map(i => ({
        menu_item_id: i.id,
        quantity: i.quantity,
        notes: i.notes || '',
      })),
      notes,
    }),
  });
  return res.json();
}

export async function updateOrderStatus(orderId, status) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
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

export async function fetchRobotStatus() {
  const res = await fetch(`${API_BASE}/robot/status`);
  return res.json();
}

export async function dispatchRobot(tableNumbers) {
  const res = await fetch(`${API_BASE}/robot/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_numbers: tableNumbers }),
  });
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

export async function sendTeleop(linear, angular, speedLimit = 0.5) {
  const res = await fetch(`${API_BASE}/robot/teleop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linear, angular, speed_limit: speedLimit }),
  });
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  return res.json();
}

export async function fetchRobotEvents() {
  const res = await fetch(`${API_BASE}/robot/events`);
  return res.json();
}

// WebSocket subscription helper
export function connectWebSocket(onMessage) {
  let ws = null;
  let timer = null;

  function connect() {
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        console.log('[WS] Connected to backend');
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          // ignore
        }
      };
      ws.onclose = () => {
        console.log('[WS] Disconnected. Reconnecting in 2s...');
        timer = setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      timer = setTimeout(connect, 2000);
    }
  }

  connect();

  return () => {
    if (timer) clearTimeout(timer);
    if (ws) ws.close();
  };
}
