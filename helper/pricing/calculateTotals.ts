import type { Voucher } from '@/types/voucher'

type AppliedVoucher = Pick<Voucher, 'code' | 'value'>

export function calculateTotals({ subtotal, voucher, loyaltyDiscount }: {
  subtotal: number
  voucher: AppliedVoucher | null
  loyaltyDiscount: number
}) {
  const voucherDiscount = voucher ? (subtotal * voucher.value) / 100 : 0
  const total = subtotal - voucherDiscount - loyaltyDiscount

  return {
    voucherDiscount,
    total,
  }
}