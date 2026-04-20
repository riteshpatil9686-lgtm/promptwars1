import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Serve static frontend assets
app.use(express.static('dist'));

app.use(cors());
app.use(express.json());

// ================================================================
// IN-MEMORY STATE — simulates the database layer
// ================================================================

const VENUE = {
  id: 'venue-001',
  name: 'MetroLife Arena',
  city: 'Chicago',
  capacity: 62500,
  timezone: 'America/Chicago',
};

const ZONES = [
  { id: 'zone-001', name: 'Lower Bowl West',  maxCapacity: 8000,  headCount: 5200 },
  { id: 'zone-002', name: 'Lower Bowl East',  maxCapacity: 8000,  headCount: 6800 },
  { id: 'zone-003', name: 'Upper Deck North', maxCapacity: 12000, headCount: 7400 },
  { id: 'zone-004', name: 'Upper Deck South', maxCapacity: 12000, headCount: 9600 },
  { id: 'zone-005', name: 'Concourse Level',  maxCapacity: 6000,  headCount: 4200 },
  { id: 'zone-006', name: 'VIP Club Level',   maxCapacity: 2500,  headCount: 1100 },
];

const STANDS = [
  { id: 'stand-001', name: 'Gate A Grill',        zoneId: 'zone-001', icon: '🍔', waitSeconds: 180, queueDepth: 15, isOpen: true,  throughput: 5, prevWait: 180 },
  { id: 'stand-002', name: 'East Side Tacos',      zoneId: 'zone-002', icon: '🌮', waitSeconds: 420, queueDepth: 35, isOpen: true,  throughput: 5, prevWait: 480 },
  { id: 'stand-003', name: '50-Yard Franks',       zoneId: 'zone-003', icon: '🌭', waitSeconds: 660, queueDepth: 55, isOpen: true,  throughput: 5, prevWait: 600 },
  { id: 'stand-004', name: 'Upper Deck BBQ',       zoneId: 'zone-003', icon: '🥩', waitSeconds: 240, queueDepth: 20, isOpen: true,  throughput: 5, prevWait: 300 },
  { id: 'stand-005', name: 'South End Subs',       zoneId: 'zone-004', icon: '🥪', waitSeconds: 360, queueDepth: 30, isOpen: true,  throughput: 5, prevWait: 360 },
  { id: 'stand-006', name: 'Concourse Cantina',    zoneId: 'zone-005', icon: '🍹', waitSeconds: 120, queueDepth: 10, isOpen: true,  throughput: 6, prevWait: 180 },
  { id: 'stand-007', name: 'VIP Lounge Bar',       zoneId: 'zone-006', icon: '🍸', waitSeconds: 60,  queueDepth: 5,  isOpen: true,  throughput: 8, prevWait: 60  },
  { id: 'stand-008', name: 'Gate C Grill',         zoneId: 'zone-001', icon: '🥗', waitSeconds: 300, queueDepth: 25, isOpen: true,  throughput: 5, prevWait: 240 },
  { id: 'stand-009', name: 'Field Level Pizza',    zoneId: 'zone-002', icon: '🍕', waitSeconds: 480, queueDepth: 40, isOpen: false, throughput: 5, prevWait: 480 },
  { id: 'stand-010', name: 'North End Nachos',     zoneId: 'zone-004', icon: '🧀', waitSeconds: 150, queueDepth: 12, isOpen: true,  throughput: 6, prevWait: 200 },
];

const DEFAULT_MENU = [
  { id: 'mi-d01', name: 'Hot Dog Combo',     description: 'Hot dog, chips, and a fountain drink', priceCents: 1099 },
  { id: 'mi-d02', name: 'Nachos Supreme',    description: 'Tortilla chips with cheese, jalapeños, salsa', priceCents: 999  },
  { id: 'mi-d03', name: 'Soft Pretzel',      description: 'Warm pretzel with cheese dipping sauce', priceCents: 749  },
  { id: 'mi-d04', name: 'Soda (Large)',       description: '32oz fountain drink, your choice of flavor', priceCents: 449  },
  { id: 'mi-d05', name: 'Draft Beer (16oz)', description: 'Domestic draft beer — ice cold', priceCents: 999  },
];

