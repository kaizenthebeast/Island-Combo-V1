/** Payment Method Management types (§3.5). */

import type { ProductPaymentMethod } from '@/lib/types/order'

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
  // Convenience flag mirroring the §3.9 rule (cart holds a digital product),
  // so a client doesn't have to re-derive it from the methods array.
  hasDigitalProduct: boolean
}
