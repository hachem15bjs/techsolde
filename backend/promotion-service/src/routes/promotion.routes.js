import { Router } from 'express';
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  getPromotionStats,
  listPromotions,
  updatePromotion
} from '../controllers/promotion.controller.js';
import { validate } from '../middlewares/validate.js';
import { promotionSchema, promotionUpdateSchema } from '../validators/promotion.validator.js';

const router = Router();

router.get('/', listPromotions);
router.get('/stats', getPromotionStats);
router.get('/:id', getPromotion);
router.post('/', validate(promotionSchema), createPromotion);
router.put('/:id', validate(promotionUpdateSchema, { partial: true }), updatePromotion);
router.delete('/:id', deletePromotion);

export default router;