const STAND_MENUS = {
  'stand-001': [
    { id: 'mi-001-1', name: 'Classic Smash Burger',    description: 'Double smash patty, American cheese, special sauce, pickles', priceCents: 1499 },
    { id: 'mi-001-2', name: 'BBQ Chicken Sandwich',    description: 'Grilled chicken, smoky BBQ, coleslaw, brioche bun', priceCents: 1299 },
    { id: 'mi-001-3', name: 'Arena Loaded Fries',      description: 'Crispy fries, cheese sauce, bacon bits, jalapeños', priceCents: 899  },
    { id: 'mi-001-4', name: 'Fresh Lemonade',          description: 'Freshly squeezed lemonade with mint', priceCents: 499  },
    { id: 'mi-001-5', name: 'Craft Beer (16oz)',        description: 'Rotating local craft selection on draft', priceCents: 1099 },
  ],
  'stand-006': [
    { id: 'mi-006-1', name: 'Margarita (Frozen)',      description: 'Classic lime margarita, frozen to perfection', priceCents: 1399 },
    { id: 'mi-006-2', name: 'Loaded Quesadilla',       description: 'Three-cheese quesadilla with grilled peppers', priceCents: 1099 },
    { id: 'mi-006-3', name: 'Street Tacos (3)',        description: 'Baja-style chicken or beef street tacos', priceCents: 1199 },
    { id: 'mi-006-4', name: 'Fresh Agua Fresca',       description: 'Watermelon, cucumber, or horchata', priceCents: 549  },
  ],
  'stand-007': [
    { id: 'mi-007-1', name: 'Premium Cocktail',        description: 'Curated seasonal cocktail by our mixologist', priceCents: 1799 },
    { id: 'mi-007-2', name: 'Fine Wine (Glass)',       description: 'Curated wine selection, red/white/rosé', priceCents: 1599 },
    { id: 'mi-007-3', name: 'Artisan Charcuterie',    description: 'Chef\'s selection of cured meats and cheeses', priceCents: 2499 },
    { id: 'mi-007-4', name: 'Premium Mocktail',        description: 'Craft non-alcoholic cocktail', priceCents: 899  },
  ],
};

STANDS.forEach(stand => {
  if (!STAND_MENUS[stand.id]) {
    STAND_MENUS[stand.id] = DEFAULT_MENU.map((item, i) => ({
      ...item,
      id: `${stand.id}-mi-${i}`,
    }));
  }
});

let ALERTS = [
  {
    alertId: randomUUID(),
    type: 'ZONE_CONGESTION',
    severity: 'high',
    zoneId: 'zone-004',
    standId: null,
    message: 'Upper Deck South approaching capacity at 80%. Consider opening Gate D overflow.',
    firedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    acknowledgedAt: null,
    acknowledgedBy: null,
  },
  {
    alertId: randomUUID(),
    type: 'STAND_OFFLINE',
    severity: 'medium',
    zoneId: 'zone-002',
    standId: 'stand-009',
    message: 'Field Level Pizza (Stand 9) went offline at 2:14 PM. Staff notified.',
    firedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    acknowledgedBy: 'staff-001',
  },
];

const ORDERS = {};

// ================================================================
// SSE CLIENT REGISTRY
// ================================================================

const sseClients = new Map();

function broadcast(venueId, eventName, data) {
  const clients = sseClients.get(venueId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try { res.write(payload); } catch (_) { clients.delete(res); }
  });
}

// ================================================================
// BUSINESS LOGIC HELPERS
// ================================================================

function getAlertLevel(capacityPct) {
  if (capacityPct >= 94) return 'critical';
  if (capacityPct >= 85) return 'high';
  if (capacityPct >= 70) return 'elevated';
  return 'normal';
}

function getWaitLevel(seconds) {
  if (seconds >= 720) return 'critical';
  if (seconds >= 420) return 'high';
  if (seconds >= 180) return 'elevated';
  return 'normal';
}

function enrichZone(zone) {
  const capacityPct = Math.round((zone.headCount / zone.maxCapacity) * 100);
  return { ...zone, capacityPct, alertLevel: getAlertLevel(capacityPct), updatedAt: new Date().toISOString() };
}

function enrichStand(stand) {
  return { ...stand, waitLevel: getWaitLevel(stand.waitSeconds), updatedAt: new Date().toISOString() };
}

// ================================================================
// SENSOR SIMULATION — runs every 5 seconds
// ================================================================

const alertCooldown = new Map();

