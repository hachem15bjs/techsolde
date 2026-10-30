// Demonstration data for the Alert Service.
//   npm run seed        -> creates/updates demo promotions and coupons THROUGH the Promotion Service API
//                          and one demo manual alert in MongoDB
//   npm run seed:clean  -> removes all of those demo records again
// Every demo record uses the "DEMOALERT" code prefix and a "[DEMO]" title so it is easy to recognise.
import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { getDetectionSettings } from './config/settings.js';
import { Alert } from './models/alert.model.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const { promotionApiUrl } = getDetectionSettings();
const now = Date.now();
const iso = (offset) => new Date(now + offset).toISOString();

const demoPromotions = [
  {
    title: '[DEMO] Flash Sale', code: 'DEMOALERTFLASH', description: 'Demonstration promotion that ends in 8 hours.',
    discountType: 'percentage', discountValue: 20, startDate: iso(-2 * DAY), endDate: iso(8 * HOUR), isActive: true
  },
  {
    title: '[DEMO] Gaming Laptop Promotion', code: 'DEMOALERTGAMING75', description: 'Demonstration promotion with a very high discount.',
    discountType: 'percentage', discountValue: 75, startDate: iso(-1 * DAY), endDate: iso(30 * DAY), isActive: true
  },
  {
    title: '[DEMO] Black Friday Preview', code: 'DEMOALERTBLACKFRIDAY', description: 'Demonstration promotion that expired but is still enabled.',
    discountType: 'percentage', discountValue: 30, startDate: iso(-10 * DAY), endDate: iso(-2 * DAY), isActive: true
  },
  {
    title: '[DEMO] Headphones €80 Off', code: 'DEMOALERTFIXED80', description: 'Fixed-amount discount: must NOT be treated as 80%.',
    discountType: 'fixed', discountValue: 80, startDate: iso(-1 * DAY), endDate: iso(20 * DAY), isActive: true
  }
];

const demoCoupons = [
  {
    code: 'DEMOALERTSTUDENT20', description: '[DEMO] Coupon close to its usage limit (95/100).',
    discountType: 'percentage', discountValue: 20, usageLimit: 100, usedCount: 95, expirationDate: iso(60 * DAY), isActive: true
  },
  {
    code: 'DEMOALERTWELCOME15', description: '[DEMO] Coupon that expires in about 20 hours.',
    discountType: 'percentage', discountValue: 15, usageLimit: 500, usedCount: 12, expirationDate: iso(20 * HOUR), isActive: true
  }
];

const demoManualAlert = {
  title: '[DEMO] Review unusually high discounts before the seasonal sale',
  description: 'Demonstration manual alert created by the seed script.',
  severity: 'medium',
  type: 'custom',
  source: 'manual'
};

async function callPromotionApi(method, path, body) {
  let response;
  try {
    response = await fetch(`${promotionApiUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error(`Cannot reach the Promotion Service at ${promotionApiUrl}. Start it first (npm run dev in backend/promotion-service).`);
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${json.error?.message ?? 'unknown error'}`);
  return json;
}

async function findByCode(resource, code) {
  const result = await callPromotionApi('GET', `/${resource}?search=${encodeURIComponent(code)}&limit=100`);
  return result.data.find((record) => record.code === code);
}

async function upsert(resource, record) {
  const existing = await findByCode(resource, record.code);
  if (existing) {
    await callPromotionApi('PUT', `/${resource}/${existing._id}`, record);
    console.info(`  updated ${resource.slice(0, -1)} ${record.code}`);
  } else {
    await callPromotionApi('POST', `/${resource}`, record);
    console.info(`  created ${resource.slice(0, -1)} ${record.code}`);
  }
}

async function remove(resource, code) {
  const existing = await findByCode(resource, code);
  if (!existing) return;
  await callPromotionApi('DELETE', `/${resource}/${existing._id}`);
  console.info(`  deleted ${resource.slice(0, -1)} ${code}`);
}

const clean = process.argv.includes('--clean');

try {
  await connectDatabase();

  if (clean) {
    console.info('Removing demonstration data...');
    for (const promotion of demoPromotions) await remove('promotions', promotion.code);
    for (const coupon of demoCoupons) await remove('coupons', coupon.code);
    const { deletedCount } = await Alert.deleteMany({
      $or: [{ title: /^\[DEMO\]/ }, { relatedEntityLabel: /DEMOALERT/ }]
    });
    console.info(`  deleted ${deletedCount} demo alert(s)`);
  } else {
    console.info(`Creating demonstration data through ${promotionApiUrl} ...`);
    for (const promotion of demoPromotions) await upsert('promotions', promotion);
    for (const coupon of demoCoupons) await upsert('coupons', coupon);
    // create() (not an update query) so the model's validation hook fills severityRank and isOpen.
    if (await Alert.exists({ title: demoManualAlert.title })) console.info('  demo manual alert already exists');
    else {
      await Alert.create(demoManualAlert);
      console.info('  created 1 demo manual alert');
    }
    console.info('Done. Open the Alerts page and click "Scan Now".');
  }
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
