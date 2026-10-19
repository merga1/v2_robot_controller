import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Gauge, Volume2, MapPin, Activity, Settings, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Octagon, 
  Star, Clock, ShieldAlert, CheckCircle, RefreshCw, Zap
} from 'lucide-react';
import { 
  fetchRobotStatus, sendRobotCommand, sendTeleop, 
  fetchAnalytics, fetchRobotEvents, connectWebSocket, fetchTables 
} from './api';
import './index.css';

export default function App() {
  const [robot, setRobot] = useState({
    mode: 'delivery',
    state: 'idle',
    battery_pct: 95.0,
    pose_x: 0.0,
    pose_y: 0.0,
    pose_yaw: 0.0,
    volume: 70,
  });

  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);
  const [tables, setTables] = useState([]);
  const [speedLimit, setSpeedLimit] = useState(0.5);
  const [volume, setVolume] = useState(70);
  const teleopIntervalRef = useRef(null);

  const loadData = async () => {
    try {
      const [rbt, anl, evs, tbls] = await Promise.all([
        fetchRobotStatus(),
        fetchAnalytics(),
        fetchRobotEvents(),
        fetchTables(),
      ]);
      if (rbt) {
        setRobot(rbt);
        setVolume(rbt.volume || 70);
      }
      setAnalytics(anl);
      setEvents(evs);
      setTables(tbls);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();

    const cleanup = connectWebSocket((msg) => {
      if (msg.type === 'robot_status') {
        setRobot((prev) => ({
          ...prev,
          ...msg.data,
          pose_x: msg.data.pose ? msg.data.pose.x : prev.pose_x,
          pose_y: msg.data.pose ? msg.data.pose.y : prev.pose_y,
          pose_yaw: msg.data.pose ? msg.data.pose.yaw : prev.pose_yaw,
        }));
      } else if (msg.type === 'robot_event') {
        setEvents((prev) => [
          {
            id: Date.now(),
            type: msg.data.event,
            payload: JSON.stringify(msg.data),
            recorded_at: new Date().toISOString(),
          },
          ...prev.slice(0, 49),
        ]);
        fetchAnalytics().then(setAnalytics);
      }
    });

    return cleanup;
  }, []);

  const handleModeChange = async (newMode) => {
    try {
      await sendRobotCommand('set_mode', { mode: newMode });
      setRobot((prev) => ({ ...prev, mode: newMode }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleVolumeChange = async (val) => {
    setVolume(val);
    try {
      await sendRobotCommand('set_volume', { volume: parseInt(val) });
    } catch (err) {
      console.error(err);
    }
  };

  const startDriving = (linear, angular) => {
    stopDriving();
    sendTeleop(linear, angular, speedLimit);
    teleopIntervalRef.current = setInterval(() => {
      sendTeleop(linear, angular, speedLimit);
    }, 100);
  };

  const stopDriving = () => {
    if (teleopIntervalRef.current) {
      clearInterval(teleopIntervalRef.current);
      teleopIntervalRef.current = null;
    }
    sendTeleop(0, 0, speedLimit);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header className="top-nav">
        <div className="nav-brand">
          <div className="nav-logo-icon">
            <Settings size={22} color="#000066" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Bistro Robotique</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--brand-yellow)', fontWeight: 600 }}>Admin Operations &amp; Teleoperation</div>
          </div>
        </div>

        <div className="robot-badge">
          <div className="pulse-dot" />
          <span style={{ textTransform: 'capitalize' }}>Mode: {robot.mode}</span>
          <span style={{ opacity: 0.7 }}>•</span>
          <span>{robot.battery_pct}%</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1240, width: '100%', margin: '0 auto', padding: '24px 20px 80px', flex: 1 }} className="animate-fade-in">
        {/* Top Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
              Robot Command &amp; Operations
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Teleoperation, interactive floor plan, and telemetry dashboard
            </p>
          </div>

          {/* Mode Selector Switch */}
          <div 
            style={{ 
              display: 'flex', 
              gap: 6, 
              background: '#FFFFFF', 
              padding: 5, 
              borderRadius: 99, 
              border: '2px solid var(--brand-navy)',
              boxShadow: 'var(--shadow-sm)' 
            }}
          >
            {['delivery', 'manual', 'survey', 'maintenance'].map((m) => {
              const isActive = robot.mode === m;
              return (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: 99,
                    border: 'none',
                    background: isActive ? 'var(--brand-yellow)' : 'transparent',
                    color: isActive ? 'var(--text-on-yellow)' : 'var(--brand-navy)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Cards Grid */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="glass-panel" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Orders</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: 4, color: 'var(--brand-navy)' }}>
                {analytics.orders_total}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Deliveries Completed</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: 4, color: 'var(--color-success)' }}>
                {analytics.deliveries_completed}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Delivery Trip</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: 4, color: 'var(--brand-navy)' }}>
                {analytics.avg_trip_seconds ? `${Math.round(analytics.avg_trip_seconds)}s` : '42s'}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Guest Rating</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: 4, color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={22} fill="var(--brand-yellow)" stroke="var(--brand-navy)" strokeWidth={2} />
                {analytics.avg_rating ? analytics.avg_rating.toFixed(1) : '5.0'}
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>({analytics.rating_count})</span>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Blocked / Obstacles</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: 4, color: 'var(--color-warning)' }}>
                {analytics.blocked_events_total}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Battery Reserve</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: 4, color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={24} color="#000066" />
                {robot.battery_pct}%
              </div>
            </div>
          </div>
        )}

        {/* Main Grid: Map & Teleop */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Interactive 2D Restaurant Floor Plan */}
          <div className="glass-panel" style={{ padding: 22, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={20} color="var(--brand-navy)" /> Interactive Restaurant Floor Plan
              </h2>
              <div className="badge-navy" style={{ fontSize: '0.78rem' }}>
                Robot Pose: ({robot.pose_x.toFixed(2)}m, {robot.pose_y.toFixed(2)}m, {robot.pose_yaw.toFixed(2)}rad)
              </div>
            </div>

            <div 
              style={{ 
                width: '100%', 
                height: 380, 
                backgroundColor: '#FFFFFF', 
                borderRadius: 14, 
                border: '2px solid var(--brand-navy)', 
                position: 'relative', 
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 8px rgba(0,0,102,0.06)' 
              }}
            >
              <svg viewBox="-1 -1 13 7" style={{ width: '100%', height: '100%', transform: 'scaleY(-1)' }}>
                <defs>
                  <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                    <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(0, 0, 102, 0.08)" strokeWidth="0.04" />
                  </pattern>
                </defs>
                <rect x="-1" y="-1" width="14" height="8" fill="url(#grid)" />

                {/* Dock */}
                <rect x="-0.3" y="-0.3" width="0.8" height="0.8" rx="0.1" fill="var(--brand-yellow)" stroke="var(--brand-navy)" strokeWidth="0.08" />
                <text x="0.1" y="-0.5" fill="var(--brand-navy)" fontSize="0.32" textAnchor="middle" transform="scale(1,-1)" style={{ fontWeight: 900 }}>
                  Dock
                </text>

                {/* Tables */}
                {tables.map((t) => (
                  <g key={t.id} transform={`translate(${t.pose_x}, ${t.pose_y})`}>
                    <circle r="0.65" fill="var(--brand-yellow)" stroke="var(--brand-navy)" strokeWidth="0.08" />
                    <text x="0" y="0.12" fill="var(--brand-navy)" fontSize="0.34" textAnchor="middle" transform="scale(1,-1)" style={{ fontWeight: 900 }}>
                      T{t.number}
                    </text>
                  </g>
                ))}

                {/* Robot Avatar */}
                <g transform={`translate(${robot.pose_x}, ${robot.pose_y}) rotate(${(robot.pose_yaw * 180) / Math.PI})`}>
                  <circle r="0.48" fill="var(--brand-yellow)" opacity="0.5" />
                  <circle r="0.36" fill="var(--brand-navy)" stroke="var(--brand-yellow)" strokeWidth="0.06" />
                  <line x1="0" y1="0" x2="0.52" y2="0" stroke="var(--brand-yellow)" strokeWidth="0.1" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>

          {/* Teleop Virtual Drive Pad */}
          <div className="glass-panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gauge size={20} color="var(--brand-navy)" /> Manual Teleoperation
                </h2>
                <span 
                  className={robot.mode === 'manual' ? 'badge-yellow' : 'badge-navy'} 
                  style={{ fontSize: '0.78rem' }}
                >
                  {robot.mode === 'manual' ? 'DRIVE ACTIVE' : 'SWITCH TO MANUAL'}
                </span>
              </div>

              {/* D-Pad Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 220, margin: '20px auto' }}>
                <div />
                <button
                  onMouseDown={() => startDriving(speedLimit, 0)}
                  onMouseUp={stopDriving}
                  onTouchStart={() => startDriving(speedLimit, 0)}
                  onTouchEnd={stopDriving}
                  disabled={robot.mode !== 'manual'}
                  className="btn btn-primary"
                  style={{ height: 60, borderRadius: 14 }}
                >
                  <ArrowUp size={24} color="#FFFF99" />
                </button>
                <div />

                <button
                  onMouseDown={() => startDriving(0, 0.8)}
                  onMouseUp={stopDriving}
                  onTouchStart={() => startDriving(0, 0.8)}
                  onTouchEnd={stopDriving}
                  disabled={robot.mode !== 'manual'}
                  className="btn btn-primary"
                  style={{ height: 60, borderRadius: 14 }}
                >
                  <ArrowLeft size={24} color="#FFFF99" />
                </button>
                <button
                  onClick={stopDriving}
                  className="btn btn-secondary"
                  style={{ height: 60, borderRadius: 14, border: '2px solid var(--brand-navy)' }}
                  title="Immediate Stop"
                >
                  <Octagon size={24} color="#000066" />
                </button>
                <button
                  onMouseDown={() => startDriving(0, -0.8)}
                  onMouseUp={stopDriving}
                  onTouchStart={() => startDriving(0, -0.8)}
                  onTouchEnd={stopDriving}
                  disabled={robot.mode !== 'manual'}
                  className="btn btn-primary"
                  style={{ height: 60, borderRadius: 14 }}
                >
                  <ArrowRight size={24} color="#FFFF99" />
                </button>

                <div />
                <button
                  onMouseDown={() => startDriving(-speedLimit, 0)}
                  onMouseUp={stopDriving}
                  onTouchStart={() => startDriving(-speedLimit, 0)}
                  onTouchEnd={stopDriving}
                  disabled={robot.mode !== 'manual'}
                  className="btn btn-primary"
                  style={{ height: 60, borderRadius: 14 }}
                >
                  <ArrowDown size={24} color="#FFFF99" />
                </button>
                <div />
              </div>
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 6, fontWeight: 700, color: 'var(--brand-navy)' }}>
                  <span>Drive Speed Limit</span>
                  <span className="badge-yellow">{speedLimit.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.2"
                  step="0.1"
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand-navy)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 6, fontWeight: 700, color: 'var(--brand-navy)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Volume2 size={15} /> Robot Speaker Volume
                  </span>
                  <span className="badge-yellow">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volume}
                  onChange={(e) => handleVolumeChange(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--brand-navy)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Event Stream Log */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} color="var(--brand-navy)" /> Live Event &amp; MQTT Message Stream
          </h2>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {events.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>Listening for live events from robot/events...</div>
            ) : (
              events.map((ev, idx) => (
                <div key={idx} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--bg-primary)', borderLeft: '4px solid var(--brand-navy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge-yellow" style={{ marginRight: 8, fontSize: '0.72rem' }}>
                      {ev.type.toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--text-body)' }}>{ev.payload}</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {new Date(ev.recorded_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
