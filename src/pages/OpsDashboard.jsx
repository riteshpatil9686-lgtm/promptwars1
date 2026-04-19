import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useVenueStore } from '../store.js';
import { ZoneSeverityIndicator, SkeletonCard } from '../components/UI.jsx';
import { WaitTimeBadge } from '../components/UI.jsx';
import { formatWaitTime, formatCents, timeAgo, getTrendIcon, getTrendClass, getWaitLevel, getSeverityColor } from '../utils.js';

const VENUE_ID = 'venue-001';

// Zone colors for SVG heatmap
function getZoneColor(level) {
  switch (level) {
    case 'critical': return '#ef4444';
    case 'high':     return '#f97316';
    case 'elevated': return '#f59e0b';
    default:         return '#22c55e';
  }
}

// ================================================================
// VENUE SVG HEATMAP
// ================================================================
function VenueHeatmap({ zones }) {
  const zoneMap = {};
  zones.forEach(z => { zoneMap[z.id] = z; });

  const getLevel = (id) => zoneMap[id]?.alertLevel || 'normal';
  const getPct   = (id) => zoneMap[id]?.capacityPct ?? 0;

  return (
    <div className="venue-map-container">
      <svg viewBox="0 0 400 300" className="venue-map-svg" role="img" aria-label="Venue zone density heatmap">
        <title>MetroLife Arena Zone Density Map</title>
        <desc>Bird's-eye view of the arena with colour-coded crowd density by zone</desc>

        {/* Outer boundary */}
        <ellipse cx="200" cy="150" rx="192" ry="142" fill="#0f1628" stroke="#1a2040" strokeWidth="2" />

        {/* Zone: Upper Deck North */}
        <path d="M105,50 Q200,8 295,50 L275,78 Q200,42 125,78 Z"
          fill={getZoneColor(getLevel('zone-003'))} opacity="0.82" className="zone-path" />
        <text x="200" y="66" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" className="zone-text">
          Upper N · {getPct('zone-003')}%
        </text>

        {/* Zone: Upper Deck South */}
        <path d="M105,250 Q200,292 295,250 L275,222 Q200,258 125,222 Z"
          fill={getZoneColor(getLevel('zone-004'))} opacity="0.82" className="zone-path" />
        <text x="200" y="243" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" className="zone-text">
          Upper S · {getPct('zone-004')}%
        </text>

        {/* Zone: Lower Bowl West */}
        <path d="M16,80 Q10,150 16,220 L64,210 Q58,150 64,90 Z"
          fill={getZoneColor(getLevel('zone-001'))} opacity="0.85" className="zone-path" />
        <text x="40" y="154" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" className="zone-text" transform="rotate(-90,40,154)">
          LB West {getPct('zone-001')}%
        </text>

        {/* Zone: Lower Bowl East */}
        <path d="M384,80 Q390,150 384,220 L336,210 Q342,150 336,90 Z"
          fill={getZoneColor(getLevel('zone-002'))} opacity="0.85" className="zone-path" />
        <text x="360" y="154" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" className="zone-text" transform="rotate(90,360,154)">
          LB East {getPct('zone-002')}%
        </text>

        {/* Zone: Concourse Level (ring between upper/lower) */}
        <ellipse cx="200" cy="150" rx="128" ry="96" fill={getZoneColor(getLevel('zone-005'))} opacity="0.6" className="zone-path" />
        <text x="200" y="88" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" className="zone-text">
          Concourse · {getPct('zone-005')}%
        </text>

        {/* Zone: VIP Club Level */}
        <ellipse cx="200" cy="150" rx="95" ry="70" fill={getZoneColor(getLevel('zone-006'))} opacity="0.75" className="zone-path" />
        <text x="200" y="126" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" className="zone-text">
          VIP · {getPct('zone-006')}%
        </text>

        {/* Field — always dark, non-interactive */}
        <ellipse cx="200" cy="150" rx="60" ry="42" fill="#0a1f0a" stroke="#1a4020" strokeWidth="1.5" />
        <text x="200" y="153" textAnchor="middle" fill="#2a6030" fontSize="10" fontWeight="700" className="zone-text">FIELD</text>

        {/* Legend */}
        <g transform="translate(10,272)">
          {[['normal','#22c55e','Low'],['elevated','#f59e0b','Mod'],['high','#f97316','High'],['critical','#ef4444','Crit']].map(([,color,label], i) => (
            <g key={label} transform={`translate(${i * 90}, 0)`}>
              <rect width="12" height="12" rx="3" fill={color} opacity="0.85" />
              <text x="16" y="10" fill="#8892b0" fontSize="9">{label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

// ================================================================
// ZONE CAPACITY BARS
// ================================================================
function ZoneBars({ zones }) {
  if (!zones.length) return <SkeletonCard rows={3} />;
  const sorted = [...zones].sort((a, b) => (b.capacityPct ?? 0) - (a.capacityPct ?? 0));
  return (
    <div>
      {sorted.map(zone => {
        const pct = zone.capacityPct ?? Math.round((zone.headCount / zone.maxCapacity) * 100);
        const level = zone.alertLevel || 'normal';
        return (
          <div key={zone.id} className="zone-bar">
            <div className="zone-bar-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ZoneSeverityIndicator level={level} />
                <span className="zone-bar-name">{zone.name}</span>
              </div>
              <span className={`zone-bar-info`} style={{ color: getSeverityColor(level) }}>
                {pct}% · {zone.headCount?.toLocaleString()} ppl
              </span>
            </div>
            <div className="zone-bar-track">
              <div className={`zone-bar-fill ${level}`} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ================================================================
// ALERT FEED
// ================================================================
function AlertFeed({ alerts, onAcknowledge, onDismissLow }) {
  const unackCount = alerts.filter(a => !a.acknowledgedAt).length;

  if (!alerts.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">✅</div>
        <h3>No Alerts</h3>
        <p>All zones and stands are operating normally.</p>
      </div>
    );
  }

  return (
    <div>
      {alerts.map(alert => {
        const isUnack   = !alert.acknowledgedAt;
        const isCritical = alert.severity === 'critical';
        const isHigh     = alert.severity === 'high';
        return (
          <div
            key={alert.alertId}
            className={`alert-card ${isUnack && isCritical ? 'unack-critical' : ''} ${isUnack && isHigh ? 'unack-high' : ''} ${!isUnack ? 'acknowledged' : ''}`}
          >
            <div className="alert-card-header">
              <span className={`alert-type-tag alert-tag-${alert.type}`}>{alert.type.replace(/_/g, ' ')}</span>
              <span className="badge" style={{
                background: isCritical ? 'var(--status-critical-bg)' : isHigh ? 'var(--status-high-bg)' : 'var(--status-elevated-bg)',
                color: isCritical ? 'var(--status-critical)' : isHigh ? 'var(--status-high)' : 'var(--status-elevated)',
                fontSize: '0.65rem',
              }}>
                {alert.severity.toUpperCase()}
              </span>
            </div>
            <div className="alert-message">{alert.message}</div>
            <div className="alert-footer">
              <span className="alert-time">{timeAgo(alert.firedAt)}</span>
              {isUnack && (
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.72rem', minHeight: 28 }}
                  onClick={() => onAcknowledge(alert.alertId)}
                >
                  Acknowledge
                </button>
              )}
              {!isUnack && (
                <span style={{ fontSize: '0.7rem', color: 'var(--status-normal)' }}>✓ Acknowledged</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ================================================================
// QUEUE LEADERBOARD
// ================================================================
function QueueLeaderboard({ stands }) {
  const open   = [...stands].filter(s => s.isOpen).sort((a, b) => b.waitSeconds - a.waitSeconds);
  const closed = stands.filter(s => !s.isOpen);

  if (!stands.length) return <SkeletonCard rows={4} />;

  return (
    <div>
      <div className="ops-section-title">Open Stands — Ranked by Wait</div>
      {open.map((stand, i) => {
        const level    = getWaitLevel(stand.waitSeconds);
        const tClass   = stand.waitSeconds > (stand.prevWait || stand.waitSeconds) ? 'trend-up' : stand.waitSeconds < (stand.prevWait || stand.waitSeconds) ? 'trend-down' : 'trend-flat';
        const tIcon    = tClass === 'trend-up' ? '↑' : tClass === 'trend-down' ? '↓' : '→';
        return (
          <div key={stand.id} className="lb-row">
            <span className="lb-rank">{i + 1}</span>
            <span className="lb-icon">{stand.icon || '🍔'}</span>
            <div className="lb-info">
              <div className="lb-name">{stand.name}</div>
              <div className="lb-zone">~{stand.queueDepth} in queue</div>
            </div>
            <div className="lb-right">
              <WaitTimeBadge seconds={stand.waitSeconds} />
              <span className={`trend-icon ${tClass}`}>{tIcon}</span>
            </div>
          </div>
        );
      })}
      {closed.length > 0 && (
        <>
          <div className="ops-section-title" style={{ marginTop: 16 }}>Offline Stands</div>
          {closed.map(stand => (
            <div key={stand.id} className="lb-row" style={{ opacity: 0.45 }}>
              <span className="lb-icon">{stand.icon || '🍔'}</span>
              <div className="lb-info">
                <div className="lb-name">{stand.name}</div>
              </div>
              <span className="badge badge-offline">Offline</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ================================================================
// GAME STATE + STATS PANEL
// ================================================================
function GameStatePanel({ stands, zones, alerts }) {
  const [surgeFired, setSurgeFired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Fake game clock
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const totalCapacity  = zones.reduce((s, z) => s + (z.maxCapacity || 0), 0);
  const totalHeadCount = zones.reduce((s, z) => s + (z.headCount || 0), 0);
  const overallPct     = totalCapacity > 0 ? Math.round((totalHeadCount / totalCapacity) * 100) : 0;
  const openCount      = stands.filter(s => s.isOpen).length;
  const unackAlerts    = alerts.filter(a => !a.acknowledgedAt).length;
  const critAlerts     = alerts.filter(a => !a.acknowledgedAt && a.severity === 'critical').length;

  const avgWait = stands.length > 0
    ? Math.round(stands.filter(s => s.isOpen).reduce((s, st) => s + st.waitSeconds, 0) / Math.max(1, stands.filter(s => s.isOpen).length))
    : 0;

  const fireSurge = async () => {
    setLoading(true);
    await fetch(`/api/v1/venues/${VENUE_ID}/ops/surge`, { method: 'POST' });
    setSurgeFired(true);
    setLoading(false);
  };

  const dismissLow = async () => {
    await fetch(`/api/v1/venues/${VENUE_ID}/ops/alerts/dismiss-low`, { method: 'POST' });
  };

  return (
    <div>
      {/* Stats Grid */}
      <div className="ops-section-title">Venue Overview</div>
      <div className="stats-grid">
        <div className={`stat-card ${overallPct >= 85 ? 'critical' : overallPct >= 70 ? 'warning' : ''}`}>
          <div className="stat-value">{overallPct}%</div>
          <div className="stat-label">Capacity</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalHeadCount.toLocaleString()}</div>
          <div className="stat-label">Attendees</div>
        </div>
        <div className={`stat-card ${unackAlerts > 0 ? 'warning' : ''}`}>
          <div className="stat-value">{unackAlerts}</div>
          <div className="stat-label">Open Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{openCount}</div>
          <div className="stat-label">Stands Open</div>
        </div>
      </div>

      {/* Game clock */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Game Clock</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              Q3 · 58:22
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg Wait</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: getSeverityColor(getWaitLevel(avgWait)) }}>
              {formatWaitTime(avgWait)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span className="live-dot" />
          <span style={{ fontSize: '0.72rem', color: 'var(--status-normal)', fontWeight: 600 }}>Live event</span>
        </div>
      </div>

      {/* Actions */}
      <div className="ops-section-title">Ops Controls</div>

      <button className={`ops-action-btn danger`} onClick={fireSurge} disabled={loading || surgeFired}>
        <span className="btn-icon-slot">{surgeFired ? '✅' : '⚡'}</span>
        <span className="btn-text">
          {surgeFired ? 'Surge Alert Fired' : 'Trigger Halftime Surge Alert'}
          <span className="btn-sub">{surgeFired ? 'Broadcast sent to all staff' : 'Pre-configure staff & stands for halftime'}</span>
        </span>
      </button>

      <button className="ops-action-btn" onClick={dismissLow} style={{ opacity: unackAlerts > 0 ? 1 : 0.5 }} disabled={unackAlerts === 0}>
        <span className="btn-icon-slot">🗑️</span>
        <span className="btn-text">
          Dismiss Low-Priority Alerts
          <span className="btn-sub">Clear all low/medium severity from feed</span>
        </span>
      </button>

      <button className="ops-action-btn">
        <span className="btn-icon-slot">📢</span>
        <span className="btn-text">
          Broadcast Message
          <span className="btn-sub">Send text to all zone displays</span>
        </span>
      </button>

      <button className="ops-action-btn">
        <span className="btn-icon-slot">👷</span>
        <span className="btn-text">
          Redeploy Staff
          <span className="btn-sub">Push zone reassignment to staff devices</span>
        </span>
      </button>

      {/* Critical alert summary */}
      {critAlerts > 0 && (
        <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-glow-red)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-critical)', marginBottom: 4 }}>
            🚨 {critAlerts} Critical Alert{critAlerts !== 1 ? 's' : ''} Need Attention
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Review the Alert Feed panel and acknowledge to clear.
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ROOT — OpsDashboard
// ================================================================
export default function OpsDashboard() {
  const { stands, zones, alerts, setStands, setZones, setAlerts, acknowledgeAlert, connectionStatus } = useVenueStore();
  const [alertPanel, setAlertPanel] = useState('alerts'); // 'alerts' | 'queue'

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/venues/${VENUE_ID}/concessions/wait-times`).then(r => r.json()),
      fetch(`/api/v1/venues/${VENUE_ID}/zones/density`).then(r => r.json()),
      fetch(`/api/v1/venues/${VENUE_ID}/ops/alerts`).then(r => r.json()),
    ]).then(([standsData, zonesData, alertsData]) => {
      setStands(standsData.stands);
      setZones(zonesData.zones);
      setAlerts(alertsData.alerts);
    });
  }, []);

  const handleAcknowledge = useCallback((alertId) => {
    acknowledgeAlert(alertId);
    fetch(`/api/v1/ops/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
  }, [acknowledgeAlert]);

  const totalCapacity  = zones.reduce((s, z) => s + (z.maxCapacity || 0), 0);
  const totalHeadCount = zones.reduce((s, z) => s + (z.headCount  || 0), 0);
  const overallPct     = totalCapacity > 0 ? Math.round((totalHeadCount / totalCapacity) * 100) : 0;
  const unackCount     = alerts.filter(a => !a.acknowledgedAt).length;

  return (
    <div className="ops-app">
      {/* Header */}
      <div className="ops-header">
        <div className="ops-header-brand">
          <span className="ops-header-brand-icon">🏟️</span>
          <span className="ops-header-brand-name">SmartVenue OPS</span>
        </div>

        <div className="ops-stat-pill">
          <span className="live-dot" />
          <span className="value" style={{ color: connectionStatus === 'connected' ? 'var(--status-normal)' : 'var(--status-elevated)' }}>
            {connectionStatus === 'connected' ? 'Live' : 'Syncing…'}
          </span>
        </div>

        <div className="ops-stat-pill">
          <span className="label">Capacity</span>
          <span className="value" style={{ color: overallPct >= 85 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
            {overallPct}%
          </span>
        </div>

        <div className="ops-stat-pill">
          <span className="label">Alerts</span>
          <span className="value" style={{ color: unackCount > 0 ? 'var(--status-critical)' : 'var(--status-normal)' }}>
            {unackCount} open
          </span>
        </div>

        <Link to="/" className="ops-nav-link">
          ← Attendee View
        </Link>
      </div>

      {/* Main Grid */}
      <div className="ops-grid">

        {/* LEFT PANEL — Venue Map + Zone Bars */}
        <div className="ops-panel">
          <div className="ops-panel-header">
            <span className="ops-panel-title">Venue Heatmap</span>
            <ZoneSeverityIndicator level={overallPct >= 94 ? 'critical' : overallPct >= 85 ? 'high' : 'normal'} label={`${overallPct}%`} />
          </div>
          <div className="ops-panel-body">
            <VenueHeatmap zones={zones} />
            <div className="ops-section-title" style={{ marginTop: 12 }}>Zone Breakdown</div>
            <ZoneBars zones={zones} />
          </div>
        </div>

        {/* CENTER PANEL — Alerts + Queue (tabbed) */}
        <div className="ops-panel">
          <div className="ops-panel-header">
            <div className="page-nav" style={{ flex: 1 }}>
              <button
                className={`page-nav-btn ${alertPanel === 'alerts' ? 'active' : ''}`}
                onClick={() => setAlertPanel('alerts')}
              >
                🚨 Alerts {unackCount > 0 && `(${unackCount})`}
              </button>
              <button
                className={`page-nav-btn ${alertPanel === 'queue' ? 'active' : ''}`}
                onClick={() => setAlertPanel('queue')}
              >
                ⏱ Queue Leaderboard
              </button>
            </div>
          </div>
          <div className="ops-panel-body">
            {alertPanel === 'alerts' && (
              <AlertFeed
                alerts={alerts}
                onAcknowledge={handleAcknowledge}
              />
            )}
            {alertPanel === 'queue' && (
              <QueueLeaderboard stands={stands} />
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Game State + Controls */}
        <div className="ops-panel">
          <div className="ops-panel-header">
            <span className="ops-panel-title">Game State & Controls</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Chicago Fire vs FC Dallas</span>
          </div>
          <div className="ops-panel-body">
            <GameStatePanel stands={stands} zones={zones} alerts={alerts} />
          </div>
        </div>

      </div>
    </div>
  );
}
