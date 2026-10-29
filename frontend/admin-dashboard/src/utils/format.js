export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function formatDiscount(type, value) {
  return type === 'percentage' ? `${value}%` : new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  }).format(value);
}

export function getCouponAvailability(coupon) {
  if (!coupon.isActive) return { label: 'Inactive', tone: 'neutral' };
  if (new Date(coupon.expirationDate) < new Date()) return { label: 'Expired', tone: 'danger' };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { label: 'Limit reached', tone: 'warning' };
  }
  return { label: 'Available', tone: 'success' };
}
