import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Clock, CheckCircle2, ChevronRight, Plus, Minus, X, Sparkles, AlertCircle, Utensils } from 'lucide-react';
import { fetchCategories, fetchMenuItems, fetchOrders, createOrder, submitRating, connectWebSocket } from './api';
import confetti from 'canvas-confetti';
import './index.css';

export default function App() {
  const [tableNumber, setTableNumber] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('table')) || 1;
  });

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [hasRated, setHasRated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, items, orders] = await Promise.all([
          fetchCategories(),
          fetchMenuItems(),
          fetchOrders(),
        ]);
        setCategories(cats);
        setMenuItems(items);

        const tableOrders = orders.filter(o => o.table_id === tableNumber);
        if (tableOrders.length > 0) {
          const latest = tableOrders[0];
          if (latest.status !== 'cancelled') {
            setActiveOrder(latest);
            if (latest.rating) {
              setRating(latest.rating);
              setHasRated(true);
            }
          }
        }
      } catch (err) {
        console.error('Error loading menu:', err);
      }
    }
    loadData();

    const cleanup = connectWebSocket((msg) => {
      if (msg.type === 'order_status' && activeOrder && msg.data.id === activeOrder.id) {
        setActiveOrder(msg.data);
        if (msg.data.status === 'delivered') {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        }
      }
    });

    return cleanup;
  }, [tableNumber]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const order = await createOrder(tableNumber, cart, notes);
      setActiveOrder(order);
      setCart([]);
      setIsCartOpen(false);
      setHasRated(false);
      confetti({ particleCount: 50, spread: 50 });
    } catch (err) {
      alert('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRating = async (stars) => {
    if (!activeOrder || hasRated) return;
    setRating(stars);
    try {
      await submitRating(activeOrder.id, stars);
      setHasRated(true);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    } catch (err) {
      console.error(err);
    }
  };

  const displayedItems = selectedCat
    ? menuItems.filter((i) => i.category_id === selectedCat)
    : menuItems;

  const getStatusStep = (status) => {
    const steps = ['received', 'preparing', 'on_the_way', 'delivered'];
    return steps.indexOf(status);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="top-nav">
        <div className="nav-brand">
          <div className="nav-logo-icon">
            <Utensils size={22} color="#000066" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Bistro Robotique</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--brand-yellow)', fontWeight: 600 }}>Guest Digital Menu</div>
          </div>
        </div>

        <div className="robot-badge">
          <div className="pulse-dot"></div>
          <span>Table {tableNumber}</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '24px 16px 110px' }} className="animate-fade-in">
        {/* Header Banner */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: 20, textAlign: 'center', position: 'relative' }}>
          <div 
            className="badge-yellow"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '5px 14px', fontSize: '0.85rem' }}
          >
            <Sparkles size={14} color="#000066" /> Autonomous Robot Delivery
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: 6 }}>
            Bistro Robotique
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Browse the gourmet menu, order from your phone, and our delivery robot will bring it to your table.
          </p>

          {/* Table Selector */}
          <div 
            style={{ 
              marginTop: 14, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8, 
              background: 'var(--bg-primary)', 
              padding: '6px 16px', 
              borderRadius: 20,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Your Table:</span>
            <select
              value={tableNumber}
              onChange={(e) => setTableNumber(parseInt(e.target.value))}
              style={{ 
                background: 'transparent', 
                color: 'var(--brand-navy)', 
                border: 'none', 
                fontWeight: 800, 
                fontSize: '0.98rem', 
                cursor: 'pointer', 
                outline: 'none' 
              }}
            >
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1} style={{ background: '#FFFFFF', color: '#000066' }}>
                  Table {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Order Tracker */}
        {activeOrder && activeOrder.status !== 'cancelled' && (
          <div 
            className="glass-panel" 
            style={{ 
              padding: 20, 
              marginBottom: 22, 
              border: '2px solid var(--brand-navy)', 
              background: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--brand-navy)' }}>
                Active Order #{activeOrder.id} (Table {tableNumber})
              </span>
              <span className="badge-yellow">
                {activeOrder.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '22px 10px 12px' }}>
              {['Received', 'Preparing', 'On Way', 'Delivered'].map((step, idx) => {
                const currentStep = getStatusStep(activeOrder.status);
                const isDone = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isDone ? 'var(--brand-navy)' : 'var(--bg-primary)',
                        color: isDone ? 'var(--brand-yellow)' : 'var(--text-faint)',
                        border: isCurrent ? '3px solid var(--brand-yellow)' : isDone ? '2px solid var(--brand-navy)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        boxShadow: isCurrent ? '0 0 12px rgba(255, 255, 153, 0.9)' : 'none',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.78rem', 
                        marginTop: 8, 
                        color: isDone ? 'var(--brand-navy)' : 'var(--text-faint)', 
                        fontWeight: isDone ? 700 : 500 
                      }}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Delivered Rating Section */}
            {activeOrder.status === 'delivered' && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-navy)', marginBottom: 10 }}>
                  {hasRated ? 'Thank you for your rating! ⭐' : 'How was your delivery service?'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleRating(s)}
                      disabled={hasRated}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: hasRated ? 'default' : 'pointer',
                        padding: 4,
                        color: s <= rating ? '#B45309' : '#CBD5E1',
                        transform: s <= rating ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <Star 
                        size={28} 
                        fill={s <= rating ? 'var(--brand-yellow)' : 'none'} 
                        stroke={s <= rating ? 'var(--brand-navy)' : '#94A3B8'}
                        strokeWidth={2}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 18 }}>
          <button
            onClick={() => setSelectedCat(null)}
            style={{
              padding: '7px 18px',
              borderRadius: 99,
              border: selectedCat === null ? '2px solid var(--brand-navy)' : '1px solid var(--border-subtle)',
              background: selectedCat === null ? 'var(--brand-yellow)' : '#FFFFFF',
              color: selectedCat === null ? 'var(--text-on-yellow)' : 'var(--brand-navy)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: selectedCat === null ? 'var(--shadow-yellow)' : 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            All Items
          </button>
          {categories.map((c) => {
            const isActive = selectedCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 99,
                  border: isActive ? '2px solid var(--brand-navy)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'var(--brand-yellow)' : '#FFFFFF',
                  color: isActive ? 'var(--text-on-yellow)' : 'var(--brand-navy)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? 'var(--shadow-yellow)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Menu Item Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {displayedItems.map((item) => {
            const inCart = cart.find((i) => i.id === item.id);
            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 20px',
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: 4 }}>
                    {item.name}
                  </h3>
                  {item.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 10, lineHeight: 1.35 }}>
                      {item.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
                      ${item.price.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color="var(--brand-navy)" /> ~{item.prep_minutes} min
                    </span>
                  </div>
                </div>

                <div>
                  {inCart ? (
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8, 
                        background: 'var(--brand-navy)', 
                        padding: '4px 8px', 
                        borderRadius: 20 
                      }}
                    >
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          border: 'none', 
                          background: 'rgba(255,255,255,0.15)', 
                          color: '#FFFFFF', 
                          cursor: 'pointer' 
                        }}
                      >
                        <Minus size={14} style={{ margin: 'auto' }} />
                      </button>
                      <span style={{ fontWeight: 800, minWidth: 18, textAlign: 'center', color: '#FFFFFF' }}>
                        {inCart.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          border: 'none', 
                          background: 'var(--brand-yellow)', 
                          color: 'var(--text-on-yellow)', 
                          fontWeight: 800, 
                          cursor: 'pointer' 
                        }}
                      >
                        <Plus size={14} style={{ margin: 'auto' }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 18px', fontSize: '0.9rem', borderRadius: 20 }}
                    >
                      Add +
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Cart Bar */}
        {cartCount > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 32px)',
              maxWidth: 620,
              zIndex: 90,
            }}
          >
            <div
              onClick={() => setIsCartOpen(true)}
              style={{
                backgroundColor: 'var(--brand-navy)',
                borderRadius: 16,
                padding: '14px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 102, 0.35)',
                cursor: 'pointer',
                color: '#FFFFFF',
                border: '2px solid var(--brand-yellow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div 
                  style={{ 
                    background: 'var(--brand-yellow)', 
                    color: 'var(--text-on-yellow)', 
                    padding: '6px 14px', 
                    borderRadius: 20, 
                    fontWeight: 800 
                  }}
                >
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Review Table Order</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1.2rem', color: 'var(--brand-yellow)' }}>
                ${cartTotal.toFixed(2)}
                <ChevronRight size={20} color="#FFFFFF" />
              </div>
            </div>
          </div>
        )}

        {/* Cart Drawer Modal */}
        {isCartOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,102,0.45)',
              backdropFilter: 'blur(6px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 640,
                margin: '0 auto',
                background: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: '24px 24px 32px',
                border: '2px solid var(--brand-navy)',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 -8px 30px rgba(0,0,102,0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
                  Your Table {tableNumber} Order
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {cart.map((item) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--brand-navy)' }}>{item.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>${item.price.toFixed(2)} each</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          border: '1px solid var(--border-subtle)', 
                          background: 'var(--bg-primary)', 
                          color: 'var(--brand-navy)', 
                          cursor: 'pointer' 
                        }}
                      >
                        <Minus size={14} style={{ margin: 'auto' }} />
                      </button>
                      <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center', color: 'var(--brand-navy)' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          border: 'none', 
                          background: 'var(--brand-yellow)', 
                          color: 'var(--text-on-yellow)', 
                          fontWeight: 800, 
                          cursor: 'pointer' 
                        }}
                      >
                        <Plus size={14} style={{ margin: 'auto' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--brand-navy)', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  Special instructions for kitchen / robot:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Extra cutlery, sauce on the side, allergies..."
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    color: 'var(--text-body)',
                    padding: 10,
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div 
                style={{ 
                  borderTop: '2px solid var(--border-subtle)', 
                  paddingTop: 14, 
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)' }}>Order Total:</span>
                <span 
                  style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: 900, 
                    color: 'var(--brand-navy)',
                    background: 'var(--brand-yellow)',
                    padding: '4px 14px',
                    borderRadius: 8,
                  }}
                >
                  ${cartTotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: '1.05rem', fontWeight: 800 }}
              >
                {submitting ? 'Placing Order...' : 'Send Order to Kitchen 🚀'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
