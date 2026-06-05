/** Zod schema for promo-code forms. */
import { z } from 'zod'

// Reusable field definitions

const codeField = z
  .string()
  .min(1, 'Promo code is required')
  .max(32, 'Promo code must be 32 characters or less')
  .regex(/^[A-Z0-9_-]+$/i, 'Only letters, numbers, hyphens, and underscores are allowed')
  .transform((v) => v.toUpperCase())

const valueField = z
  .number()
  .positive('Discount value must be greater than 0')
  .max(100, 'Discount value cannot exceed 100')

const minQuantityField = z
  .number()
  .int('Minimum quantity must be a whole number')
  .min(0, 'Minimum quantity cannot be negative')
  .nullable()
  .optional()

const expiresAtField = z
  .string()
  .nullable()
  .optional()
  .refine(
    (v) => !v || new Date(v) > new Date(),
    { message: 'Expiry date must be in the future' }
  )

// Add

export const addPromoCodeSchema = z.object({
  code:         codeField,
  value:        valueField,
  min_quantity: minQuantityField,
  expires_at:   expiresAtField,
  status:       z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
})
export type AddPromoCodeFormValues = z.input<typeof addPromoCodeSchema>

// Edit

export const editPromoCodeSchema = z.object({
  code:         codeField,
  value:        valueField,
  min_quantity: minQuantityField,
  expires_at:   expiresAtField,
  status:       z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
})

export type EditPromoCodeFormValues = z.infer<typeof editPromoCodeSchema>

// Apply (customer-side promo code input)

export const applyPromoCodeSchema = z.object({
  promoCode: z
    .string()
    .min(3, 'Promo code must be at least 3 characters')
    .max(32, 'Promo code must be 32 characters or less'),
})

export type ApplyPromoCodeFormValues = z.infer<typeof applyPromoCodeSchema>
