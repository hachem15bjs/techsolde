// Detection settings are read from environment variables each time they are needed,
// so a change in .env (after a restart) or in a test is picked up without code changes.

function readNumber(name, fallback) {
  const value = Number(process.env[name]);
  return process.env[name] !== undefined && process.env[name] !== '' && Number.isFinite(value) ? value : fallback;
}

export function getDetectionSettings() {
  return {
    promotionApiUrl: (process.env.PROMOTION_API_URL ?? 'http://localhost:5003/api').replace(/\/+$/, ''),
    requestTimeoutMs: readNumber('PROMOTION_API_TIMEOUT_MS', 5000),
    expiringWithinHours: readNumber('EXPIRING_WITHIN_HOURS', 24),
    highDiscountThreshold: readNumber('HIGH_DISCOUNT_THRESHOLD', 70),
    couponUsageThreshold: readNumber('COUPON_USAGE_THRESHOLD', 90),
    disabledRules: (process.env.DISABLED_RULES ?? '')
      .split(',')
      .map((rule) => rule.trim())
      .filter(Boolean),
    autoScanIntervalMinutes: readNumber('AUTO_SCAN_INTERVAL_MINUTES', 0)
  };
}
