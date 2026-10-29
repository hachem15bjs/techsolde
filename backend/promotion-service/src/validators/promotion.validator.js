import { z } from 'zod';

const dateValue = z.coerce.date();

const promotionFields = z.object({
    title: z.string().trim().min(1, 'Title is required.').max(120),
    description: z.string().trim().max(1000).optional().default(''),
    code: z.string().trim().min(1, 'Code is required.').max(40).transform((value) => value.toUpperCase()),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.coerce.number().positive('Discount value must be greater than zero.'),
    startDate: dateValue,
    endDate: dateValue,
    isActive: z.boolean().optional().default(true)
  });

export const promotionSchema = promotionFields.superRefine((value, context) => {
    if (value.discountType === 'percentage' && value.discountValue > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Percentage discounts cannot exceed 100.'
      });
    }
    if (value.endDate <= value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date.'
      });
    }
});

export const promotionUpdateSchema = promotionFields.partial();
