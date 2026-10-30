// Integration tests: a real MongoDB test database + a small fake Promotion Service
// that answers over real HTTP, exactly like the real one (same routes and JSON shape).
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Alert } from '../src/models/alert.model.js';
import { ScanRun } from '../src/models/scan-run.model.js';

const TEST_DB = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/techsolde_alerts_test';
const HOUR = 60 * 60 * 1000;
const at = (offset) => new Date(Date.now() + offset).toISOString();
const id = () => new mongoose.Types.ObjectId().toString();

// ---- Fake Promotion Service -------------------------------------------------
const store = { promotions: [], coupons: [] };
let fakeServer;

function listHandler(resource) {
  return (req, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    let items = store[resource];
    if (req.query.status === 'active') items = items.filter((item) => item.isActive);
    res.json({ success: true, data: items.slice((page - 1) * limit, page * limit), meta: { page, limit, totalItems: items.length, totalPages: Math.ceil(items.length / limit) } });
  };
}

function startFakePromotionService() {
  const fake = express();
  fake.get('/api/health', (req, res) => res.json({ success: true }));
  fake.get('/api/promotions', listHandler('promotions'));
  fake.get('/api/coupons', listHandler('coupons'));
  return new Promise((resolve) => {
    const server = fake.listen(0, () => resolve(server));
  });
}

const promotion = (fields) => ({ _id: id(), title: 'Flash Sale', code: 'FLASH', discountType: 'percentage', discountValue: 20, startDate: at(-48 * HOUR), endDate: at(8 * HOUR), isActive: true, ...fields });
const coupon = (fields) => ({ _id: id(), code: 'STUDENT20', discountType: 'percentage', discountValue: 20, usageLimit: 100, usedCount: 95, expirationDate: at(60 * 24 * HOUR), isActive: true, ...fields });

// ---- Setup -------------------------------------------------------------------
beforeAll(async () => {
  fakeServer = await startFakePromotionService();
  process.env.PROMOTION_API_URL = `http://127.0.0.1:${fakeServer.address().port}/api`;
  process.env.DISABLED_RULES = '';
  await connectDatabase(TEST_DB);
  await mongoose.connection.dropDatabase();
  await Alert.init(); // make sure the unique "one open alert per rule" index exists
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
  await new Promise((resolve) => fakeServer.close(resolve));
});

beforeEach(async () => {
  store.promotions = [];
  store.coupons = [];
  await Alert.deleteMany({});
  await ScanRun.deleteMany({});
});

const manualAlert = { title: 'Review discounts before the seasonal sale', description: 'Check every offer above 50%.', severity: 'high' };
const create = (body = manualAlert) => request(app).post('/api/alerts').send(body);

// ---- CRUD --------------------------------------------------------------------
describe('alert CRUD', () => {
  it('creates a manual alert (201) and stores it in MongoDB', async () => {
    const response = await create();
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ title: manualAlert.title, type: 'custom', source: 'manual', status: 'new', severity: 'high', severityRank: 3, isOpen: true });
    expect(response.body.data.createdAt).toBeTruthy();
    expect(await Alert.countDocuments()).toBe(1);
  });

  it('lists alerts with pagination metadata', async () => {
    for (let index = 0; index < 3; index += 1) await create({ ...manualAlert, title: `Alert number ${index}` });
    const response = await request(app).get('/api/alerts?page=2&limit=2');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toMatchObject({ page: 2, limit: 2, totalItems: 3, totalPages: 2, hasNextPage: false, hasPreviousPage: true });
  });

  it('reads one alert, updates it, and deletes it', async () => {
    const { body } = await create();
    const alertId = body.data._id;

    const read = await request(app).get(`/api/alerts/${alertId}`);
    expect(read.status).toBe(200);
    expect(read.body.data.title).toBe(manualAlert.title);

    const updated = await request(app).put(`/api/alerts/${alertId}`).send({ title: 'Edited title', severity: 'critical', notes: 'Checked with the team.' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ title: 'Edited title', severity: 'critical', severityRank: 4, notes: 'Checked with the team.' });

    const removed = await request(app).delete(`/api/alerts/${alertId}`);
    expect(removed.status).toBe(200);
    expect(removed.body.message).toBe('Alert deleted successfully.');
    expect(await Alert.findById(alertId)).toBeNull();
  });

  it('links a manual alert to a promotion when a valid ID is given', async () => {
    const promotionId = id();
    const response = await create({ ...manualAlert, relatedEntityType: 'promotion', relatedEntityId: promotionId, relatedEntityLabel: 'Flash Sale (FLASH)' });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ relatedEntityType: 'promotion', relatedEntityId: promotionId });
  });
});

