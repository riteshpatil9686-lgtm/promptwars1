// ================================================================
// UTILITY HELPERS
// ================================================================

export function formatWaitTime(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function getWaitLevel(seconds) {
  if (seconds >= 720) return 'critical';
  if (seconds >= 420) return 'high';
  if (seconds >= 180) return 'elevated';
  return 'normal';
}

export function formatCents(cents) {
  if (cents == null) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(isoString) {
  if (!isoString) return '';
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function getWaitLevelLabel(level) {
  switch (level) {
    case 'critical': return 'Very Long';
    case 'high':     return 'Long';
    case 'elevated': return 'Moderate';
    default:         return 'Short';
  }
}

export function getSeverityColor(level) {
  switch (level) {
    case 'critical': return 'var(--status-critical)';
    case 'high':     return 'var(--status-high)';
    case 'elevated': return 'var(--status-elevated)';
    default:         return 'var(--status-normal)';
  }
}

export function getTrendIcon(current, previous) {
  if (!previous || current === previous) return '→';
  return current > previous ? '↑' : '↓';
}

export function getTrendClass(current, previous) {
  if (!previous || current === previous) return 'trend-flat';
  return current > previous ? 'trend-up' : 'trend-down';
}

// Map zone IDs to section ranges (for proximity calculation)
export const ZONE_SECTIONS = {
  'zone-001': [100, 101, 102, 103, 114, 115, 116],
  'zone-002': [110, 111, 112, 113],
  'zone-003': [200, 201, 202, 203, 204, 205],
  'zone-004': [210, 211, 212, 213, 214, 215],
  'zone-005': [300, 301, 302, 303, 304, 305],
  'zone-006': [400, 401, 402],
};

export function getNearestZone(seatSection) {
  const section = parseInt(seatSection, 10);
  for (const [zoneId, sections] of Object.entries(ZONE_SECTIONS)) {
    if (sections.includes(section)) return zoneId;
  }
  return null;
}
