import React, { useState, useEffect } from 'react';
import { ChefHat, Send, XCircle, Home, Bell, Check, Bot, Battery, ArrowRight, Sparkles } from 'lucide-react';
import { fetchOrders, fetchRobotStatus, dispatchRobot, sendRobotCommand, connectWebSocket } from '../api';

export default function ChefPanel() {
  const [orders, setOrders] = useState([]);
  const [robotStatus, setRobotStatus] = useState(null);
  const [selectedStops, setSelectedStops] = useState([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadData = async () => {
    try {
      const [ord, rbt] = await Promise.all([fetchOrders(), fetchRobotStatus()]);
      setOrders(ord);
      setRobotStatus(rbt);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();

    const cleanup = connectWebSocket((msg) => {
      if (msg.type === 'robot_status') {
        setRobotStatus((prev) => ({ ...prev, ...msg.data }));
      } else if (msg.type === 'order_status' || msg.type === 'new_order' || msg.type === 'dispatch') {
        loadData();
      }
    });

    return cleanup;
  }, []);

  const showNotification = (text) => {
    setFeedback(text);
    setTimeout(() => setFeedback(''), 3500);
  };

  const handleTableTap = (tableNum) => {
    if (selectedStops.includes(tableNum)) {
      setSelectedStops(selectedStops.filter((s) => s !== tableNum));
    } else {
      setSelectedStops([...selectedStops, tableNum]);
    }
  };

  const handleDispatch = async () => {
    if (selectedStops.length === 0) return;
    setSending(true);
    try {
      await dispatchRobot(selectedStops);
      showNotification(`🚀 Robot dispatched to Tables: ${selectedStops.join(' ➔ ')}!`);
      setSelectedStops([]);
      loadData();
    } catch (err) {
      alert('Could not dispatch robot. Ensure orders are marked "Ready" in the kitchen.');
    } finally {
      setSending(false);
    }
  };

  const handleCommand = async (cmd) => {
    try {
      await sendRobotCommand(cmd);
      showNotification(`Command '${cmd}' sent to robot.`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getTableState = (num) => {
    const readyOrder = orders.find((o) => o.table_id === num && o.status === 'ready');
    if (readyOrder) return 'ready';
    const activeOrder = orders.find((o) => o.table_id === num && ['received', 'preparing', 'on_the_way'].includes(o.status));
    if (activeOrder) return 'active';
    return 'idle';
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 80px' }} className="animate-fade-in">
      {/* Header */}
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
              Chef Pass Station
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Select stop sequence &amp; dispatch plated meals to robot
            </p>
          </div>
        </div>

        {/* Robot status pill */}
        {robotStatus && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              padding: '8px 18px', 
              borderRadius: 99, 
              background: 'var(--brand-navy)', 
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,102,0.15)',
              border: '1px solid var(--brand-yellow)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
              <div className="pulse-dot" />
              <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                {robotStatus.state.replace('_', ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand-yellow)', fontSize: '0.85rem', fontWeight: 800 }}>
              <Battery size={16} />
              {robotStatus.battery_pct}%
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div 
          style={{ 
            marginBottom: 16, 
            padding: '12px 18px', 
            borderRadius: 12, 
            background: 'var(--bg-highlight)', 
            border: '2px solid var(--brand-navy)', 
            color: 'var(--brand-navy)', 
            fontWeight: 800, 
            textAlign: 'center' 
          }}
        >
          {feedback}
        </div>
      )}

      {/* Sequence Builder Bar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '18px 22px', 
          marginBottom: 24, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 14,
          border: '2px solid var(--brand-navy)'
        }}
      >
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--brand-navy)', fontWeight: 800, display: 'block', marginBottom: 6 }}>
            Stop Sequence ({selectedStops.length} stops queued):
          </span>
          {selectedStops.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.95rem' }}>
              Tap tables below in desired sequence (e.g. Table 5 then Table 2)
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {selectedStops.map((st, idx) => (
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      padding: '6px 14px', 
                      borderRadius: 20, 
                      backgroundColor: 'var(--brand-navy)', 
                      color: '#FFFFFF', 
                      fontWeight: 800, 
                      fontSize: '0.92rem',
                      border: '1px solid var(--brand-yellow)',
                      boxShadow: '0 2px 6px rgba(0,0,102,0.2)'
                    }}
                  >
                    <span 
                      style={{ 
                        background: 'var(--brand-yellow)', 
                        color: 'var(--text-on-yellow)', 
                        padding: '1px 6px', 
                        borderRadius: 10, 
                        fontSize: '0.78rem' 
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span>Table {st}</span>
                  </div>
                  {idx < selectedStops.length - 1 && <ArrowRight size={14} color="var(--brand-navy)" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {selectedStops.length > 0 && (
            <button 
              onClick={() => setSelectedStops([])} 
              className="btn btn-secondary" 
              style={{ padding: '9px 16px' }}
            >
              <XCircle size={18} /> Clear
            </button>
          )}
          <button
            onClick={handleDispatch}
            disabled={selectedStops.length === 0 || sending}
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontSize: '1rem', fontWeight: 800 }}
          >
            <Send size={18} color="#FFFF99" /> {sending ? 'Dispatching...' : 'Dispatch Robot 🚀'}
          </button>
        </div>
      </div>

      {/* Grid of Tables 1-10 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 18, marginBottom: 28 }}>
        {[...Array(10)].map((_, i) => {
          const num = i + 1;
          const isSelected = selectedStops.includes(num);
          const stopIdx = selectedStops.indexOf(num);
          const tableState = getTableState(num);

          let borderColor = 'var(--border-subtle)';
          let bgColor = '#FFFFFF';
          let textColor = 'var(--brand-navy)';
          let statusText = 'No active orders';
          let statusColor = 'var(--text-muted)';

          if (tableState === 'ready') {
            borderColor = 'var(--brand-navy)';
            bgColor = 'var(--brand-yellow)';
            textColor = 'var(--brand-navy)';
            statusText = '🍽️ Plated & Ready!';
            statusColor = 'var(--brand-navy)';
          } else if (tableState === 'active') {
            borderColor = 'rgba(0,0,102,0.25)';
            bgColor = 'var(--bg-highlight)';
            statusText = '⏳ Cooking in Kitchen';
            statusColor = 'var(--color-warning)';
          }

          if (isSelected) {
            borderColor = 'var(--brand-navy)';
            bgColor = 'var(--brand-navy)';
            textColor = '#FFFFFF';
            statusColor = 'var(--brand-yellow)';
          }

          return (
            <div
              key={num}
              onClick={() => handleTableTap(num)}
              className="glass-panel"
              style={{
                padding: '22px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                border: `2px solid ${borderColor}`,
                background: bgColor,
                color: textColor,
                position: 'relative',
                transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? 'var(--shadow-elevated)' : 'var(--shadow-sm)'
              }}
            >
              {isSelected && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10, 
                    width: 26, 
                    height: 26, 
                    borderRadius: '50%', 
                    background: 'var(--brand-yellow)', 
                    color: 'var(--text-on-yellow)', 
                    fontWeight: 900, 
                    fontSize: '0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  {stopIdx + 1}
                </div>
              )}

              <div style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 4 }}>
                Table {num}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: statusColor }}>
                {statusText}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Station Controls */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '18px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 14 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-navy)', fontSize: '0.95rem', fontWeight: 800 }}>
          <Bot size={22} color="var(--brand-navy)" />
          <span>Quick Robot Control:</span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => handleCommand('call_to_pass')} 
            className="btn btn-secondary" 
            style={{ padding: '9px 18px' }}
          >
            <Bell size={16} /> Call to Kitchen Pass
          </button>
          <button 
            onClick={() => handleCommand('go_dock')} 
            className="btn btn-primary" 
            style={{ padding: '9px 18px' }}
          >
            <Home size={16} color="#FFFF99" /> Return to Base Dock
          </button>
          <button 
            onClick={() => handleCommand('cancel')} 
            className="btn btn-danger" 
            style={{ padding: '9px 18px' }}
          >
            <XCircle size={16} /> Emergency Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
