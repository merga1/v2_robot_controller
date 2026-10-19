import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, Bot, Bell, Volume2, VolumeX, Maximize2, AlertTriangle } from 'lucide-react';
import { fetchOrders, updateOrderStatus, connectWebSocket } from '../api';

function playOrderChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

export default function KitchenBoard() {
  const [orders, setOrders] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOrders();

    const cleanup = connectWebSocket((msg) => {
      if (msg.type === 'new_order') {
        if (soundEnabled) playOrderChime();
        loadOrders();
      } else if (msg.type === 'order_status' || msg.type === 'dispatch') {
        loadOrders();
      }
    });

    return cleanup;
  }, [soundEnabled]);

  const handleAdvance = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const cols = {
    new: orders.filter((o) => o.status === 'received'),
    preparing: orders.filter((o) => o.status === 'preparing'),
    ready: orders.filter((o) => o.status === 'ready'),
    on_the_way: orders.filter((o) => o.status === 'on_the_way'),
  };

  const getWaitMinutes = (createdAt) => {
    const created = new Date(createdAt).getTime();
    return Math.max(0, Math.floor((now - created) / 60000));
  };

  const getAgingBorder = (minutes) => {
    if (minutes >= 12) return '2px solid #DC2626';
    if (minutes >= 6) return '2px solid #D97706';
    return '1px solid var(--border-subtle)';
  };

  return (
    <div style={{ padding: '24px 28px', minHeight: 'calc(100vh - 120px)', backgroundColor: 'var(--bg-primary)' }} className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div 
            style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 12, 
              backgroundColor: 'var(--brand-navy)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,102,0.2)' 
            }}
          >
            <ChefHat size={26} color="#FFFF99" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
              Kitchen Display System (KDS)
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Live order preparation board &amp; robot dispatch staging
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            {soundEnabled ? <Volume2 size={17} color="#000066" /> : <VolumeX size={17} color="#000066" />}
            <span>{soundEnabled ? 'Sound Active' : 'Sound Muted'}</span>
          </button>
          <button
            onClick={toggleFullScreen}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Maximize2 size={17} />
            <span>Full Screen TV</span>
          </button>
        </div>
      </div>

      {/* 4-Column Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        {/* COLUMN 1: NEW */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--brand-navy)', 
              borderRadius: 12,
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <Bell size={18} color="#FFFF99" /> 1. New Orders
            </span>
            <span 
              className="badge-yellow"
              style={{ fontWeight: 800, padding: '2px 10px', fontSize: '0.85rem' }}
            >
              {cols.new.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cols.new.map((order) => {
              const wait = getWaitMinutes(order.created_at);
              return (
                <div
                  key={order.id}
                  className="glass-panel"
                  style={{
                    padding: 18,
                    border: getAgingBorder(wait),
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--brand-navy)' }}>
                      Table {order.table_id}
                    </span>
                    <span 
                      style={{ 
                        padding: '4px 10px', 
                        borderRadius: 8, 
                        background: wait >= 6 ? 'var(--color-warning-bg)' : 'var(--bg-primary)', 
                        color: wait >= 6 ? 'var(--color-warning)' : 'var(--brand-navy)', 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4 
                      }}
                    >
                      <Clock size={13} /> {wait} min
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {order.items.map((i) => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                        <span>
                          <strong style={{ color: 'var(--brand-navy)' }}>{i.quantity}x</strong> Item #{i.menu_item_id}
                        </span>
                        {i.notes && <span style={{ color: 'var(--color-warning)', fontSize: '0.8rem' }}>({i.notes})</span>}
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-highlight)', color: 'var(--brand-navy)', fontSize: '0.82rem', marginBottom: 14, display: 'flex', gap: 6, alignItems: 'center', border: '1px solid rgba(0,0,102,0.1)' }}>
                      <AlertTriangle size={15} color="#000066" /> {order.notes}
                    </div>
                  )}

                  {/* Accept Primary Button (Deep Navy Blue) */}
                  <button
                    onClick={() => handleAdvance(order.id, 'preparing')}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                  >
                    Accept &amp; Start Cooking 🍳
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: PREPARING */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--brand-navy)', 
              borderRadius: 12,
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <ChefHat size={18} color="#FFFF99" /> 2. Preparing
            </span>
            <span 
              className="badge-yellow"
              style={{ fontWeight: 800, padding: '2px 10px', fontSize: '0.85rem' }}
            >
              {cols.preparing.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cols.preparing.map((order) => {
              const wait = getWaitMinutes(order.created_at);
              return (
                <div
                  key={order.id}
                  className="glass-panel"
                  style={{
                    padding: 18,
                    border: getAgingBorder(wait),
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--brand-navy)' }}>
                      Table {order.table_id}
                    </span>
                    <span 
                      style={{ 
                        padding: '4px 10px', 
                        borderRadius: 8, 
                        background: 'var(--bg-primary)', 
                        color: 'var(--brand-navy)', 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4 
                      }}
                    >
                      <Clock size={13} /> {wait} min
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {order.items.map((i) => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                        <span>
                          <strong style={{ color: 'var(--brand-navy)' }}>{i.quantity}x</strong> Item #{i.menu_item_id}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Secondary Button: Chalk Yellow with Deep Navy text */}
                  <button
                    onClick={() => handleAdvance(order.id, 'ready')}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                  >
                    Mark Ready for Robot 🛎️
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 3: READY FOR ROBOT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--brand-yellow)', 
              borderRadius: 12,
              color: 'var(--brand-navy)',
              border: '2px solid var(--brand-navy)',
              boxShadow: 'var(--shadow-yellow)',
            }}
          >
            <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <Bot size={18} color="#000066" /> 3. Ready for Robot
            </span>
            <span 
              className="badge-navy"
              style={{ fontWeight: 800, padding: '2px 10px', fontSize: '0.85rem' }}
            >
              {cols.ready.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cols.ready.map((order) => (
              <div
                key={order.id}
                className="glass-panel"
                style={{
                  padding: 18,
                  border: '2px solid var(--brand-navy)',
                  background: 'var(--bg-highlight)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--brand-navy)' }}>
                    Table {order.table_id}
                  </span>
                  <span className="badge-navy" style={{ fontSize: '0.76rem' }}>
                    Plated &amp; Waiting
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {order.items.map((i) => (
                    <div key={i.id} style={{ fontSize: '0.92rem' }}>
                      <strong style={{ color: 'var(--brand-navy)' }}>{i.quantity}x</strong> Item #{i.menu_item_id}
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--brand-navy)', fontWeight: 700, textAlign: 'center', padding: '6px', background: '#FFFFFF', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  Awaiting Chef Panel dispatch ➔
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 4: ON THE WAY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 16px', 
              backgroundColor: 'var(--brand-navy)', 
              borderRadius: 12,
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <Bot size={18} color="#FFFF99" /> 4. On the Way
            </span>
            <span 
              className="badge-yellow"
              style={{ fontWeight: 800, padding: '2px 10px', fontSize: '0.85rem' }}
            >
              {cols.on_the_way.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cols.on_the_way.map((order) => (
              <div
                key={order.id}
                className="glass-panel"
                style={{
                  padding: 18,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--brand-navy)' }}>
                    Table {order.table_id}
                  </span>
                  <span className="badge-yellow" style={{ fontSize: '0.76rem' }}>
                    In Transit
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {order.items.map((i) => (
                    <div key={i.id} style={{ fontSize: '0.92rem' }}>
                      <strong style={{ color: 'var(--brand-navy)' }}>{i.quantity}x</strong> Item #{i.menu_item_id}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--brand-navy)', fontWeight: 700 }}>
                  <div className="pulse-dot" />
                  Robot delivering to table
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
