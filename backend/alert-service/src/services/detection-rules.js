// Rule-based detection: plain JavaScript functions that look at one promotion or coupon
// and return a "finding" when a condition needs attention, or null when everything is fine.
// These functions never touch the database, so they are easy to read and to test.

const HOUR = 60 * 60 * 1000;

export function formatRemaining(milliseconds) {
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60000));
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  const hours = Math.round(totalMinutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

function formatDiscount(record) {
  return record.discountType === 'percentage' ? `${record.discountValue}%` : `€${record.discountValue} (fixed amount)`;
}

// The closer the deadline, the higher the severity.
function deadlineSeverity(hoursLeft) {
  if (hoursLeft <= 6) return 'critical';
  if (hoursLeft <= 12) return 'high';
  return 'medium';
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export const RULES = [
  {
    type: 'promotion_expiring',
    label: 'Promotion expiring soon',
    entity: 'promotion',
    describe: (settings) => `Active promotions that end within the next ${settings.expiringWithinHours} hours.`,
    check(promotion, settings, now) {
      if (!promotion.isActive) return null;
      const endDate = new Date(promotion.endDate);
      const msLeft = endDate - now;
      if (msLeft <= 0 || msLeft > settings.expiringWithinHours * HOUR) return null;

      const remaining = formatRemaining(msLeft);
      return {
        severity: deadlineSeverity(msLeft / HOUR),
        title: `${promotion.title} expires in ${remaining}`,
        description: `Promotion ${promotion.code} (${formatDiscount(promotion)}) ends on ${endDate.toISOString()}. Extend it or prepare a follow-up offer.`,
        fingerprint: endDate.toISOString(),
        details: { code: promotion.code, expiresAt: endDate.toISOString(), remainingHours: round(msLeft / HOUR), remaining }
      };
    }
  },
  {
    type: 'promotion_expired_active',
    label: 'Expired promotion still enabled',
    entity: 'promotion',
    describe: () => 'Promotions whose end date has passed but are still marked as active.',
    check(promotion, settings, now) {
      if (!promotion.isActive) return null;
      const endDate = new Date(promotion.endDate);
      if (endDate >= now) return null;

      const daysAgo = Math.floor((now - endDate) / (24 * HOUR));
      return {
        severity: 'high',
        title: `${promotion.code} promotion expired but remains enabled`,
        description: `"${promotion.title}" ended on ${endDate.toISOString()} (${daysAgo === 0 ? 'today' : `${daysAgo} day(s) ago`}) but is still active. Disable it in the Promotions page.`,
        fingerprint: endDate.toISOString(),
        details: { code: promotion.code, expiredAt: endDate.toISOString(), daysSinceExpiry: daysAgo }
      };
    }
  },
  {
    type: 'high_discount',
    label: 'Unusually high discount',
    entity: 'promotion',
    describe: (settings) => `Active percentage promotions above ${settings.highDiscountThreshold}% (fixed amounts are never treated as percentages).`,
    check(promotion, settings, now) {
      if (!promotion.isActive || new Date(promotion.endDate) < now) return null;
      // A fixed discount of €80 is money, not 80%, so only percentage discounts are compared.
      if (promotion.discountType !== 'percentage') return null;
      if (promotion.discountValue <= settings.highDiscountThreshold) return null;

      return {
        severity: promotion.discountValue >= 90 ? 'critical' : 'high',
        title: `${promotion.title} has a ${promotion.discountValue}% discount`,
        description: `Promotion ${promotion.code} is above the ${settings.highDiscountThreshold}% review threshold. Review recommended.`,
        fingerprint: `${promotion.discountValue}`,
        details: { code: promotion.code, discountValue: promotion.discountValue, threshold: settings.highDiscountThreshold }
      };
    }
  },
  {
    type: 'coupon_usage',
    label: 'Coupon near usage limit',
    entity: 'coupon',
    describe: (settings) => `Active coupons that reached ${settings.couponUsageThreshold}% of their usage limit.`,
    check(coupon, settings, now) {
      if (!coupon.isActive || new Date(coupon.expirationDate) < now) return null;
      // Coupons without a limit (null) can never "run out".
      if (coupon.usageLimit == null || coupon.usageLimit <= 0) return null;

      const usedCount = coupon.usedCount ?? 0;
      const percentUsed = (usedCount / coupon.usageLimit) * 100;
      if (percentUsed < settings.couponUsageThreshold) return null;

      let severity = 'medium';
      if (percentUsed >= 100) severity = 'critical';
      else if (percentUsed >= 95) severity = 'high';

      return {
        severity,
        title: `${coupon.code} has used ${usedCount} out of ${coupon.usageLimit} available redemptions`,
        description: percentUsed >= 100
          ? `Coupon ${coupon.code} reached its limit and can no longer be redeemed. Increase the limit or disable it.`
          : `Coupon ${coupon.code} is at ${round(percentUsed)}% of its usage limit and will run out soon.`,
        fingerprint: `${coupon.usageLimit}|${severity}`,
        details: { code: coupon.code, usedCount, usageLimit: coupon.usageLimit, percentUsed: round(percentUsed), threshold: settings.couponUsageThreshold }
      };
    }
  },
  {
    type: 'coupon_expiring',
    label: 'Coupon expiring soon',
    entity: 'coupon',
    describe: (settings) => `Active coupons that expire within the next ${settings.expiringWithinHours} hours.`,
    check(coupon, settings, now) {
      if (!coupon.isActive) return null;
      const expirationDate = new Date(coupon.expirationDate);
      const msLeft = expirationDate - now;
      if (msLeft <= 0 || msLeft > settings.expiringWithinHours * HOUR) return null;

      const remaining = formatRemaining(msLeft);
      return {
        severity: deadlineSeverity(msLeft / HOUR),
        title: `${coupon.code} expires in ${remaining}`,
        description: `Coupon ${coupon.code} (${formatDiscount(coupon)}) expires on ${expirationDate.toISOString()}.`,
        fingerprint: expirationDate.toISOString(),
        details: { code: coupon.code, expiresAt: expirationDate.toISOString(), remainingHours: round(msLeft / HOUR), remaining }
      };
    }
  }
];

export function getEnabledRules(settings) {
  return RULES.filter((rule) => !settings.disabledRules.includes(rule.type));
}

// Runs every enabled rule against every record and returns the list of findings.
export function detectConditions({ promotions, coupons }, settings, now = new Date()) {
  const findings = [];

  for (const rule of getEnabledRules(settings)) {
    const records = rule.entity === 'promotion' ? promotions : coupons;
    for (const record of records) {
      const finding = rule.check(record, settings, now);
      if (!finding) continue;

      findings.push({
        ...finding,
        type: rule.type,
        source: rule.entity,
        ruleKey: `${rule.type}:${record._id}`,
        relatedEntityType: rule.entity,
        relatedEntityId: String(record._id),
        relatedEntityLabel: rule.entity === 'promotion' ? `${record.title} (${record.code})` : record.code
      });
    }
  }

  return findings;
}