function simulateSensors() {
  const updatedStands = [];
  const updatedZones  = [];

  // Update 3–5 random open stands
  const standCount = 3 + Math.floor(Math.random() * 3);
  const shuffledStands = [...STANDS].sort(() => Math.random() - 0.5).slice(0, standCount);

  shuffledStands.forEach(stand => {
    if (!stand.isOpen) return;
    stand.prevWait = stand.waitSeconds;
    const delta = Math.floor((Math.random() - 0.45) * 6);
    stand.queueDepth = Math.max(0, Math.min(60, stand.queueDepth + delta));
    stand.waitSeconds = Math.max(30, stand.queueDepth * 12);
    updatedStands.push(enrichStand(stand));
  });

  // Update 2–3 random zones
  const zoneCount = 1 + Math.floor(Math.random() * 3);
  const shuffledZones = [...ZONES].sort(() => Math.random() - 0.5).slice(0, zoneCount);

  shuffledZones.forEach(zone => {
    const delta = Math.floor((Math.random() - 0.42) * 200);
    zone.headCount = Math.max(0, Math.min(zone.maxCapacity, zone.headCount + delta));
    const enriched = enrichZone(zone);
    updatedZones.push(enriched);

    // Fire alerts on threshold crossing (with cooldown)
    const cooldownKey = `${zone.id}-${enriched.alertLevel}`;
    const lastFired = alertCooldown.get(cooldownKey) || 0;
    const now = Date.now();

    if ((enriched.alertLevel === 'critical' || enriched.alertLevel === 'high') && (now - lastFired > 90000)) {
      alertCooldown.set(cooldownKey, now);
      const alert = {
        alertId: randomUUID(),
        type: 'ZONE_CONGESTION',
        severity: enriched.alertLevel,
        zoneId: zone.id,
        standId: null,
        message: enriched.alertLevel === 'critical'
          ? `${zone.name} is at ${enriched.capacityPct}% capacity. Immediate diversion required.`
          : `${zone.name} approaching capacity at ${enriched.capacityPct}%. Monitor closely.`,
        firedAt: new Date().toISOString(),
        acknowledgedAt: null,
        acknowledgedBy: null,
      };
      ALERTS.unshift(alert);
      broadcast(VENUE.id, 'alert', alert);
    }
  });

  // Broadcast stand and zone updates
  if (updatedStands.length > 0) {
    broadcast(VENUE.id, 'waittimes', { venueId: VENUE.id, capturedAt: new Date().toISOString(), stands: updatedStands });
  }
  if (updatedZones.length > 0) {
    broadcast(VENUE.id, 'density', { venueId: VENUE.id, capturedAt: new Date().toISOString(), zones: updatedZones });
  }

  // Auto-advance orders
  Object.values(ORDERS).forEach(order => {
    if (order.status === 'confirmed' && Math.random() > 0.65) {
      order.status = 'preparing';
      order.updatedAt = new Date().toISOString();
      broadcast(VENUE.id, 'order', { orderId: order.id, status: 'preparing' });
    } else if (order.status === 'preparing' && Math.random() > 0.70) {
      order.status = 'delivering';
      order.updatedAt = new Date().toISOString();
      broadcast(VENUE.id, 'order', { orderId: order.id, status: 'delivering' });
    }
  });
}

setInterval(simulateSensors, 5000);

// ================================================================
// REST API ENDPOINTS
// ================================================================

// Venue info
app.get('/api/v1/venues/:venueId', (req, res) => {
  res.json(VENUE);
});

// Wait times for all stands
app.get('/api/v1/venues/:venueId/concessions/wait-times', (req, res) => {
  res.json({
    venueId: VENUE.id,
    capturedAt: new Date().toISOString(),
    stands: STANDS.map(enrichStand),
  });
});

// Zone density
app.get('/api/v1/venues/:venueId/zones/density', (req, res) => {
  res.json({
    venueId: VENUE.id,
    capturedAt: new Date().toISOString(),
    zones: ZONES.map(enrichZone),
  });
});

// Menu for a stand
app.get('/api/v1/venues/:venueId/menu/:standId', (req, res) => {
  const items = STAND_MENUS[req.params.standId];
  if (!items) return res.status(404).json({ error: 'STAND_NOT_FOUND' });
  res.json({ standId: req.params.standId, items });
});

