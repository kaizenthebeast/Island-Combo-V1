import { z } from 'zod'

// Validates the Add Card form. NOTE: card_number and cvv are validated for shape
// only and are NEVER persisted or sent to the server — the client derives the
// brand + last 4 from the number and discards the rest (see AddCardSheet).
export const addCardSchema = z
  .object({
    cardholder_name: z.string().trim().min(2, 'Name on card is required').max(80),
    card_number: z
      .string()
      .refine((s) => /^[0-9]{13,19}$/.test(s.replace(/[\s-]/g, '')), 'Enter a valid card number'),
    expiry: z
      .string()
      .refine((s) => /^(0[1-9]|1[0-2])\s*\/?\s*[0-9]{2}$/.test(s.trim()), 'Use MM/YY'),
    cvv: z.string().refine((s) => /^[0-9]{3,4}$/.test(s.trim()), 'Invalid security code'),
  })
  .superRefine((val, ctx) => {
    const exp = val.expiry.replace(/[^\d]/g, '')
    if (exp.length === 4) {
      const month = parseInt(exp.slice(0, 2), 10)
      const year = 2000 + parseInt(exp.slice(2, 4), 10)
      // valid through the last day of the expiry month
      const expires = new Date(year, month, 0, 23, 59, 59)
      if (expires < new Date()) {
        ctx.addIssue({ code: 'custom', path: ['expiry'], message: 'Card has expired' })
      }
    }
  })

export type AddCardFormValues = z.infer<typeof addCardSchema>
