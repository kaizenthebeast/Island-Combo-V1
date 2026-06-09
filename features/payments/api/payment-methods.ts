'use server'

/**
 * Available Payment Methods (§3.5).
 *
 * Two options: Card (PayPal — this project uses PayPal, not Stripe) and Cash on
 * Delivery. Both are always offered for a normal product cart. (Cash vouchers are
 * a separate buy-now flow paid immediately by card, so there's no digital-vs-COD
 * rule to apply here.)
 */

import type { AvailablePaymentMethods } from '@/shared/types/payment'

export const getAvailablePaymentMethods = async (): Promise<AvailablePaymentMethods> => {
  return {
    methods: [
      {
        type: 'card',
        label: 'Credit or Debit Card',
        description: 'Pay securely online via PayPal.',
        available: true,
      },
      {
        type: 'cod',
        label: 'Cash on Delivery',
        description: 'Pay with cash to the courier on delivery.',
        available: true,
      },
    ],
  }
}