// Place an order
app.post('/api/v1/venues/:venueId/orders', (req, res) => {
  const { standId, seatSection, seatRow, seatNumber, items } = req.body;
  const stand = STANDS.find(s => s.id === standId);

  if (!stand || !stand.isOpen) {
    return res.status(422).json({ error: 'STAND_UNAVAILABLE', message: 'This stand is not accepting orders right now.', retryAfterSeconds: 300 });
  }
  if (stand.queueDepth >= 60) {
    return res.status(422).json({ error: 'STAND_UNAVAILABLE', message: `${stand.name} queue is full. Try again in a few minutes.`, retryAfterSeconds: 180 });
  }

  const totalCents = items.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
  const orderId = randomUUID().slice(0, 8).toUpperCase();

  const order = {
    id: orderId,
    standId,
    standName: stand.name,
    standIcon: stand.icon,
    status: 'confirmed',
    seatSection: seatSection || '114',
    seatRow: seatRow || 'G',
    seatNumber: seatNumber || '22',
    items,
    totalCents,
    currency: 'USD',
    estimatedDeliverySeconds: stand.waitSeconds + 120,
    placedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ORDERS[orderId] = order;

  // Increase stand queue
  stand.queueDepth = Math.min(60, stand.queueDepth + Math.ceil(items.reduce((s, i) => s + i.quantity, 0) / 2));
  stand.waitSeconds = stand.queueDepth * 12;

  // Auto advance order status
  setTimeout(() => {
    if (ORDERS[orderId]) {
      ORDERS[orderId].status = 'preparing';
      ORDERS[orderId].updatedAt = new Date().toISOString();
      broadcast(VENUE.id, 'order', { orderId, status: 'preparing' });
    }
  }, 10000);

  setTimeout(() => {
    if (ORDERS[orderId]) {
      ORDERS[orderId].status = 'delivering';
      ORDERS[orderId].updatedAt = new Date().toISOString();
      broadcast(VENUE.id, 'order', { orderId, status: 'delivering' });
    }
  }, 22000);

  res.status(201).json({
    orderId: order.id,
    status: order.status,
    estimatedDeliverySeconds: order.estimatedDeliverySeconds,
    totalCents: order.totalCents,
    currency: 'USD',
    placedAt: order.placedAt,
  });
});

// Get order by ID
app.get('/api/v1/orders/:orderId', (req, res) => {
  const order = ORDERS[req.params.orderId];
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
  res.json(order);
});

// Ops alert feed
app.get('/api/v1/venues/:venueId/ops/alerts', (req, res) => {
  const alerts = ALERTS.slice(0, 50);
  res.json({
    venueId: VENUE.id,
    alerts,
    total: alerts.length,
    unacknowledgedCount: alerts.filter(a => !a.acknowledgedAt).length,
  });
});

// Acknowledge an alert
app.patch('/api/v1/ops/alerts/:alertId/acknowledge', (req, res) => {
  const alert = ALERTS.find(a => a.alertId === req.params.alertId);
  if (!alert) return res.status(404).json({ error: 'ALERT_NOT_FOUND' });
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = 'staff-001';
  broadcast(VENUE.id, 'alertupdate', alert);
  res.json(alert);
});

// Trigger halftime surge (ops action)
app.post('/api/v1/venues/:venueId/ops/surge', (req, res) => {
  STANDS.forEach(stand => {
    if (stand.isOpen) {
      stand.prevWait = stand.waitSeconds;
      stand.queueDepth = Math.min(60, stand.queueDepth + 18);
      stand.waitSeconds = stand.queueDepth * 12;
    }
  });
  ZONES.forEach(zone => {
    zone.headCount = Math.min(zone.maxCapacity, Math.round(zone.headCount * 1.25));
  });

  const alert = {
    alertId: randomUUID(),
    type: 'SURGE_PREDICTED',
    severity: 'critical',
    zoneId: null,
    standId: null,
    message: 'Halftime surge triggered! All zones: expect 3× normal volume in 8 minutes. Activate overflow protocols.',
    firedAt: new Date().toISOString(),
    acknowledgedAt: null,
    acknowledgedBy: null,
  };
  ALERTS.unshift(alert);

  broadcast(VENUE.id, 'alert', alert);
  broadcast(VENUE.id, 'waittimes', { venueId: VENUE.id, capturedAt: new Date().toISOString(), stands: STANDS.map(enrichStand) });
  broadcast(VENUE.id, 'density',   { venueId: VENUE.id, capturedAt: new Date().toISOString(), zones:  ZONES.map(enrichZone)  });

  res.json({ success: true, message: 'Surge alert fired and data spiked.' });
});

// Dismiss all low-priority alerts
app.post('/api/v1/venues/:venueId/ops/alerts/dismiss-low', (req, res) => {
  const ts = new Date().toISOString();
  ALERTS.forEach(a => {
    if (['low', 'medium'].includes(a.severity) && !a.acknowledgedAt) {
      a.acknowledgedAt = ts;
      a.acknowledgedBy = 'staff-001';
    }
  });
  res.json({ success: true });
});

// ================================================================
// SSE ENDPOINT
// ================================================================

app.get('/api/v1/venues/:venueId/stream', (req, res) => {
  const { venueId } = req.params;

  res.setHeader('Content-Type',    'text/event-stream');
  res.setHeader('Cache-Control',   'no-cache');
  res.setHeader('Connection',      'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!sseClients.has(venueId)) sseClients.set(venueId, new Set());
  sseClients.get(venueId).add(res);

  res.write(`event: connected\ndata: ${JSON.stringify({ venueId, timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write('event: ping\ndata: {}\n\n'); } catch (_) { clearInterval(heartbeat); }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.get(venueId)?.delete(res);
  });
});

// ================================================================
// REACT ROUTER FALLBACK
// ================================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ================================================================
// START
// ================================================================

app.listen(PORT, () => {
  console.log(`\n🏟️  Smart Venue API  →  http://localhost:${PORT}`);
  console.log(`   Attendee App    →  http://localhost:5173/`);
  console.log(`   Ops Dashboard   →  http://localhost:5173/ops\n`);
});
