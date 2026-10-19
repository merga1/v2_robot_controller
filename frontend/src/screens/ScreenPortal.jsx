import React, { useState, useEffect } from 'react';
import { 
  Bot, Utensils, ChefHat, Tv, Settings, 
  ExternalLink, Smartphone, Monitor, Tablet, CheckCircle, Battery, Zap 
} from 'lucide-react';
import { fetchRobotStatus } from '../api';

export default function ScreenPortal({ onSelectScreen }) {
  const [robotStatus, setRobotStatus] = useState(null);

  useEffect(() => {
    fetchRobotStatus().then(setRobotStatus);
  }, []);

  const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';

  const screens = [
    {
      id: 'menu',
      title: 'Guest Mobile Menu',
      port: 5174,
      device: 'Guest Smartphones (Table QR Code)',
      icon: Utensils,
      deviceIcon: Smartphone,
      description: 'Digital ordering web app opened via QR code at dining tables. Category browsing, dish ordering, live 4-stage tracking, and star rating.',
      url: `http://${host}:5174`,
      badge: 'Guest Facing',
      badgeColor: 'var(--brand-yellow)',
      badgeText: 'var(--text-on-yellow)',
      securityTag: 'Zero staff/admin code in bundle',
    },
    {
      id: 'kitchen',
      title: 'Kitchen Display System (KDS)',
      port: 5175,
      device: 'Kitchen TV (Wall-Mounted Full Screen)',
      icon: Tv,
      deviceIcon: Monitor,
      description: 'Dedicated 4-column TV kanban board (New, Preparing, Ready, On Way) with audio chime alerts, waiting timers, and aging visual warnings.',
      url: `http://${host}:5175`,
      badge: 'Kitchen TV',
      badgeColor: 'var(--brand-navy)',
      badgeText: '#FFFFFF',
      securityTag: 'Isolated Kitchen Display',
    },
    {
      id: 'chef',
      title: 'Chef Pass Station',
      port: 5176,
      device: 'Chef Tablet (At Kitchen Pass Counter)',
      icon: ChefHat,
      deviceIcon: Tablet,
      description: 'Pass station interface to select table stop sequence (e.g., Table 5 then Table 2), call robot to pass, and dispatch delivery missions.',
      url: `http://${host}:5176`,
      badge: 'Pass Tablet',
      badgeColor: 'var(--brand-navy)',
      badgeText: '#FFFFFF',
      securityTag: 'Isolated Dispatch Control',
    },
    {
      id: 'robot',
      title: 'Robot Touch Screen Kiosk',
      port: 5177,
      device: 'Robot Body Screen (Raspberry Pi 5 Touchscreen)',
      icon: Bot,
      deviceIcon: Tablet,
      description: 'On-board kiosk with reactive animated eyes, meal arrival alerts, giant high-contrast DONE button, auto-countdown, and staff PIN keypad.',
      url: `http://${host}:5177`,
      badge: 'Onboard Pi 5',
      badgeColor: 'var(--brand-yellow)',
      badgeText: 'var(--text-on-yellow)',
      securityTag: 'Secured with Staff PIN Pad',
    },
    {
      id: 'admin',
      title: 'Admin Operations & Teleop',
      port: 5178,
      device: 'Manager Workstation / Tablet',
      icon: Settings,
      deviceIcon: Monitor,
      description: 'Central operations console with 10 Hz virtual drive pad, real-time 2D floor plan map, operating mode switch, volume, metrics, and live MQTT log.',
      url: `http://${host}:5178`,
      badge: 'Operations',
      badgeColor: 'var(--brand-navy)',
      badgeText: '#FFFFFF',
      securityTag: 'Manager Only with Teleop Controls',
    },
  ];

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '36px 20px 80px' }} className="animate-fade-in">
      {/* Hero Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '36px 32px', 
          marginBottom: 32, 
          textAlign: 'center', 
          border: '2px solid var(--brand-navy)',
          background: '#FFFFFF',
          boxShadow: 'var(--shadow-elevated)'
        }}
      >
        <div 
          className="badge-yellow"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '6px 16px', fontSize: '0.88rem' }}
        >
          <Bot size={16} color="#000066" /> Multi-Host Security Architecture
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--brand-navy)', marginBottom: 10 }}>
          Bistro Robotique Multi-Host Launcher
        </h1>
        <p style={{ color: 'var(--text-body)', fontSize: '1.05rem', maxWidth: 780, margin: '0 auto 16px', lineHeight: 1.55 }}>
          To ensure <strong>maximum operational security and data isolation</strong>, each screen runs as a completely <strong>separate website on its own host port</strong> with an independent build bundle.
        </p>

        <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ backgroundColor: 'var(--surface-light)', border: '1px solid var(--border-subtle)', padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-navy)' }}>
            🔒 5 Isolated Frontend Builds
          </span>
          <span style={{ backgroundColor: 'var(--surface-light)', border: '1px solid var(--border-subtle)', padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-navy)' }}>
            🌐 Dedicated Host Ports (5174 - 5178)
          </span>
          <span style={{ backgroundColor: 'var(--surface-light)', border: '1px solid var(--border-subtle)', padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-navy)' }}>
            ⚡ Single Shared FastAPI Backend (:8000)
          </span>
        </div>

        {robotStatus && (
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '8px 20px', borderRadius: 99, background: 'var(--brand-navy)', color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                <div className="pulse-dot" />
                <span style={{ fontWeight: 700 }}>Robot: {robotStatus.state.toUpperCase().replace('_', ' ')}</span>
              </div>
              <span style={{ color: 'var(--brand-yellow)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand-yellow)', fontWeight: 800, fontSize: '0.85rem' }}>
                <Battery size={15} /> {robotStatus.battery_pct}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of the 5 Independent Websites */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 24 }}>
        {screens.map((s) => {
          const Icon = s.icon;
          const DeviceIcon = s.deviceIcon;

          return (
            <div
              key={s.id}
              className="glass-panel"
              style={{
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '2px solid var(--border-subtle)',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
              }}
            >
              <div>
                {/* Header row with badge and port */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div 
                    style={{ 
                      width: 50, 
                      height: 50, 
                      borderRadius: 14, 
                      backgroundColor: 'var(--brand-navy)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,102,0.2)' 
                    }}
                  >
                    <Icon size={26} color="#FFFF99" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span 
                      style={{ 
                        backgroundColor: s.badgeColor, 
                        color: s.badgeText, 
                        padding: '4px 12px', 
                        borderRadius: 20, 
                        fontWeight: 800, 
                        fontSize: '0.78rem',
                        border: '1px solid rgba(0,0,102,0.15)' 
                      }}
                    >
                      {s.badge}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: 'var(--brand-navy)', background: 'var(--surface-light)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                      Port {s.port}
                    </span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: 4 }}>
                  {s.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>
                  <DeviceIcon size={14} color="var(--brand-navy)" />
                  <span>Runs on: {s.device}</span>
                </div>

                <div style={{ display: 'inline-block', backgroundColor: 'rgba(0,0,102,0.05)', color: 'var(--brand-navy)', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, marginBottom: 14 }}>
                  🔒 {s.securityTag}
                </div>

                <p style={{ color: 'var(--text-body)', fontSize: '0.9rem', lineHeight: 1.45, marginBottom: 20 }}>
                  {s.description}
                </p>
              </div>

              {/* Launch Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 18px', fontSize: '0.92rem', borderRadius: 10, textDecoration: 'none' }}
                >
                  <span>Launch Independent Site (:{s.port})</span>
                  <ExternalLink size={16} color="#FFFF99" />
                </a>
                <button
                  onClick={() => onSelectScreen(s.id)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: 8 }}
                >
                  Preview Inside Portal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

