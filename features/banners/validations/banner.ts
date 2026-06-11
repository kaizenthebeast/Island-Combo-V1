/** Zod schemas for the banner & promotion-ad admin forms.
 *  The image itself is NOT validated here — file type/size and the STRICT
 *  exact-dimension check live in promo-image-upload.ts and run before any
 *  upload; the form only persists the storage path the upload returns. */
import { z } from 'zod'

const titleField = z
  .string()
  .min(1, 'Title is required')
  .max(120, 'Title must be 120 characters or less')

const descriptionField = z
  .string()
  .max(300, 'Description must be 300 characters or less')
  .nullable()

const ctaLabelField = z
  .string()
  .max(40, 'Button label must be 40 characters or less')
  .nullable()

const ctaUrlField = z
  .string()
  .max(300, 'Link must be 300 characters or less')
  .nullable()
  .refine(
    (v) => !v || /^(\/|https?:\/\/)/.test(v),
    { message: 'Link must be a full URL or a site path starting with "/"' },
  )

const contentShape = {
  title:         titleField,
  description:   descriptionField,
  cta_label:     ctaLabelField,
  cta_url:       ctaUrlField,
  start_date:    z.string().nullable(), // date input value ("YYYY-MM-DD") — converted to ISO on submit
  end_date:      z.string().nullable(),
  display_order: z.number().int('Display order must be a whole number').min(0, 'Display order cannot be negative'),
  is_active:     z.boolean(),
}

const scheduleIsOrdered = (d: { start_date: string | null; end_date: string | null }) =>
  !d.start_date || !d.end_date || new Date(d.end_date) >= new Date(d.start_date)

const ctaIsComplete = (d: { cta_label: string | null; cta_url: string | null }) =>
  !d.cta_label || !!d.cta_url

export const bannerFormSchema = z
  .object(contentShape)
  .refine(scheduleIsOrdered, { message: 'End date must be on or after the start date', path: ['end_date'] })
  .refine(ctaIsComplete, { message: 'A button label needs a link to go with it', path: ['cta_url'] })

export const promotionAdFormSchema = z
  .object({
    ...contentShape,
    placement: z.enum(['landing', 'checkout', 'cart', 'category', 'product']),
  })
  .refine(scheduleIsOrdered, { message: 'End date must be on or after the start date', path: ['end_date'] })
  .refine(ctaIsComplete, { message: 'A button label needs a link to go with it', path: ['cta_url'] })

export type BannerFormValues      = z.infer<typeof bannerFormSchema>
export type PromotionAdFormValues = z.infer<typeof promotionAdFormSchema>
