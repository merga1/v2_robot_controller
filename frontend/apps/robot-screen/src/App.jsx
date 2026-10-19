import React, { useState, useEffect } from 'react';
import { Bot, Battery, Zap, AlertTriangle, CheckCircle2, Lock, Star, Sparkles } from 'lucide-react';
import { fetchRobotStatus, sendRobotCommand, submitRating, connectWebSocket } from './api';
import confetti from 'canvas-confetti';
import './index.css';

export default function App() {
  const [robot, setRobot] = useState({
    mode: 'delivery',
    state: 'idle',
    battery_pct: 95.0,
    current_delivery_id: null,
    current_stop: 5,
  });

  const [countdown, setCountdown] = useState(30);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [guestStars, setGuestStars] = useState(0);

  useEffect(() => {
    fetchRobotStatus().then((data) => {
      if (data) setRobot((prev) => ({ ...prev, ...data }));
    });

    const cleanup = connectWebSocket((msg) => {
      if (msg.type === 'robot_status') {
        setRobot((prev) => ({ ...prev, ...msg.data }));
      } else if (msg.type === 'robot_event') {
        if (msg.data.event === 'arrived') {
          setCountdown(30);
          confetti({ particleCount: 60, spread: 70 });
        }
      }
    });

    return cleanup;
  }, []);

  useEffect(() => {
    let timer;
    if (['arrived', 'waiting_confirm'].includes(robot.state)) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            handleDone();
            return 30;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      setCountdown(30);
    }
    return () => clearInterval(timer);
  }, [robot.state]);

  const handleDone = async () => {
    try {
      await sendRobotCommand('confirm_arrival');
      confetti({ particleCount: 90, spread: 80 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStarRating = async (stars) => {
    setGuestStars(stars);
    if (robot.current_delivery_id) {
      try {
        await submitRating(robot.current_delivery_id, stars);
      } catch (e) {}
    }
  };

  const handlePinSubmit = (digit) => {
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      if (next === '1234') {
        alert('Staff unlocked: Mode set to Delivery');
        setPinOpen(false);
        setPin('');
      } else {
        setPinError(true);
        setTimeout(() => {
          setPin('');
          setPinError(false);
        }, 1000);
      }
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--brand-navy)',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '30px 48px',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        userSelect: 'none',
        border: '6px solid var(--brand-yellow)',
      }}
    >
      {/* Top Bar: Battery & Staff PIN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="pulse-dot" style={{ width: 14, height: 14 }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.06em', color: '#FFFFFF' }}>
            BISTRO ROBOTIQUE ONBOARD
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-yellow)' }}>
            <Battery size={26} color="#FFFF99" />
            <span>{robot.battery_pct}%</span>
          </div>
          <button
            onClick={() => setPinOpen(true)}
            style={{ 
              background: 'var(--brand-yellow)', 
              border: '2px solid var(--brand-navy)', 
              borderRadius: 12, 
              padding: 10, 
              color: 'var(--brand-navy)', 
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)' 
            }}
          >
            <Lock size={20} color="#000066" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Main Face & Interaction Center */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        {/* Animated Robot Eyes in Chalk Yellow with Deep Navy Pupils */}
        <div style={{ display: 'flex', gap: 88, marginBottom: 50 }}>
          {['left', 'right'].map((side) => {
            const isArrived = ['arrived', 'waiting_confirm'].includes(robot.state);
            const isBlocked = robot.state === 'blocked';
            const eyeColor = '#FFFF99';

            return (
              <div
                key={side}
                style={{
                  width: 140,
                  height: isArrived ? 90 : 130,
                  borderRadius: isArrived ? '70px 70px 0 0' : '50%',
                  background: `radial-gradient(circle at 40% 40%, #FFFFFF 0%, ${eyeColor} 65%, #F2F280 100%)`,
                  boxShadow: '0 0 55px rgba(255, 255, 153, 0.75)',
                  transform: isBlocked ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid var(--brand-yellow)'
                }}
              >
                {!isArrived && (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--brand-navy)',
                      boxShadow: '0 0 10px rgba(0, 0, 102, 0.5)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* State Messaging & Prompts */}
        {robot.state === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3.2rem', fontWeight: 900, marginBottom: 10, color: 'var(--brand-yellow)' }}>
              Ready for Delivery
            </h1>
            <p style={{ fontSize: '1.45rem', color: '#E2E8F0', fontWeight: 600 }}>
              Standing by for orders at the kitchen pass
            </p>
          </div>
        )}

        {robot.state === 'going_to_table' && (
          <div style={{ textAlign: 'center', maxWidth: 640, width: '100%' }}>
            <h1 style={{ fontSize: '3.4rem', fontWeight: 900, marginBottom: 12, color: 'var(--brand-yellow)' }}>
              Delivering to Table {robot.current_stop || ''}
            </h1>
            <p style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: 28, fontWeight: 600 }}>
              En route with freshly prepared dishes
            </p>

            <div style={{ width: '100%', height: 18, borderRadius: 12, background: 'rgba(255,255,255,0.15)', overflow: 'hidden', border: '1px solid var(--brand-yellow)' }}>
              <div
                style={{
                  width: '68%',
                  height: '100%',
                  background: 'var(--brand-yellow)',
                  borderRadius: 12,
                  boxShadow: '0 0 15px var(--brand-yellow)',
                }}
              />
            </div>
          </div>
        )}

        {['arrived', 'waiting_confirm'].includes(robot.state) && (
          <div style={{ textAlign: 'center', maxWidth: 680, width: '100%' }}>
            <h1 style={{ fontSize: '3.4rem', fontWeight: 900, marginBottom: 8, color: 'var(--brand-yellow)' }}>
              Table {robot.current_stop}, Your Order is Here! 🍽️
            </h1>
            <p style={{ fontSize: '1.4rem', color: '#FFFFFF', marginBottom: 28, fontWeight: 600 }}>
              Please carefully collect your dishes from the tray.
            </p>

            <button
              onClick={handleDone}
              style={{
                width: 230,
                height: 230,
                borderRadius: '50%',
                background: 'var(--brand-yellow)',
                border: '8px solid #FFFFFF',
                boxShadow: '0 0 60px rgba(255, 255, 153, 0.85)',
                color: 'var(--text-on-yellow)',
                fontSize: '2.5rem',
                fontWeight: 900,
                cursor: 'pointer',
                margin: '0 auto 22px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'scale(1)',
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <CheckCircle2 size={56} color="#000066" strokeWidth={2.5} style={{ marginBottom: 4 }} />
              DONE
            </button>

            <div style={{ fontSize: '1.2rem', color: 'var(--brand-yellow)', fontWeight: 700 }}>
              Auto-departure in <strong style={{ color: '#FFFFFF' }}>{countdown}s</strong>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 14 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStarRating(s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: s <= guestStars ? 'var(--brand-yellow)' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <Star size={38} fill={s <= guestStars ? 'var(--brand-yellow)' : 'none'} stroke="var(--brand-yellow)" strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
        )}

        {robot.state === 'blocked' && (
          <div style={{ textAlign: 'center', maxWidth: 600 }}>
            <div style={{ display: 'inline-flex', padding: 22, borderRadius: '50%', background: 'rgba(255, 255, 153, 0.2)', marginBottom: 20, border: '2px solid var(--brand-yellow)' }}>
              <AlertTriangle size={64} color="#FFFF99" />
            </div>
            <h1 style={{ fontSize: '3.2rem', fontWeight: 900, marginBottom: 12, color: 'var(--brand-yellow)' }}>
              "Excuse me, may I pass?"
            </h1>
            <p style={{ fontSize: '1.4rem', color: '#E2E8F0', fontWeight: 600 }}>
              Obstacle detected in path. Waiting for clearance...
            </p>
          </div>
        )}

        {['docking', 'charging', 'going_home'].includes(robot.state) && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: 22, borderRadius: '50%', background: 'rgba(255, 255, 153, 0.2)', marginBottom: 20, border: '2px solid var(--brand-yellow)' }}>
              <Zap size={64} color="#FFFF99" />
            </div>
            <h1 style={{ fontSize: '3.2rem', fontWeight: 900, marginBottom: 12, color: 'var(--brand-yellow)' }}>
              {robot.state === 'docking' ? 'Recharging at Base Station' : 'Returning to Home Base'}
            </h1>
            <p style={{ fontSize: '1.4rem', color: '#E2E8F0', fontWeight: 600 }}>
              Battery Level at {robot.battery_pct}%
            </p>
          </div>
        )}
      </div>

      {/* Bottom footer */}
      <div style={{ textAlign: 'center', color: 'var(--brand-yellow)', fontSize: '0.95rem', fontWeight: 700 }}>
        Bistro Robotique Kiosk • Tap screen to interact
      </div>

      {/* Staff PIN Overlay */}
      {pinOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,102,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ width: 330, background: '#FFFFFF', padding: 30, borderRadius: 24, border: '3px solid var(--brand-navy)', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--brand-navy)', marginBottom: 6 }}>Staff Access</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20 }}>Enter 4-digit PIN (Default: 1234)</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: pin.length > idx ? 'var(--brand-navy)' : 'var(--bg-primary)',
                    border: '2px solid var(--brand-navy)',
                  }}
                />
              ))}
            </div>

            {pinError && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 700, marginBottom: 14 }}>Incorrect PIN. Try again.</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => handlePinSubmit(n.toString())}
                  style={{ height: 52, borderRadius: 12, background: 'var(--bg-primary)', border: '2px solid var(--brand-navy)', color: 'var(--brand-navy)', fontSize: '1.4rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  {n}
                </button>
              ))}
              <button onClick={() => setPin('')} style={{ height: 52, borderRadius: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                Clear
              </button>
              <button onClick={() => handlePinSubmit('0')} style={{ height: 52, borderRadius: 12, background: 'var(--bg-primary)', border: '2px solid var(--brand-navy)', color: 'var(--brand-navy)', fontSize: '1.4rem', fontWeight: 800, cursor: 'pointer' }}>
                0
              </button>
              <button onClick={() => setPinOpen(false)} style={{ height: 52, borderRadius: 12, background: 'var(--brand-navy)', border: 'none', color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
