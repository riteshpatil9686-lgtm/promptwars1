import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useVenueStore } from './store.js';
import AttendeeApp from './pages/AttendeeApp.jsx';
import OpsDashboard from './pages/OpsDashboard.jsx';
import { NotificationToast } from './components/UI.jsx';

const VENUE_ID = 'venue-001';

// SSEProvider: singleton that connects to the stream and pipes
// all server events into the Zustand store.
function SSEProvider() {
  const { updateStands, updateZones, prependAlert, updateOrderStatus, setConnectionStatus, showToast, updateAlert } = useVenueStore();

  useEffect(() => {
    let es;
    let reconnectTimer;

    function connect() {
      setConnectionStatus('connecting');
      es = new EventSource(`/api/v1/venues/${VENUE_ID}/stream`);

      es.addEventListener('connected', () => {
        setConnectionStatus('connected');
      });

      es.addEventListener('waittimes', (e) => {
        const data = JSON.parse(e.data);
        updateStands(data.stands);
      });

      es.addEventListener('density', (e) => {
        const data = JSON.parse(e.data);
        updateZones(data.zones);
      });

      es.addEventListener('alert', (e) => {
        const alert = JSON.parse(e.data);
        prependAlert(alert);
        if (alert.severity === 'critical') {
          showToast({
            id: alert.alertId,
            type: 'critical',
            title: alert.type === 'SURGE_PREDICTED' ? '⚡ Surge Predicted' : '🚨 Critical Alert',
            message: alert.message,
          });
        } else if (alert.severity === 'high') {
          showToast({
            id: alert.alertId,
            type: 'warning',
            title: '⚠️ High Priority Alert',
            message: alert.message,
          });
        }
      });

      es.addEventListener('alertupdate', (e) => {
        const alert = JSON.parse(e.data);
        updateAlert(alert);
      });

      es.addEventListener('order', (e) => {
        const data = JSON.parse(e.data);
        updateOrderStatus(data.orderId, data.status);
        if (data.status === 'delivering') {
          showToast({
            id: data.orderId + '-ready',
            type: 'info',
            title: '🛵 Order On Its Way!',
            message: `Your order #${data.orderId} is being delivered to your seat.`,
          });
        }
      });

      es.onerror = () => {
        setConnectionStatus('disconnected');
        es.close();
        reconnectTimer = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  return null;
}

export default function App() {
  const { toast, clearToast } = useVenueStore();

  return (
    <BrowserRouter>
      <SSEProvider />
      {toast && (
        <NotificationToast
          toast={toast}
          onClose={clearToast}
        />
      )}
      <Routes>
        <Route path="/"    element={<AttendeeApp />} />
        <Route path="/ops" element={<OpsDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