// ---- Status workflow ------------------------------------------------------------
describe('status workflow', () => {
  it('acknowledges, resolves and reopens an alert, persisting dates', async () => {
    const { body } = await create();
    const alertId = body.data._id;

    const acknowledged = await request(app).patch(`/api/alerts/${alertId}/acknowledge`);
    expect(acknowledged.status).toBe(200);
    expect(acknowledged.body.data.status).toBe('acknowledged');
    expect(acknowledged.body.data.acknowledgedAt).toBeTruthy();

    const resolved = await request(app).patch(`/api/alerts/${alertId}/resolve`).send({ reason: 'Discounts reviewed.' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data).toMatchObject({ status: 'resolved', isOpen: false, resolutionReason: 'Discounts reviewed.' });
    expect(resolved.body.data.resolvedAt).toBeTruthy();

    const reopened = await request(app).patch(`/api/alerts/${alertId}/reopen`);
    expect(reopened.status).toBe(200);
    expect(reopened.body.data).toMatchObject({ status: 'new', isOpen: true, resolvedAt: null });

    const saved = await Alert.findById(alertId).lean();
    expect(saved.status).toBe('new');
  });

  it('rejects impossible transitions with 409 Conflict', async () => {
    const { body } = await create();
    const alertId = body.data._id;
    expect((await request(app).patch(`/api/alerts/${alertId}/reopen`)).status).toBe(409);
    await request(app).patch(`/api/alerts/${alertId}/resolve`);
    expect((await request(app).patch(`/api/alerts/${alertId}/resolve`)).status).toBe(409);
    expect((await request(app).patch(`/api/alerts/${alertId}/acknowledge`)).status).toBe(409);
  });
});

// ---- Filtering, search, sorting, statistics -------------------------------------------
describe('filtering, search and statistics', () => {
  beforeEach(async () => {
    await create({ title: 'Low priority housekeeping', severity: 'low' });
    await create({ title: 'Payment page broken', description: 'Checkout errors reported', severity: 'critical' });
    const { body } = await create({ title: 'Check banner texts', severity: 'medium' });
    await request(app).patch(`/api/alerts/${body.data._id}/resolve`);
  });

  it('searches title and description (case-insensitive)', async () => {
    const byTitle = await request(app).get('/api/alerts?search=housekeeping');
    expect(byTitle.body.data.map((alert) => alert.title)).toEqual(['Low priority housekeeping']);
    const byDescription = await request(app).get('/api/alerts?search=CHECKOUT');
    expect(byDescription.body.data.map((alert) => alert.title)).toEqual(['Payment page broken']);
  });

  it('filters by severity, status and type', async () => {
    expect((await request(app).get('/api/alerts?severity=critical')).body.meta.totalItems).toBe(1);
    expect((await request(app).get('/api/alerts?status=resolved')).body.data[0].title).toBe('Check banner texts');
    expect((await request(app).get('/api/alerts?type=custom')).body.meta.totalItems).toBe(3);
    expect((await request(app).get('/api/alerts?type=coupon_usage')).body.meta.totalItems).toBe(0);
  });

  it('sorts critical open alerts first, and by newest/oldest', async () => {
    const severity = await request(app).get('/api/alerts?sort=severity');
    expect(severity.body.data.map((alert) => alert.severity)).toEqual(['critical', 'low', 'medium']); // resolved last
    const oldest = await request(app).get('/api/alerts?sort=oldest');
    expect(oldest.body.data[0].title).toBe('Low priority housekeeping');
    const newest = await request(app).get('/api/alerts?sort=newest');
    expect(newest.body.data[0].title).toBe('Check banner texts');
  });

  it('returns statistics computed by MongoDB', async () => {
    const response = await request(app).get('/api/alerts/stats');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ total: 3, new: 2, acknowledged: 0, resolved: 1, critical: 1, openCritical: 1 });
    expect(response.body.data.byType.find((entry) => entry.type === 'custom')).toEqual({ type: 'custom', count: 3, open: 2 });
  });
});

