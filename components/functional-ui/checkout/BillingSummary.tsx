'use client'

import React, { useMemo } from 'react'
import { CircleDollarSign } from 'lucide-react'
import VoucherCodeForm from '@/components/forms/PromoCodeForm'
import { Switch } from '@/components/ui/switch'
import { useCheckoutStore } from '@/store/useCheckoutStore'
import { calculateTotals } from '@/helper/pricing/calculateTotals'
import Link from 'next/link'

type Props = {
  totalQty: number
  subtotal: number
}

const BillingSummary = ({ totalQty, subtotal }: Props) => {
  const { voucher, loyaltyEnabled, setVoucher, toggleLoyalty, loyaltyPoints } = useCheckoutStore()
  const loyaltyDiscount = loyaltyEnabled ? loyaltyPoints : 0

  const { voucherDiscount, total } = useMemo(() => {
    return calculateTotals({
      subtotal,
      voucher,
      loyaltyDiscount,
    })
  }, [subtotal, voucher, loyaltyDiscount])

  return (
    <div className="bg-gray-50 rounded-2xl p-5 space-y-6">

      {/* VOUCHER */}
      <VoucherCodeForm
        setVoucher={setVoucher}
        activeVoucher={voucher}
      />

      {/* LOYALTY */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 p-2 rounded-full">
            <CircleDollarSign className="text-yellow-600" size={18} />
          </div>
          <div>
            <p className="text-sm font-medium">300 Loyalty Points ($3)</p>
            <p className="text-xs text-[#900036]">Custom loyalty points to use</p>
          </div>
        </div>
        <Switch checked={loyaltyEnabled} onCheckedChange={toggleLoyalty} />
      </div>

      <hr />

      {/* SUMMARY */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Billing Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal ({totalQty} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>- ${voucherDiscount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-green-600">
            <span>Loyalty points</span>
            <span>- ${loyaltyDiscount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Shipping fee</span>
            <span>Calculated at checkout</span>
          </div>
        </div>

        <hr />

        {/* TOTAL */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-gray-800">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* CHECKOUT */}
      <Link
        href="/checkout/address"
        className="w-full bg-[#900036] text-white py-3 rounded-full font-medium hover:opacity-90 transition text-center inline-block"
      >
        Checkout
      </Link>

    </div>
  )
}

export default BillingSummary