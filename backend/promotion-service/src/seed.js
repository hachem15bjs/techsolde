import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { Promotion } from './models/promotion.model.js';
import { Coupon } from './models/coupon.model.js';

const demonstrations = {
  promotions: [
    { title: 'Black Friday Tech Deals', description: 'Demonstration promotion for Black Friday.', code: 'BLACKFRIDAY30', discountType: 'percentage', discountValue: 30, startDate: '2026-11-27', endDate: '2026-11-30', isActive: true },
    { title: 'Gaming Week', description: 'Demonstration promotion for gaming accessories.', code: 'GAMING15', discountType: 'percentage', discountValue: 15, startDate: '2026-07-01', endDate: '2026-07-07', isActive: true },
    { title: 'Laptop Student Discount', description: 'Demonstration student laptop offer.', code: 'STUDENT10', discountType: 'percentage', discountValue: 10, startDate: '2026-10-01', endDate: '2026-12-31', isActive: true },
    { title: 'Accessories Mega Sale', description: 'Demonstration accessories promotion, currently disabled.', code: 'ACCESSORIES25', discountType: 'percentage', discountValue: 25, startDate: '2026-10-01', endDate: '2026-11-15', isActive: false }
  ],
  coupons: [
    { code: 'WELCOME10', description: 'Demonstration welcome coupon.', discountType: 'percentage', discountValue: 10, usageLimit: 500, usedCount: 84, expirationDate: '2027-12-31', isActive: true },
    { code: 'TECH20', description: 'Demonstration technology coupon.', discountType: 'percentage', discountValue: 20, usageLimit: 200, usedCount: 45, expirationDate: '2027-06-30', isActive: true },
    { code: 'STUDENT15', description: 'Demonstration student coupon.', discountType: 'percentage', discountValue: 15, expirationDate: '2027-12-31', isActive: true },
    { code: 'SAVE50', description: 'Demonstration fixed-value coupon.', discountType: 'fixed', discountValue: 50, usageLimit: 100, usedCount: 100, expirationDate: '2027-12-31', isActive: true }
  ]
};

try {
  await connectDatabase();
  await Promise.all(
    demonstrations.promotions.map(({ code, ...fields }) =>
      Promotion.findOneAndUpdate({ code }, { ...fields, code }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })
    )
  );
  await Promise.all(
    demonstrations.coupons.map(({ code, ...fields }) =>
      Coupon.findOneAndUpdate({ code }, { ...fields, code }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })
    )
  );
  console.info('Demonstration promotions and coupons seeded without creating duplicates.');
} catch (error) {
  console.error('Could not seed demonstration data.', error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
