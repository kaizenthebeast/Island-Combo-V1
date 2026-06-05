'use server'

/**
 * Available Payment Methods (§3.5).
 *
 * Base options are ALWAYS Card (PayPal — this project uses PayPal, not Stripe)
 * and COD. The §3.9 rule then applies: if the cart holds any digital product
 * (products.type = 'Digital'), Cash on Delivery makes no sense — there's nothing
 * to hand to a courier — so COD is flagged unavailable. It's kept in the list
 * with available:false (rather than dropped) so the UI can show the reason.
 *
 * Works for both unauthenticated and authenticated sessions: an unauthenticated
 * caller has no server-side cart, so nothing is excluded.
 */

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { DIGITAL_PRODUCT_TYPE } from '@/lib/types/product'
import type { AvailablePaymentMethods } from '@/lib/types/payment'

const COD_DIGITAL_REASON =
  'Cash on Delivery isn’t available when your cart contains a digital product. Please pay by card.'

export const getAvailablePaymentMethods = async (): Promise<AvailablePaymentMethods> => {
  const hasDigital = await cartHasDigitalProduct()

  return {
    hasDigitalProduct: hasDigital,
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
        available: !hasDigital,
        ...(hasDigital ? { unavailableReason: COD_DIGITAL_REASON } : {}),
      },
    ],
  }
}

// True when the caller's cart holds at least one digital product. An
// unauthenticated session has no server-side cart, so this is false.
async function cartHasDigitalProduct(): Promise<boolean> {
  // requireUser returns null when unauthenticated; guard the rare throw (no
  // session at all) so this endpoint stays usable for guests.
  let userId: string | null = null
  try {
    userId = (await requireUser())?.id ?? null
  } catch {
    userId = null
  }
  if (!userId) return false

  const supabase = await createClient()

  // Inner-join the cart up to products and keep only Digital rows; one is enough.
  // RLS (cart_select) scopes this to the caller's own cart.
  const { data, error } = await supabase
    .from('cart')
    .select('variant_id, product_variants!inner(products!inner(type))')
    .eq('user_id', userId)
    .eq('product_variants.products.type', DIGITAL_PRODUCT_TYPE)
    .limit(1)

  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}
