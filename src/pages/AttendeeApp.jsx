import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useVenueStore } from '../store.js';
import { WaitTimeBadge, OrderStatusStepper, SkeletonCard, ConnectionBar } from '../components/UI.jsx';
import { formatWaitTime, formatCents, getWaitLevel, timeAgo, getNearestZone } from '../utils.js';

const VENUE_ID = 'venue-001';
const SEAT = { section: '114', row: 'G', number: '22' };

// ================================================================
// HOME SCREEN — Live concession list
// ================================================================
function HomeScreen({ onSelectStand, onViewOrder, activeOrderId }) {
  const { stands, connectionStatus } = useVenueStore();
  const loading = stands.length === 0;
  const [sortBy, setSortBy] = useState('wait'); // 'wait' | 'zone' | 'nearest'

  const nearestZone = getNearestZone(SEAT.section);

  const sortedStands = React.useMemo(() => {
    return [...stands].sort((a, b) => {
      if (sortBy === 'wait') {
        if (a.isOpen !== b.isOpen) return b.isOpen - a.isOpen;
        return a.waitSeconds - b.waitSeconds;
      }
      if (sortBy === 'nearest') {
        const aNear = a.zoneId === nearestZone ? 0 : 1;
        const bNear = b.zoneId === nearestZone ? 0 : 1;
        if (aNear !== bNear) return aNear - bNear;
        return a.waitSeconds - b.waitSeconds;
      }
      return a.name.localeCompare(b.name);
    });
  }, [stands, sortBy, nearestZone]);

  return (
    <>
      <div className="a-hero">
        <div className="a-seat-chip">
          🪑 Section {SEAT.section} · Row {SEAT.row} · Seat {SEAT.number}
        </div>
        <div className="a-venue-name">MetroLife Arena</div>
        <div className="a-game-info">Chicago Fire vs FC Dallas · Q3 · 58:22</div>
        <div className="a-live-row">
          <span className="live-dot" />
          <span className="a-live-label">Live updates</span>
          {connectionStatus !== 'connected' && (
            <span style={{ fontSize: '0.72rem', color: 'var(--status-elevated)', marginLeft: 8 }}>
              {connectionStatus === 'connecting' ? '⟳ Syncing…' : '⚠ Offline'}
            </span>
          )}
        </div>
      </div>

      <div className="a-content">
        {/* Active order banner */}
        {activeOrderId && (
          <button
            onClick={onViewOrder}
            style={{
              width: '100%', padding: '12px 16px', marginBottom: 16,
              background: 'rgba(79,140,255,0.1)', border: '1px solid rgba(79,140,255,0.3)',
              borderRadius: 'var(--r-lg)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>🛵</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Order #{activeOrderId} active</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tap to track your order</div>
              </div>
            </div>
            <span style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>›</span>
          </button>
        )}

        {/* Sort controls */}
        <div className="sort-bar">
          {[['wait', '⚡ Shortest Wait'], ['nearest', '📍 Nearest'], ['zone', '🔤 A–Z']].map(([key, label]) => (
            <button key={key} className={`sort-chip ${sortBy === key ? 'active' : ''}`} onClick={() => setSortBy(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="a-section-title">
          {sortBy === 'nearest' ? `Nearest to Section ${SEAT.section}` : 'All Concession Stands'}
          {' '}· {stands.filter(s => s.isOpen).length} open
        </div>

        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : sortedStands.map(stand => (
              <StandCard
                key={stand.id}
                stand={stand}
                onClick={stand.isOpen ? () => onSelectStand(stand.id) : undefined}
                isNearest={stand.zoneId === nearestZone}
              />
            ))
        }
      </div>

      <ConnectionBar status={connectionStatus} />
    </>
  );
}

const StandCard = React.memo(function StandCard({ stand, onClick, isNearest }) {
  const level = stand.isOpen ? getWaitLevel(stand.waitSeconds) : 'closed';
  return (
    <div className={`stand-card ${level} ${!stand.isOpen ? 'closed' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <span className="stand-icon">{stand.icon || '🍔'}</span>
      <div className="stand-info">
        <div className="stand-name">
          {stand.name}
          {isNearest && stand.isOpen && (
            <span style={{ marginLeft: 6, fontSize: '0.65rem', background: 'rgba(79,140,255,0.15)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: 'var(--r-full)', fontWeight: 600 }}>
              Near you
            </span>
          )}
        </div>
        <div className="stand-meta">{stand.zoneId?.replace('zone-', 'Zone ') ?? 'Zone —'}</div>
        {stand.isOpen && <div className="stand-queue">👥 ~{stand.queueDepth} in queue</div>}
        {!stand.isOpen && <div className="stand-queue" style={{ color: 'var(--text-muted)' }}>Temporarily closed</div>}
      </div>
      {stand.isOpen
        ? <WaitTimeBadge seconds={stand.waitSeconds} />
        : <span className="badge badge-offline">Closed</span>
      }
      {stand.isOpen && <span style={{ color: 'var(--text-muted)', fontSize: '1rem', marginLeft: 2 }}>›</span>}
    </div>
  );
});

// ================================================================
// STAND DETAIL — Menu + Add to cart
// ================================================================
function StandDetailScreen({ standId, onBack, onCheckout }) {
  const { stands } = useVenueStore();
  const stand = stands.find(s => s.id === standId);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({}); // { menuItemId: quantity }
  const [loadingMenu, setLoadingMenu] = useState(true);

  useEffect(() => {
    setLoadingMenu(true);
    fetch(`/api/v1/venues/${VENUE_ID}/menu/${standId}`)
      .then(r => r.json())
      .then(data => { setMenu(data.items || []); setLoadingMenu(false); })
      .catch(() => setLoadingMenu(false));
  }, [standId]);

  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);
  const totalCents = menu.reduce((s, item) => s + (item.priceCents * (cart[item.id] || 0)), 0);

  const addItem = (id) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeItem = (id) => setCart(c => {
    const next = { ...c };
    if (next[id] > 1) next[id]--; else delete next[id];
    return next;
  });

  if (!stand) return null;

  return (
    <>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack} aria-label="Go back">‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stand.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Menu</div>
        </div>
        <WaitTimeBadge seconds={stand.waitSeconds} />
      </div>

      <div className="detail-hero">
        <div className="detail-icon">{stand.icon || '🍔'}</div>
        <div className="detail-title">
          <h2>{stand.name}</h2>
          <p>~{stand.queueDepth} people · {formatWaitTime(stand.waitSeconds)} wait</p>
          <p style={{ marginTop: 4 }}>Delivers to Section {SEAT.section}, Row {SEAT.row}, Seat {SEAT.number}</p>
        </div>
      </div>

      <div className="menu-section" style={{ paddingBottom: totalItems > 0 ? 120 : 24 }}>
        <div className="a-section-title" style={{ marginTop: 0, marginBottom: 12 }}>Select Items</div>
        {loadingMenu
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: '80%', height: 11 }} />
                </div>
                <div className="skeleton" style={{ width: 52, height: 32, borderRadius: 8 }} />
              </div>
            ))
          : menu.map(item => (
              <div key={item.id} className="menu-item">
                <div className="menu-item-info">
                  <div className="menu-item-name">{item.name}</div>
                  <div className="menu-item-desc">{item.description}</div>
                </div>
                <div className="menu-item-price">{formatCents(item.priceCents)}</div>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => removeItem(item.id)} disabled={!(cart[item.id] > 0)} aria-label={`Remove ${item.name}`}>−</button>
                  <span className="qty-value">{cart[item.id] || 0}</span>
                  <button className="qty-btn" onClick={() => addItem(item.id)} aria-label={`Add ${item.name}`}>+</button>
                </div>
              </div>
            ))
        }
      </div>

      {totalItems > 0 && (
        <div className="cart-bar">
          <div className="cart-summary">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
            <span className="cart-total">{formatCents(totalCents)}</span>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => onCheckout({ standId: stand.id, standName: stand.name, menu, cart, totalCents })}
          >
            Review Order · {formatCents(totalCents)}
          </button>
        </div>
      )}
    </>
  );
}

// ================================================================
// CHECKOUT SCREEN
// ================================================================
function CheckoutScreen({ orderData, onBack, onConfirm }) {
  const { standId, menu, cart, totalCents } = orderData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cartItems = menu
    .filter(item => cart[item.id] > 0)
    .map(item => ({ ...item, quantity: cart[item.id] }));

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/venues/${VENUE_ID}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standId,
          seatSection: SEAT.section,
          seatRow: SEAT.row,
          seatNumber: SEAT.number,
          items: cartItems.map(i => ({ menuItemId: i.id, name: i.name, quantity: i.quantity, priceCents: i.priceCents })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order failed');
      onConfirm(data);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack} aria-label="Go back">‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Review Order</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{orderData.standName}</div>
        </div>
      </div>

      <div className="checkout-section">
        <div className="a-section-title" style={{ marginTop: 0 }}>Deliver to</div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>🪑</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Section {SEAT.section}, Row {SEAT.row}, Seat {SEAT.number}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lower Bowl West · MetroLife Arena</div>
            </div>
          </div>
        </div>

        <div className="a-section-title">Order Summary</div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 20 }}>
          {cartItems.map(item => (
            <div key={item.id} className="order-summary-row">
              <span>{item.quantity}× {item.name}</span>
              <span style={{ fontWeight: 600 }}>{formatCents(item.priceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="order-summary-row total">
            <span>Total</span>
            <span>{formatCents(totalCents)}</span>
          </div>
        </div>

        <div className="a-section-title">Payment</div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>💳</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>•••• •••• •••• 4242</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visa · Expires 09/27</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--status-normal)' }}>✓ Saved</span>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--status-critical-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--status-critical)' }}>
            ⚠ {error}
          </div>
        )}

        <button className="btn btn-primary btn-lg" onClick={handleConfirm} disabled={loading}>
          {loading ? <><span className="animate-spin" style={{ display: 'inline-block' }}>⟳</span> Placing Order…</> : `Place Order · ${formatCents(totalCents)}`}
        </button>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
          Estimated delivery: {formatWaitTime(120)} after confirmation
        </p>
      </div>
    </>
  );
}

// ================================================================
// ORDER TRACKING SCREEN
// ================================================================
function OrderTrackingScreen({ orderId, onBack, onDone }) {
  const { orders } = useVenueStore();
  const order = orders[orderId];
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!order || order.status === 'delivered') return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [order?.status]);

  if (!order) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⟳</div>
        <p>Loading order…</p>
      </div>
    );
  }

  const statusMessages = {
    confirmed:  { emoji: '✅', text: 'Order Confirmed!',   sub: 'Your order has been received' },
    preparing:  { emoji: '👨‍🍳', text: 'Being Prepared',    sub: 'Our chefs are on it' },
    delivering: { emoji: '🛵', text: 'On the Way!',         sub: 'Heading to your seat' },
    delivered:  { emoji: '🎉', text: 'Delivered!',          sub: 'Enjoy the game!' },
    cancelled:  { emoji: '❌', text: 'Order Cancelled',     sub: 'Please contact the stand' },
  };

  const sm = statusMessages[order.status] || statusMessages.confirmed;
  const remaining = Math.max(0, (order.estimatedDeliverySeconds || 300) - elapsed);

  return (
    <>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack} aria-label="Go back">‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Order #{orderId}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.standName}</div>
        </div>
      </div>

      <div className="tracking-hero">
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>{sm.emoji}</div>
        <div className="tracking-status-text">{sm.text}</div>
        <div className="tracking-eta">{sm.sub}</div>
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
            Est. {formatWaitTime(remaining)} remaining
          </div>
        )}
      </div>

      <div className="tracking-section">
        <div style={{ marginBottom: 28 }}>
          <OrderStatusStepper status={order.status} />
        </div>

        <div className="a-section-title">Your Order</div>
        <div className="tracking-items-card">
          {(order.items || []).map((item, i) => (
            <div key={i} className="tracking-item-row">
              <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}× {item.name}</span>
              <span style={{ fontWeight: 600 }}>{formatCents(item.priceCents * item.quantity)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem' }}>🪑</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Section {order.seatSection}, Row {order.seatRow}, Seat {order.seatNumber}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery location</div>
          </div>
        </div>

        {order.status === 'delivered' && (
          <button className="btn btn-secondary btn-lg" style={{ marginTop: 20 }} onClick={onDone}>
            Order Again
          </button>
        )}
      </div>
    </>
  );
}

// ================================================================
// ROOT — Main AttendeeApp
// ================================================================
export default function AttendeeApp() {
  const { setStands, setZones, addOrder } = useVenueStore();

  const [screen, setScreen]               = useState('home');   // 'home' | 'stand' | 'checkout' | 'tracking'
  const [selectedStandId, setStandId]     = useState(null);
  const [checkoutData, setCheckoutData]   = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/venues/${VENUE_ID}/concessions/wait-times`).then(r => r.json()),
      fetch(`/api/v1/venues/${VENUE_ID}/zones/density`).then(r => r.json()),
    ]).then(([standsData, zonesData]) => {
      setStands(standsData.stands);
      setZones(zonesData.zones);
    });
  }, []);

  const handleSelectStand = (id) => { setStandId(id); setScreen('stand'); };
  const handleCheckout    = (data) => { setCheckoutData(data); setScreen('checkout'); };

  const handleOrderConfirmed = (orderResp) => {
    // Seed the store with a minimal order object (it will get enriched by SSE)
    addOrder({
      id: orderResp.orderId,
      standId: checkoutData.standId,
      standName: checkoutData.standName,
      status: orderResp.status,
      seatSection: SEAT.section,
      seatRow: SEAT.row,
      seatNumber: SEAT.number,
      items: checkoutData.menu
        .filter(i => checkoutData.cart[i.id] > 0)
        .map(i => ({ ...i, quantity: checkoutData.cart[i.id] })),
      totalCents: orderResp.totalCents,
      estimatedDeliverySeconds: orderResp.estimatedDeliverySeconds,
      placedAt: orderResp.placedAt,
    });
    setActiveOrderId(orderResp.orderId);
    setScreen('tracking');
  };

  const screenSlide = { animation: 'fade-up 0.25s ease' };

  return (
    <div className="attendee-app">
      {/* Global Header with app-switcher link */}
      <div className="a-header">
        <div className="a-header-logo">
          <span className="a-header-logo-icon">🏟️</span>
          <span className="a-header-logo-text">SmartVenue</span>
        </div>
        <div className="a-header-actions">
          {activeOrderId && screen !== 'tracking' && (
            <button
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-full)', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-normal)', cursor: 'pointer' }}
              onClick={() => setScreen('tracking')}
            >
              🛵 Live
            </button>
          )}
          <Link to="/ops" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '5px 10px' }}>
            Staff →
          </Link>
        </div>
      </div>

      {/* Screens */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', ...screenSlide }}>
        {screen === 'home' && (
          <HomeScreen
            onSelectStand={handleSelectStand}
            onViewOrder={() => setScreen('tracking')}
            activeOrderId={activeOrderId}
          />
        )}
        {screen === 'stand' && (
          <StandDetailScreen
            standId={selectedStandId}
            onBack={() => setScreen('home')}
            onCheckout={handleCheckout}
          />
        )}
        {screen === 'checkout' && checkoutData && (
          <CheckoutScreen
            orderData={checkoutData}
            onBack={() => setScreen('stand')}
            onConfirm={handleOrderConfirmed}
          />
        )}
        {screen === 'tracking' && activeOrderId && (
          <OrderTrackingScreen
            orderId={activeOrderId}
            onBack={() => setScreen('home')}
            onDone={() => { setActiveOrderId(null); setScreen('home'); }}
          />
        )}
      </div>
    </div>
  );
}
