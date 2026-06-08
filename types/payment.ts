/** Payment Method Management types (§3.5). */

import type { ProductPaymentMethod } from '@/types/order'

// The selectable methods. We use PayPal (not Stripe), so 'card' is "pay by card
// via PayPal". Mirrors the checkout-store's PaymentMethod union.
export type PaymentMethodType = ProductPaymentMethod // 'cod' | 'card'

// One offered payment method. Unavailable options are kept in the list (with a
// reason) rather than dropped, so the UI can explain *why* — e.g. the §3.9 rule
// that a cart with a digital product can't be paid Cash on Delivery.
export type PaymentMethodOption = {
  type: PaymentMethodType
  label: string
  description: string
  available: boolean
  unavailableReason?: string
}

// The Fetch Available Payment Methods response.
export type AvailablePaymentMethods = {
  methods: PaymentMethodOption[]
}

// ── public.payments — one row per order payment ──────────────────────────────
// Payment facts normalized out of `orders` (migration 0027). create_order writes
// one row per order; refunds / extra attempts get their own rows later.

export type PaymentMethodKind = 'cod' | 'card'
export type PaymentProvider   = 'cod' | 'paypal'
export type PaymentStatus     = 'pending' | 'completed' | 'cancelled' | 'refunded'

export type Payment = {
  id: number
  order_id: number
  method: PaymentMethodKind
  provider: PaymentProvider
  amount: number
  currency: string
  status: PaymentStatus
  paypal_order_id: string | null
  paypal_capture_id: string | null
  payer_email: string | null
  captured_at: string | null
  created_at: string
}
