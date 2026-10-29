import { Router } from 'express';
import {
  createCoupon,
  deleteCoupon,
  getCoupon,
  listCoupons,
  updateCoupon
} from '../controllers/coupon.controller.js';
import { validate } from '../middlewares/validate.js';
import { couponSchema, couponUpdateSchema } from '../validators/coupon.validator.js';

const router = Router();

router.get('/', listCoupons);
router.get('/:id', getCoupon);
router.post('/', validate(couponSchema), createCoupon);
router.put('/:id', validate(couponUpdateSchema, { partial: true }), updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;
