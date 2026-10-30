import { describe, expect, it } from 'vitest';
import { detectConditions, formatRemaining } from '../src/services/detection-rules.js';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-11-10T12:00:00.000Z');
const at = (offset) => new Date(now.getTime() + offset).toISOString();
const settings = { expiringWithinHours: 24, highDiscountThreshold: 70, couponUsageThreshold: 90, disabledRules: [] };

function promotion(fields) {
  return { _id: '6650a1b2c3d4e5f6a7b8c9d0', title: 'Flash Sale', code: 'FLASH', discountType: 'percentage', discountValue: 20, startDate: at(-48 * HOUR), endDate: at(30 * 24 * HOUR), isActive: true, ...fields };
}
function coupon(fields) {
  return { _id: '6650a1b2c3d4e5f6a7b8c9d1', code: 'STUDENT20', discountType: 'percentage', discountValue: 20, usageLimit: 100, usedCount: 10, expirationDate: at(60 * 24 * HOUR), isActive: true, ...fields };
}
const detect = (data, custom = settings) => detectConditions({ promotions: [], coupons: [], ...data }, custom, now);

describe('detection rules', () => {
  it('detects a promotion expiring within 24 hours with a deadline-based severity', () => {
    const [finding] = detect({ promotions: [promotion({ endDate: at(8 * HOUR) })] });
    expect(finding).toMatchObject({ type: 'promotion_expiring', severity: 'high', source: 'promotion', ruleKey: 'promotion_expiring:6650a1b2c3d4e5f6a7b8c9d0' });
    expect(finding.title).toBe('Flash Sale expires in 8 hours');
    expect(finding.details.remainingHours).toBe(8);
    expect(detect({ promotions: [promotion({ endDate: at(3 * HOUR) })] })[0].severity).toBe('critical');
    expect(detect({ promotions: [promotion({ endDate: at(20 * HOUR) })] })[0].severity).toBe('medium');
  });

  it('ignores promotions ending later than the window, and inactive ones', () => {
    expect(detect({ promotions: [promotion({ endDate: at(25 * HOUR) })] })).toEqual([]);
    expect(detect({ promotions: [promotion({ endDate: at(2 * HOUR), isActive: false })] })).toEqual([]);
  });

  it('detects an expired promotion that is still active', () => {
    const [finding] = detect({ promotions: [promotion({ code: 'BLACKFRIDAY', startDate: at(-10 * 24 * HOUR), endDate: at(-2 * 24 * HOUR) })] });
    expect(finding.type).toBe('promotion_expired_active');
    expect(finding.title).toBe('BLACKFRIDAY promotion expired but remains enabled');
  });

  it('detects high percentage discounts but never treats fixed amounts as percentages', () => {
    const findings = detect({ promotions: [
      promotion({ _id: 'a', title: 'Gaming Laptop Promotion', discountValue: 75 }),
      promotion({ _id: 'b', discountValue: 95 }),
      promotion({ _id: 'c', discountValue: 70 }),
      promotion({ _id: 'd', discountType: 'fixed', discountValue: 80 })
    ] });
    expect(findings.map((finding) => [finding.relatedEntityId, finding.severity])).toEqual([['a', 'high'], ['b', 'critical']]);
    expect(findings[0].title).toBe('Gaming Laptop Promotion has a 75% discount');
  });

  it('respects a configurable discount threshold', () => {
    expect(detect({ promotions: [promotion({ discountValue: 60 })] }, { ...settings, highDiscountThreshold: 50 })).toHaveLength(1);
  });

  it('detects coupons at 90% or more of their usage limit using persisted counts', () => {
    const findings = detect({ coupons: [
      coupon({ _id: 'a', usedCount: 95 }),
      coupon({ _id: 'b', usedCount: 90 }),
      coupon({ _id: 'c', usedCount: 100 }),
      coupon({ _id: 'd', usedCount: 89 }),
      coupon({ _id: 'e', usageLimit: null, usedCount: 5000 })
    ] });
    expect(findings.map((finding) => [finding.relatedEntityId, finding.severity])).toEqual([['a', 'high'], ['b', 'medium'], ['c', 'critical']]);
    expect(findings[0].title).toBe('STUDENT20 has used 95 out of 100 available redemptions');
  });

  it('detects coupons expiring within 24 hours', () => {
    const [finding] = detect({ coupons: [coupon({ code: 'WELCOME15', expirationDate: at(20 * HOUR) })] });
    expect(finding).toMatchObject({ type: 'coupon_expiring', severity: 'medium', title: 'WELCOME15 expires in 20 hours' });
  });

  it('skips disabled rules', () => {
    const data = { promotions: [promotion({ discountValue: 80, endDate: at(5 * HOUR) })] };
    expect(detect(data).map((finding) => finding.type)).toEqual(['promotion_expiring', 'high_discount']);
    expect(detect(data, { ...settings, disabledRules: ['high_discount'] }).map((finding) => finding.type)).toEqual(['promotion_expiring']);
  });

  it('formats remaining time for people', () => {
    expect(formatRemaining(30 * 60 * 1000)).toBe('30 minutes');
    expect(formatRemaining(HOUR)).toBe('1 hour');
    expect(formatRemaining(7.6 * HOUR)).toBe('8 hours');
  });
});
