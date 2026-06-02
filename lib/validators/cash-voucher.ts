/** Zod schema for cash-voucher purchase. */
import { z } from 'zod'

// Cash voucher purchase form (3 steps → DB voucher). All steps share one schema;
// the form validates each step's fields before advancing (see CASH_VOUCHER_STEP_FIELDS).

export const cashVoucherSchema = z.object({
  // Step 1 — amount. Set via the preset buttons or the custom input.
  amount: z
    .number({ error: 'Please select or enter an amount.' })
    .positive('Please select or enter an amount.'),

  // UI-only helpers kept in form state so the selection survives step navigation.
  // Not sent to the database.
  selectedIndex: z.number().nullable().optional(),
  customAmount: z.string().optional(),

  // Step 2 — recipient.
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),

  // Step 3 — payment is handled by PayPal's hosted Card Fields. Card data is
  // entered in PayPal-hosted iframes and never enters this form or our server.
})

export type CashVoucherFormValues = z.infer<typeof cashVoucherSchema>

// Fields owned by each step — used with react-hook-form's `trigger()` to gate
// advancing to the next step.
export const CASH_VOUCHER_STEP_FIELDS = {
  1: ['amount'],
  2: ['firstName', 'lastName', 'email'],
} as const satisfies Record<number, readonly (keyof CashVoucherFormValues)[]>
