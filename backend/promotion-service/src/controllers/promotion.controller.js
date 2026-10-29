import { Promotion } from '../models/promotion.model.js';
import { Coupon } from '../models/coupon.model.js';
import { promotionSchema } from '../validators/promotion.validator.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { getRecord, listRecords, updateRecord, validateId } from '../services/crud.service.js';

export const listPromotions = asyncHandler(async (request, response) => {
  const result = await listRecords(Promotion, request.query, ['title', 'code']);
  response.json({ success: true, data: result.items, meta: result.meta });
});

export const getPromotion = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await getRecord(Promotion, request.params.id) });
});

export const createPromotion = asyncHandler(async (request, response) => {
  const promotion = await Promotion.create(request.validatedBody);
  response.status(201).json({ success: true, data: promotion });
});

export const updatePromotion = asyncHandler(async (request, response) => {
  const promotion = await updateRecord(
    Promotion,
    request.params.id,
    request.validatedBody,
    promotionSchema
  );
  response.json({ success: true, data: promotion });
});

export const deletePromotion = asyncHandler(async (request, response) => {
  validateId(request.params.id);
  const promotion = await Promotion.findByIdAndDelete(request.params.id);
  if (!promotion) throw new ApiError(404, 'Promotion not found.');
  response.json({ success: true, message: 'Promotion deleted successfully.', data: { id: promotion.id } });
});

export const getPromotionStats = asyncHandler(async (request, response) => {
  const now = new Date();
  const [totalPromotions, activePromotions, expiredPromotions, upcomingPromotions, totalCoupons, availableCoupons] =
    await Promise.all([
      Promotion.countDocuments(),
      Promotion.countDocuments({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }),
      Promotion.countDocuments({ endDate: { $lt: now } }),
      Promotion.countDocuments({ isActive: true, startDate: { $gt: now }, endDate: { $gte: now } }),
      Coupon.countDocuments(),
      Coupon.countDocuments({
        isActive: true,
        expirationDate: { $gte: now },
        $or: [
          { usageLimit: { $exists: false } },
          { usageLimit: null },
          { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
        ]
      })
    ]);

  response.json({
    success: true,
    data: { totalPromotions, activePromotions, expiredPromotions, upcomingPromotions, totalCoupons, availableCoupons }
  });
});
