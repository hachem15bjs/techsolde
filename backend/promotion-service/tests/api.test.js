import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import { Promotion } from '../src/models/promotion.model.js';
import { Coupon } from '../src/models/coupon.model.js';

const promotionInput = {
  title: 'Student Laptop Week',
  description: 'A student offer.',
  code: 'student10',
  discountType: 'percentage',
  discountValue: 10,
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2026-12-31T23:59:59.000Z',
  isActive: true
};
const couponInput = {
  code: 'welcome10',
  description: 'Welcome offer.',
  discountType: 'percentage',
  discountValue: 10,
  usageLimit: 100,
  usedCount: 4,
  expirationDate: '2027-12-31T23:59:59.000Z',
  isActive: true
};

class MockQuery {
  constructor(value) { this.value = value; }
  sort() { return this; }
  skip() { return this; }
  limit() { return this; }
  lean() { return Promise.resolve(this.value); }
}

function makeRecord(Model, input) {
  return new Model({ ...input, _id: new mongoose.Types.ObjectId() });
}

function mockList(Model, items, totalItems) {
  vi.spyOn(Model, 'find').mockReturnValue(new MockQuery(items));
  vi.spyOn(Model, 'countDocuments').mockResolvedValue(totalItems);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Promotion API', () => {
  it('creates a promotion with a normalized code', async () => {
    const promotion = makeRecord(Promotion, promotionInput);
    vi.spyOn(Promotion, 'create').mockResolvedValue(promotion);
    const response = await request(app).post('/api/promotions').send(promotionInput);
    expect(response.status).toBe(201);
    expect(response.body.data.code).toBe('STUDENT10');
  });

  it('lists promotions with pagination and search', async () => {
    mockList(Promotion, [makeRecord(Promotion, promotionInput)], 1);
    const response = await request(app).get('/api/promotions?search=student&page=1&limit=5');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 5, totalItems: 1, totalPages: 1 });
  });

  it('retrieves, updates, and deletes a promotion', async () => {
    const promotion = makeRecord(Promotion, promotionInput);
    vi.spyOn(Promotion, 'findById')
      .mockReturnValueOnce(new MockQuery(promotion.toObject()))
      .mockResolvedValueOnce(promotion);
    vi.spyOn(promotion, 'save').mockResolvedValue(promotion);
    vi.spyOn(Promotion, 'findByIdAndDelete').mockResolvedValue(promotion);

    const read = await request(app).get(`/api/promotions/${promotion.id}`);
    expect(read.status).toBe(200);
    expect(read.body.data._id).toBe(promotion.id);

    const updated = await request(app).put(`/api/promotions/${promotion.id}`).send({ discountValue: 20 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.discountValue).toBe(20);

    const deleted = await request(app).delete(`/api/promotions/${promotion.id}`);
    expect(deleted.status).toBe(200);
  });

  it('returns 404 for a missing promotion', async () => {
    vi.spyOn(Promotion, 'findById').mockReturnValue(new MockQuery(null));
    const response = await request(app).get(`/api/promotions/${new mongoose.Types.ObjectId()}`);
    expect(response.status).toBe(404);
  });

  it('rejects invalid input and malformed IDs', async () => {
    const invalid = await request(app).post('/api/promotions').send({ ...promotionInput, discountValue: 101 });
    expect(invalid.status).toBe(400);
    const badId = await request(app).get('/api/promotions/not-an-id');
    expect(badId.status).toBe(400);
  });

  it('returns conflict for a duplicate code', async () => {
    vi.spyOn(Promotion, 'create').mockRejectedValue({ code: 11000 });
    const response = await request(app).post('/api/promotions').send({ ...promotionInput, title: 'Another promotion' });
    expect(response.status).toBe(409);
  });
});

describe('Coupon API', () => {
  it('creates and lists coupons', async () => {
    const coupon = makeRecord(Coupon, couponInput);
    vi.spyOn(Coupon, 'create').mockResolvedValue(coupon);
    const created = await request(app).post('/api/coupons').send(couponInput);
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe('WELCOME10');

    mockList(Coupon, [coupon.toObject()], 1);
    const listed = await request(app).get('/api/coupons?status=active');
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
  });

  it('updates and deletes a coupon', async () => {
    const coupon = makeRecord(Coupon, couponInput);
    vi.spyOn(Coupon, 'findById').mockResolvedValue(coupon);
    vi.spyOn(coupon, 'save').mockResolvedValue(coupon);
    vi.spyOn(Coupon, 'findByIdAndDelete').mockResolvedValue(coupon);
    const updated = await request(app).put(`/api/coupons/${coupon.id}`).send({ usedCount: 5 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.usedCount).toBe(5);

    const unlimited = await request(app).put(`/api/coupons/${coupon.id}`).send({ usageLimit: null });
    expect(unlimited.status).toBe(200);
    expect(unlimited.body.data.usageLimit).toBeNull();

    const deleted = await request(app).delete(`/api/coupons/${coupon.id}`);
    expect(deleted.status).toBe(200);
  });

  it('rejects coupons that exceed their usage limit', async () => {
    const response = await request(app)
      .post('/api/coupons')
      .send({ ...couponInput, usedCount: 101 });
    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'usedCount' })
    ]));
  });
});

it('returns promotion and coupon statistics', async () => {
  const promotionFilters = [];
  const couponFilters = [];
  vi.spyOn(Promotion, 'countDocuments').mockImplementation(async (filter = {}) => {
    promotionFilters.push(filter);
    if (filter.endDate?.$lt) return 2;
    if (filter.startDate?.$gt) return 3;
    if (filter.startDate?.$lte) return 4;
    return 9;
  });
  vi.spyOn(Coupon, 'countDocuments').mockImplementation(async (filter = {}) => {
    couponFilters.push(filter);
    return filter.isActive ? 5 : 6;
  });

  const response = await request(app).get('/api/promotions/stats');
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({
    totalPromotions: 9,
    activePromotions: 4,
    expiredPromotions: 2,
    upcomingPromotions: 3,
    totalCoupons: 6,
    availableCoupons: 5
  });
  expect(promotionFilters).toHaveLength(4);
  expect(couponFilters[1]).toMatchObject({ isActive: true, expirationDate: { $gte: expect.any(Date) } });
});

it('enforces model-level discount and coupon usage rules', async () => {
  const zeroDiscount = makeRecord(Promotion, { ...promotionInput, discountValue: 0 });
  await expect(zeroDiscount.validate()).rejects.toMatchObject({ name: 'ValidationError' });

  const invalidDateRange = makeRecord(Promotion, {
    ...promotionInput,
    startDate: '2026-12-01',
    endDate: '2026-11-01'
  });
  await expect(invalidDateRange.validate()).rejects.toMatchObject({ name: 'ValidationError' });

  const overusedCoupon = makeRecord(Coupon, { ...couponInput, usedCount: 101 });
  await expect(overusedCoupon.validate()).rejects.toMatchObject({ name: 'ValidationError' });
});

it('reports a disconnected database from the health endpoint', async () => {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(503);
  expect(response.body.data.database).toBe('disconnected');
});
