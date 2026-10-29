import { z } from 'zod';

const dateValue = z.coerce.date();

const couponFields = z.object({
    code: z.string().trim().min(1, 'Code is required.').max(40).transform((value) => value.toUpperCase()),
    description: z.string().trim().max(1000).optional().default(''),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.coerce.number().positive('Discount value must be greater than zero.'),
    usageLimit: z.union([z.null(), z.coerce.number().int().min(0)]).optional(),
    usedCount: z.coerce.number().int().min(0).optional().default(0),
    expirationDate: dateValue,
    isActive: z.boolean().optional().default(true)
  });

export const couponSchema = couponFields.superRefine((value, context) => {
    if (value.discountType === 'percentage' && value.discountValue > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Percentage discounts cannot exceed 100.'
      });
    }
    if (value.usageLimit != null && value.usedCount > value.usageLimit) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['usedCount'],
        message: 'Used count cannot exceed the usage limit.'
      });
    }
});

export const couponUpdateSchema = couponFields.partial();
