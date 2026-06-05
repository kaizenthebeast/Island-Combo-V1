/** Pure checkout total calculation. */
import type { PromoCode } from '@/lib/types/promo-code'

type AppliedPromoCode = Pick<PromoCode, 'code' | 'value'>

export function calculateTotals({ subtotal, promoCode, loyaltyDiscount, shippingFee = 0 }: {
  subtotal: number
  promoCode: AppliedPromoCode | null
  loyaltyDiscount: number
  shippingFee?: number
}) {
  const promoDiscount = promoCode ? (subtotal * promoCode.value) / 100 : 0
  const total = subtotal - promoDiscount - loyaltyDiscount + shippingFee

  return {
    promoDiscount,
    total,
  }
}
