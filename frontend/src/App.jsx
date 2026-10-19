import React, { useState, useEffect } from 'react';
import { Bot, Utensils, ChefHat, Tv, Settings, ArrowLeft, Grid } from 'lucide-react';
import CustomerMenu from './screens/CustomerMenu';
import KitchenBoard from './screens/KitchenBoard';
import ChefPanel from './screens/ChefPanel';
import RobotKiosk from './screens/RobotKiosk';
import AdminDashboard from './screens/AdminDashboard';
import ScreenPortal from './screens/ScreenPortal';
import { fetchRobotStatus, connectWebSocket } from './api';

export default function App() {
  // Determine screen from URL path or query parameter
  const [currentScreen, setCurrentScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    const path = window.location.pathname.replace('/', '').toLowerCase();

    const validScreens = ['menu', 'kitchen', 'chef', 'robot', 'admin', 'portal'];
    if (validScreens.includes(screenParam)) return screenParam;
    if (validScreens.includes(path)) return path;
    return 'portal'; // Default to portal hub
  });

  const [robotStatus, setRobotStatus] = useState(null);

  useEffect(() => {
    fetchRobotStatus().then(setRobotStatus);

    const cleanup = connectWebSocket((msg) => {
      if (msg.type === 'robot_status') {
        setRobotStatus((prev) => ({ ...prev, ...msg.data }));
      }
    });

    return cleanup;
  }, []);

  const handleNav = (screen) => {
    setCurrentScreen(screen);
    const url = new URL(window.location);
    if (screen === 'portal') {
      url.searchParams.delete('screen');
    } else {
      url.searchParams.set('screen', screen);
    }
    window.history.pushState({}, '', url);
  };

  // 1. DEDICATED ROBOT KIOSK SCREEN (Runs on Raspberry Pi 5 touchscreen on the robot body)
  if (currentScreen === 'robot') {
    return (
      <div>
        <RobotKiosk />
        <button
          onClick={() => handleNav('portal')}
          style={{
            position: 'fixed',
            bottom: 14,
            right: 14,
            zIndex: 10001,
            background: 'var(--brand-yellow)',
            border: '2px solid var(--brand-navy)',
            color: 'var(--text-on-yellow)',
            fontWeight: 800,
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          Exit Kiosk
        </button>
      </div>
    );
  }

  // 2. DEDICATED GUEST MENU WEBSITE (Runs on customer phones via QR code)
  if (currentScreen === 'menu') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
        {/* Minimal Customer Header */}
        <header
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--brand-navy)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid var(--brand-yellow)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="nav-logo-icon" style={{ width: 34, height: 34 }}>
              <Bot size={20} color="#000066" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF' }}>BISTRO ROBOTIQUE</div>
              <div style={{ fontSize: '0.72rem', color: '#FFFF99', fontWeight: 600 }}>Guest Mobile Ordering</div>
            </div>
          </div>

          <button
            onClick={() => handleNav('portal')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Grid size={14} color="#FFFF99" />
            <span>All Screens</span>
          </button>
        </header>

        <main style={{ flex: 1 }}>
          <CustomerMenu />
        </main>
      </div>
    );
  }

  // 3. DEDICATED KITCHEN DISPLAY SYSTEM (Runs on Kitchen TV in full screen)
  if (currentScreen === 'kitchen') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
        <header
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--brand-navy)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid var(--brand-yellow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nav-logo-icon" style={{ width: 36, height: 36 }}>
              <Tv size={20} color="#000066" strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>KITCHEN DISPLAY TV (KDS)</div>
              <div style={{ fontSize: '0.72rem', color: '#FFFF99', fontWeight: 600 }}>Automated Order Station</div>
            </div>
          </div>

          <button
            onClick={() => handleNav('portal')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Grid size={14} color="#FFFF99" />
            <span>All Screens</span>
          </button>
        </header>

        <main style={{ flex: 1 }}>
          <KitchenBoard />
        </main>
      </div>
    );
  }

  // 4. DEDICATED CHEF PASS STATION (Runs on Pass Tablet)
  if (currentScreen === 'chef') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
        <header
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--brand-navy)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid var(--brand-yellow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nav-logo-icon" style={{ width: 36, height: 36 }}>
              <ChefHat size={20} color="#000066" strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>CHEF PASS STATION</div>
              <div style={{ fontSize: '0.72rem', color: '#FFFF99', fontWeight: 600 }}>Plating &amp; Robot Dispatch</div>
            </div>
          </div>

          <button
            onClick={() => handleNav('portal')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Grid size={14} color="#FFFF99" />
            <span>All Screens</span>
          </button>
        </header>

        <main style={{ flex: 1 }}>
          <ChefPanel />
        </main>
      </div>
    );
  }

  // 5. DEDICATED ADMIN OPERATIONS & TELEOP (Runs on Management PC / Workstation)
  if (currentScreen === 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
        <header
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--brand-navy)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid var(--brand-yellow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nav-logo-icon" style={{ width: 36, height: 36 }}>
              <Settings size={20} color="#000066" strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>ROBOT OPERATIONS &amp; ADMIN</div>
              <div style={{ fontSize: '0.72rem', color: '#FFFF99', fontWeight: 600 }}>Teleop • Floor Map • Fleet Telemetry</div>
            </div>
          </div>

          <button
            onClick={() => handleNav('portal')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Grid size={14} color="#FFFF99" />
            <span>All Screens</span>
          </button>
        </header>

        <main style={{ flex: 1 }}>
          <AdminDashboard />
        </main>
      </div>
    );
  }

  // 6. DEFAULT LAUNCHER PORTAL (Root hub to select and launch any screen)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="top-nav">
        <div className="nav-brand">
          <div className="nav-logo-icon">
            <Bot size={24} color="#000066" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em', color: '#FFFFFF' }}>
              BISTRO ROBOTIQUE
            </div>
            <div style={{ fontSize: '0.72rem', color: '#FFFF99', fontWeight: 600 }}>
              Multi-Screen Deployment Hub
            </div>
          </div>
        </div>

        {robotStatus && (
          <div className="robot-badge">
            <div className="pulse-dot" />
            <span>ROBOT {robotStatus.state.toUpperCase().replace('_', ' ')}</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span>{robotStatus.battery_pct}%</span>
          </div>
        )}
      </header>

      <main style={{ flex: 1 }}>
        <ScreenPortal onSelectScreen={handleNav} />
      </main>

      <footer
        style={{
          backgroundColor: 'var(--brand-navy)',
          color: '#E2E8F0',
          padding: '16px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '2px solid var(--brand-yellow)',
          fontSize: '0.85rem',
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--brand-yellow)', fontWeight: 700 }}>●</span>
          <span>Bistro Robotique • Standalone Screen Architecture</span>
        </div>
        <div style={{ color: 'var(--brand-yellow)', fontWeight: 600 }}>
          Deep Navy Blue (#000066) &amp; Chalk Yellow (#FFFF99)
        </div>
      </footer>
    </div>
  );
}
