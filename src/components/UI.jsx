import React, { useEffect, useRef } from 'react';
import { formatWaitTime, getWaitLevel } from '../utils.js';

// ================================================================
// WAIT TIME BADGE
// Shows coloured wait time. Pulses update when value changes.
// ================================================================
export function WaitTimeBadge({ seconds, isStale = false, size = 'md' }) {
  const level = isStale ? 'stale' : getWaitLevel(seconds);
  const prevRef = useRef(seconds);
  const ref = useRef(null);

  useEffect(() => {
    if (prevRef.current !== seconds && ref.current) {
      ref.current.classList.add('badge-flash');
      const t = setTimeout(() => ref.current?.classList.remove('badge-flash'), 600);
      prevRef.current = seconds;
      return () => clearTimeout(t);
    }
  }, [seconds]);

  const labels = { critical: '!! Long Wait', high: '↑ Long', elevated: 'Moderate', normal: 'Short', stale: 'No data' };

  return (
    <div ref={ref} className={`wait-badge ${level} ${size === 'lg' ? 'wait-badge-lg' : ''}`} title={`Wait time: ${formatWaitTime(seconds)}`} aria-label={`Wait time ${formatWaitTime(seconds)}, ${labels[level]}`}>
      <span className="wait-time">{isStale ? '—' : formatWaitTime(seconds)}</span>
      <span className="wait-label">{labels[level]}</span>
    </div>
  );
}

// ================================================================
// ZONE SEVERITY INDICATOR
// Coloured dot + optional label
// ================================================================
export function ZoneSeverityIndicator({ level, label, pulse = true }) {
  const icons = { critical: '!!', high: '!', elevated: '~', normal: '✓' };
  return (
    <span className="zone-severity-indicator" aria-label={`Zone status: ${level}`}>
      <span className={`severity-dot ${level} ${level === 'critical' && pulse ? 'severity-dot-pulse' : ''}`} />
      {label && <span className={`severity-label text-xs font-semibold severity-text-${level}`}>{icons[level]} {label}</span>}
    </span>
  );
}

// ================================================================
// ORDER STATUS STEPPER
// ================================================================
const STEPS = [
  { key: 'confirmed',  label: 'Confirmed',  icon: '✓' },
  { key: 'preparing',  label: 'Preparing',  icon: '👨‍🍳' },
  { key: 'delivering', label: 'On the way', icon: '🛵' },
  { key: 'delivered',  label: 'Delivered',  icon: '🎉' },
];

const STATUS_ORDER = ['confirmed', 'preparing', 'delivering', 'delivered'];

export function OrderStatusStepper({ status }) {
  const currentIdx = STATUS_ORDER.indexOf(status);
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="stepper-cancelled">
        <span style={{ fontSize: '2rem' }}>❌</span>
        <p style={{ color: 'var(--status-critical)', fontWeight: 600, marginTop: 8 }}>Order Cancelled</p>
      </div>
    );
  }

  return (
    <div className="stepper" role="progressbar" aria-label={`Order status: ${status}`} aria-valuenow={currentIdx} aria-valuemax={STEPS.length - 1}>
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIdx;
        const isActive    = i === currentIdx;
        const isPending   = i > currentIdx;
        return (
          <div key={step.key} className="stepper-step">
            {i < STEPS.length - 1 && (
              <div className={`stepper-connector ${isCompleted ? 'completed' : ''}`} />
            )}
            <div className={`stepper-circle ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
              {isCompleted ? '✓' : step.icon}
            </div>
            <span className={`stepper-label ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ================================================================
// SKELETON CARD — CSS-only loading placeholder
// ================================================================
export function SkeletonCard({ rows = 2 }) {
  return (
    <div className="skeleton-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="skeleton" style={{ width: '55%', height: 18, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: 64, height: 44, borderRadius: 8 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: i === rows - 1 ? '45%' : '75%', height: 13, marginBottom: 8, borderRadius: 4 }} />
      ))}
    </div>
  );
}

// ================================================================
// NOTIFICATION TOAST
// ================================================================
export function NotificationToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    if (toast.type !== 'critical') {
      const t = setTimeout(onClose, 6000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="toast-container" role="alert" aria-live="assertive">
      <div className={`toast toast-${toast.type}`} onClick={onClose}>
        <div className="toast-content">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-message">{toast.message}</div>
        </div>
        <button className="toast-close" aria-label="Dismiss notification" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

// ================================================================
// CONNECTION STATUS BAR
// ================================================================
export function ConnectionBar({ status }) {
  if (status === 'connected') return null;
  const messages = {
    connecting:    '⟳ Connecting to live feed…',
    disconnected:  '⚠ Connection lost — retrying…',
  };
  return (
    <div className={`connection-bar ${status}`} role="status" aria-live="polite">
      {messages[status]}
    </div>
  );
}
