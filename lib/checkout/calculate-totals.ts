/** Pure checkout total calculation. */
import type { Voucher } from '@/lib/types/voucher'

type AppliedVoucher = Pick<Voucher, 'code' | 'value'>

export function calculateTotals({ subtotal, voucher, loyaltyDiscount, shippingFee = 0 }: {
  subtotal: number
  voucher: AppliedVoucher | null
  loyaltyDiscount: number
  shippingFee?: number
}) {
  const voucherDiscount = voucher ? (subtotal * voucher.value) / 100 : 0
  const total = subtotal - voucherDiscount - loyaltyDiscount + shippingFee

  return {
    voucherDiscount,
    total,
  }
}