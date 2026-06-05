'use client'

import React, { useMemo } from 'react'
import { CircleDollarSign } from 'lucide-react'
import VoucherCodeForm from '@/components/features/promo/PromoCodeForm'
import { Switch } from '@/components/ui/switch'
import { useCheckoutStore } from '@/lib/store/checkout-store'
import { useCartStore } from '@/lib/store/cart-store'
import { calculateTotals } from '@/lib/checkout/calculate-totals'
import Link from 'next/link'

type Props = {
  totalQty: number
  subtotal: number
}

const BillingSummary = ({ totalQty, subtotal }: Props) => {
  const { voucher, loyaltyEnabled, setVoucher, toggleLoyalty, loyaltyPoints } = useCheckoutStore()
  const { cart, selectedIds } = useCartStore()
  const loyaltyDiscount = loyaltyEnabled ? loyaltyPoints : 0

  // Vouchers can't combine with wholesale pricing — ignore any applied voucher
  // when a selected item is wholesale-priced.
  const hasWholesale = cart.some(
    (i) => selectedIds.includes(i.variant_id) && i.applied_tier_label === 'wholesale'
  )
  const effectiveVoucher = hasWholesale ? null : voucher

  const { voucherDiscount, total } = useMemo(() => {
    return calculateTotals({
      subtotal,
      voucher: effectiveVoucher,
      loyaltyDiscount,
    })
  }, [subtotal, effectiveVoucher, loyaltyDiscount])

  return (
    <div className="bg-surface-soft rounded-2xl p-5 space-y-6">

      {/* VOUCHER */}
      <VoucherCodeForm
        setVoucher={setVoucher}
        activeVoucher={voucher}
      />

      {/* LOYALTY */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-warning-tint p-2 rounded-full">
            <CircleDollarSign className="text-warning" size={18} />
          </div>
          <div>
            <p className="text-sm font-medium">300 Loyalty Points ($3)</p>
            <p className="text-xs text-brand">Custom loyalty points to use</p>
          </div>
        </div>
        <Switch checked={loyaltyEnabled} onCheckedChange={toggleLoyalty} />
      </div>

      <hr />

      {/* SUMMARY */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Order Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-foreground">
            <span>Subtotal ({totalQty} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-success">
            <span>Discount</span>
            <span>- ${voucherDiscount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-success">
            <span>Loyalty points</span>
            <span>- ${loyaltyDiscount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Shipping fee</span>
            <span>Calculated at checkout</span>
          </div>
        </div>

        <hr />

        {/* TOTAL */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-foreground">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* CHECKOUT */}
      {totalQty > 0 ? (
        <Link
          href="/checkout/address"
          className="w-full bg-brand text-white py-3 rounded-full font-medium hover:opacity-90 transition text-center inline-block"
        >
          Checkout
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="w-full bg-brand/40 text-white py-3 rounded-full font-medium text-center cursor-not-allowed"
        >
          Checkout
        </button>
      )}

    </div>
  )
}

export default BillingSummary