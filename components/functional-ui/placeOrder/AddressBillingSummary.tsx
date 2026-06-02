'use client'

import React from 'react'
import { useCartStore } from '@/lib/store/cart-store'
import { useCheckoutStore } from '@/lib/store/checkout-store'
import { calculateTotals } from '@/lib/checkout/calculate-totals'

const AddressBillingSummary = () => {
  const { totalQty, subtotal, cart, selectedIds } = useCartStore()
  const { voucher, loyaltyPoints, loyaltyEnabled, shippingFee, shippingMethod } = useCheckoutStore()

  // Vouchers can't combine with wholesale pricing.
  const hasWholesale = cart.some(
    (i) => selectedIds.includes(i.variant_id) && i.applied_tier_label === 'wholesale'
  )

  const { voucherDiscount, total } = calculateTotals({
    subtotal,
    voucher: hasWholesale ? null : voucher,
    loyaltyDiscount: loyaltyEnabled ? loyaltyPoints : 0,
    shippingFee: shippingFee ?? 0,
  })

  return (
    <div className="w-full md:w-[350px]">
      <div className="bg-surface-soft p-5 rounded-xl space-y-4 sticky top-4">
        <h2 className="font-semibold">Order Summary</h2>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal ({totalQty} items)</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Discount</span>
          <span className="text-success">-${voucherDiscount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Loyalty points</span>
          <span>-${loyaltyPoints.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Shipping fee{shippingMethod ? ` (${shippingMethod})` : ""}</span>
          <span>
            {shippingFee !== null ? `$${shippingFee.toFixed(2)}` : "Pending"}
          </span>
        </div>
        <div className="border-t pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-brand">${total.toFixed(2)}</span>
        </div>
        <button className="w-full bg-brand text-white py-3 rounded-full mt-2">
          Place Order
        </button>
      </div>
    </div>
  )
}

export default AddressBillingSummary