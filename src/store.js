import { create } from 'zustand';

export const useVenueStore = create((set, get) => ({
  // ── Server data
  stands: [],
  zones: [],
  alerts: [],
  orders: {},

  // ── Connection
  connectionStatus: 'connecting', // 'connecting' | 'connected' | 'disconnected'
  lastUpdatedAt: null,

  // ── Global toast
  toast: null,

  // ── Stand actions
  setStands: (stands) => set({ stands, lastUpdatedAt: new Date().toISOString() }),

  updateStands: (updatedStands) => set((state) => {
    const map = new Map(state.stands.map(s => [s.id, s]));
    updatedStands.forEach(s => map.set(s.id, { ...map.get(s.id), ...s }));
    return { stands: Array.from(map.values()), lastUpdatedAt: new Date().toISOString() };
  }),

  // ── Zone actions
  setZones: (zones) => set({ zones }),

  updateZones: (updatedZones) => set((state) => {
    const map = new Map(state.zones.map(z => [z.id, z]));
    updatedZones.forEach(z => map.set(z.id, { ...map.get(z.id), ...z }));
    return { zones: Array.from(map.values()) };
  }),

  // ── Alert actions
  setAlerts: (alerts) => set({ alerts }),

  prependAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts],
  })),

  updateAlert: (alert) => set((state) => ({
    alerts: state.alerts.map(a => a.alertId === alert.alertId ? alert : a),
  })),

  acknowledgeAlert: (alertId) => set((state) => ({
    alerts: state.alerts.map(a =>
      a.alertId === alertId
        ? { ...a, acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'staff-001' }
        : a
    ),
  })),

  // ── Order actions
  addOrder: (order) => set((state) => ({
    orders: { ...state.orders, [order.id]: order },
  })),

  updateOrderStatus: (orderId, status) => set((state) => ({
    orders: {
      ...state.orders,
      [orderId]: state.orders[orderId]
        ? { ...state.orders[orderId], status, updatedAt: new Date().toISOString() }
        : state.orders[orderId],
    },
  })),

  // ── Connection
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  // ── Toast
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
