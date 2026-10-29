import { Coupon } from '../models/coupon.model.js';
import { couponSchema } from '../validators/coupon.validator.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { getRecord, listRecords, updateRecord, validateId } from '../services/crud.service.js';

export const listCoupons = asyncHandler(async (request, response) => {
  const result = await listRecords(Coupon, request.query, ['code', 'description']);
  response.json({ success: true, data: result.items, meta: result.meta });
});

export const getCoupon = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await getRecord(Coupon, request.params.id) });
});

export const createCoupon = asyncHandler(async (request, response) => {
  const coupon = await Coupon.create(request.validatedBody);
  response.status(201).json({ success: true, data: coupon });
});

export const updateCoupon = asyncHandler(async (request, response) => {
  const coupon = await updateRecord(Coupon, request.params.id, request.validatedBody, couponSchema);
  response.json({ success: true, data: coupon });
});

export const deleteCoupon = asyncHandler(async (request, response) => {
  validateId(request.params.id);
  const coupon = await Coupon.findByIdAndDelete(request.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found.');
  response.json({ success: true, message: 'Coupon deleted successfully.', data: { id: coupon.id } });
});
