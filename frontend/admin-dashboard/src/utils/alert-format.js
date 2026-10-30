export const SEVERITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

export const ALERT_STATUSES = [
  { value: 'new', label: 'New', tone: 'danger' },
  { value: 'acknowledged', label: 'Acknowledged', tone: 'warning' },
  { value: 'resolved', label: 'Resolved', tone: 'success' }
];

export const ALERT_TYPES = [
  { value: 'promotion_expiring', label: 'Promotion expiring' },
  { value: 'promotion_expired_active', label: 'Expired but active' },
  { value: 'high_discount', label: 'High discount' },
  { value: 'coupon_usage', label: 'Coupon usage' },
  { value: 'coupon_expiring', label: 'Coupon expiring' },
  { value: 'custom', label: 'Custom (manual)' }
];

export function typeLabel(type) {
  return ALERT_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function statusInfo(status) {
  return ALERT_STATUSES.find((item) => item.value === status) ?? { label: status, tone: 'neutral' };
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function timeAgo(value) {
  if (!value) return 'never';
  const seconds = Math.round((Date.now() - new Date(value)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

// Turns the "details" object saved by the detection engine into readable rows.
const DETAIL_LABELS = {
  code: 'Code',
  expiresAt: 'Expires at',
  expiredAt: 'Expired at',
  remaining: 'Time remaining',
  daysSinceExpiry: 'Days since expiry',
  discountValue: 'Discount',
  usedCount: 'Times used',
  usageLimit: 'Usage limit',
  percentUsed: 'Usage',
  threshold: 'Rule threshold'
};

export function detailRows(details = {}) {
  return Object.entries(DETAIL_LABELS)
    .filter(([key]) => details[key] !== undefined && details[key] !== null)
    .map(([key, label]) => {
      let value = details[key];
      if (key === 'expiresAt' || key === 'expiredAt') value = formatDateTime(value);
      if (key === 'discountValue' || key === 'percentUsed' || key === 'threshold') value = `${value}%`;
      return { key, label, value };
    });
}