// ---- Validation and errors ---------------------------------------------------------
describe('validation and errors', () => {
  it('rejects invalid input with 400 and field details', async () => {
    const response = await create({ title: 'x', severity: 'urgent', status: 'resolved', type: 'high_discount' });
    expect(response.status).toBe(400);
    const fields = response.body.error.details.map((detail) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'severity', 'status', 'type']));
  });

  it('rejects malformed JSON, bad query parameters and an empty update', async () => {
    const malformed = await request(app).post('/api/alerts').set('Content-Type', 'application/json').send('{"title":');
    expect(malformed.status).toBe(400);
    expect((await request(app).get('/api/alerts?severity=urgent&limit=500')).status).toBe(400);
    const { body } = await create();
    expect((await request(app).put(`/api/alerts/${body.data._id}`).send({})).status).toBe(400);
  });

  it('returns 400 for invalid IDs and 404 for missing alerts', async () => {
    expect((await request(app).get('/api/alerts/not-an-id')).status).toBe(400);
    expect((await request(app).patch('/api/alerts/123/resolve')).status).toBe(400);
    const missing = id();
    expect((await request(app).get(`/api/alerts/${missing}`)).status).toBe(404);
    expect((await request(app).put(`/api/alerts/${missing}`).send({ title: 'Nothing here' })).status).toBe(404);
    expect((await request(app).delete(`/api/alerts/${missing}`)).status).toBe(404);
    expect((await request(app).get('/api/unknown')).status).toBe(404);
  });

  it('reports health with database and Promotion Service state', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ status: 'ok', database: 'connected', promotionService: 'reachable' });
  });
});

