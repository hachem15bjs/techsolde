import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, required: true, enum: ['percentage', 'fixed'] },
    discountValue: {
      type: Number,
      required: true,
      validate: { validator: (value) => value > 0, message: 'Discount value must be greater than zero.' }
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

promotionSchema.pre('validate', function validateDateRange(next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date.');
  }
  if (this.discountType === 'percentage' && this.discountValue > 100) {
    this.invalidate('discountValue', 'Percentage discounts cannot exceed 100.');
  }
  next();
});

export const Promotion = mongoose.model('Promotion', promotionSchema);
