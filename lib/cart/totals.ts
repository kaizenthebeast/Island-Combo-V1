/** Pure, server-side cart total calculation (§3.3 Fetch Cart / §3.9 pricing). */
import type { CartItem, CartTotals } from '@/lib/types/cart'
import { pointsToCash } from './loyalty-config'

export const round2 = (n: number) => Math.round(n * 100) / 100

// The trusted unit price for a line: the tier-resolved price from cart_view,
// falling back the same way the cart UI does.
export const unitPriceOf = (item: CartItem) =>
  item.applied_price || item.final_price || item.price

export function computeCartTotals({
  items,
  promo,
  pointsRedeemed,
  hasDigital,
}: {
  items: CartItem[]
  promo: { code: string; value: number } | null
  pointsRedeemed: number
  hasDigital: boolean
}): CartTotals {
  const subtotal = round2(items.reduce((sum, i) => sum + unitPriceOf(i) * i.quantity, 0))

  // Digital carts can take neither a promo discount nor a points redemption.
  const effectivePromo = hasDigital ? null : promo
  const promoDiscount = effectivePromo ? round2((subtotal * effectivePromo.value) / 100) : 0

  // Points redemption is capped so the order total can never go negative.
  const pointsCash = hasDigital ? 0 : pointsToCash(pointsRedeemed)
  const pointsDiscount = round2(Math.min(pointsCash, Math.max(0, subtotal - promoDiscount)))

  const total = round2(Math.max(0, subtotal - promoDiscount - pointsDiscount))

  return {
    subtotal,
    promoCode: effectivePromo?.code ?? null,
    promoValue: effectivePromo?.value ?? null,
    promoDiscount,
    pointsRedeemed: hasDigital ? 0 : pointsRedeemed,
    pointsDiscount,
    total,
    hasDigital,
  }
}
