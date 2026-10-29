import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, default: '' },
    discountType: { type: String, required: true, enum: ['percentage', 'fixed'] },
    discountValue: {
      type: Number,
      required: true,
      validate: { validator: (value) => value > 0, message: 'Discount value must be greater than zero.' }
    },
    usageLimit: {
      type: Number,
      min: 0,
      validate: { validator: (value) => value == null || Number.isInteger(value), message: 'Usage limit must be a whole number.' },
      default: undefined
    },
    usedCount: {
      type: Number,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Used count must be a whole number.' },
      default: 0
    },
    expirationDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

couponSchema.pre('validate', function validateCoupon(next) {
  if (this.discountType === 'percentage' && this.discountValue > 100) {
    this.invalidate('discountValue', 'Percentage discounts cannot exceed 100.');
  }
  if (this.usageLimit != null && this.usedCount > this.usageLimit) {
    this.invalidate('usedCount', 'Used count cannot exceed the usage limit.');
  }
  next();
});

export const Coupon = mongoose.model('Coupon', couponSchema);