// ---- Automatic detection ------------------------------------------------------------
describe('automatic detection scan', () => {
  const scan = () => request(app).post('/api/alerts/scan');

  it('detects an expiring promotion, a coupon near its limit and a high discount, and saves them', async () => {
    store.promotions = [
      promotion({ title: 'FLASH SALE', endDate: at(8 * HOUR) }),
      promotion({ title: 'Gaming Laptop Promotion', code: 'GAMING75', discountValue: 75, endDate: at(30 * 24 * HOUR) }),
      promotion({ title: 'Big fixed', code: 'FIXED80', discountType: 'fixed', discountValue: 80, endDate: at(30 * 24 * HOUR) })
    ];
    store.coupons = [coupon()];

    const response = await scan();
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: 'success', trigger: 'manual', promotionsChecked: 3, couponsChecked: 1, conditionsFound: 3, created: 3 });

    const saved = await Alert.find().lean();
    expect(saved.map((alert) => alert.type).sort()).toEqual(['coupon_usage', 'high_discount', 'promotion_expiring']);
    const expiring = saved.find((alert) => alert.type === 'promotion_expiring');
    expect(expiring).toMatchObject({ title: 'FLASH SALE expires in 8 hours', source: 'promotion', relatedEntityType: 'promotion', status: 'new' });
    expect(expiring.details.expiresAt).toBe(store.promotions[0].endDate);
    expect(saved.find((alert) => alert.type === 'coupon_usage').title).toBe('STUDENT20 has used 95 out of 100 available redemptions');
  });

  it('never creates duplicate open alerts when scanning repeatedly', async () => {
    store.coupons = [coupon()];
    await scan();
    const second = await scan();
    expect(second.body.data).toMatchObject({ created: 0, unchanged: 1 });
    expect(await Alert.countDocuments()).toBe(1);
  });

  it('blocks duplicates at database level with a unique index', async () => {
    const fields = { title: 'Duplicate', type: 'coupon_usage', severity: 'medium', source: 'coupon', ruleKey: 'coupon_usage:abc' };
    await Alert.create(fields);
    await expect(Alert.create(fields)).rejects.toMatchObject({ code: 11000 });
  });

  it('updates an open alert when its details change and re-flags escalations as new', async () => {
    store.coupons = [coupon({ usedCount: 90 })];
    await scan();
    const alertId = (await Alert.findOne())._id;
    await request(app).patch(`/api/alerts/${alertId}/acknowledge`);

    store.coupons[0].usedCount = 100;
    const response = await scan();
    expect(response.body.data).toMatchObject({ created: 0, updated: 1 });
    const alert = await Alert.findById(alertId).lean();
    expect(alert).toMatchObject({ severity: 'critical', status: 'new', title: 'STUDENT20 has used 100 out of 100 available redemptions' });
  });

  it('auto-resolves an alert when its condition disappears', async () => {
    store.coupons = [coupon()];
    await scan();
    store.coupons[0].usageLimit = 1000; // limit raised in the Promotion Service
    const response = await scan();
    expect(response.body.data.autoResolved).toBe(1);
    expect(await Alert.findOne().lean()).toMatchObject({ status: 'resolved', autoResolved: true });
  });

  it('does not re-raise a manually resolved alert until the condition changes', async () => {
    store.promotions = [promotion({ discountValue: 75, endDate: at(30 * 24 * HOUR) })];
    await scan();
    const alertId = (await Alert.findOne())._id;
    await request(app).patch(`/api/alerts/${alertId}/resolve`);

    expect((await scan()).body.data).toMatchObject({ created: 0, suppressed: 1 });
    store.promotions[0].discountValue = 85;
    expect((await scan()).body.data.created).toBe(1);

    // The old alert cannot be reopened while the new one is open.
    expect((await request(app).patch(`/api/alerts/${alertId}/reopen`)).status).toBe(409);
  });

  it('only allows notes to be edited on automatic alerts', async () => {
    store.coupons = [coupon()];
    await scan();
    const alertId = (await Alert.findOne())._id;
    const blocked = await request(app).put(`/api/alerts/${alertId}`).send({ title: 'Changed', severity: 'low' });
    expect(blocked.status).toBe(400);
    const allowed = await request(app).put(`/api/alerts/${alertId}`).send({ notes: 'Marketing informed.' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.notes).toBe('Marketing informed.');
  });

  it('reports the last scan and the enabled rules', async () => {
    await scan();
    const response = await request(app).get('/api/alerts/scan/status');
    expect(response.status).toBe(200);
    expect(response.body.data.lastScan.status).toBe('success');
    expect(response.body.data.rules).toHaveLength(5);
    expect(response.body.data.rules.every((rule) => rule.enabled)).toBe(true);
  });

  it('answers 502 and records a failed scan when the Promotion Service is unavailable', async () => {
    const realUrl = process.env.PROMOTION_API_URL;
    process.env.PROMOTION_API_URL = 'http://127.0.0.1:1/api';
    try {
      const response = await scan();
      expect(response.status).toBe(502);
      expect(response.body.error.message).toMatch(/Promotion Service is unavailable/);
      expect(await Alert.countDocuments()).toBe(0);
      expect(await ScanRun.findOne().lean()).toMatchObject({ status: 'failed' });
      expect((await request(app).get('/api/health')).body.data.promotionService).toBe('unreachable');
    } finally {
      process.env.PROMOTION_API_URL = realUrl;
    }
  });
});
