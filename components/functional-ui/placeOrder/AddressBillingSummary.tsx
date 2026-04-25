'use client'
import React, { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { calculateTotals } from '@/helper/pricing/calculateTotals';


const AddressBillingSummary = () => {
  const { cart, totalQty, subtotal } = useCartStore();
  const { promo, loyaltyPoints, loyaltyEnabled } = useCheckoutStore();
  const { promoDiscount, total } = calculateTotals({
    subtotal,
    promo,
    loyaltyDiscount: loyaltyEnabled ? loyaltyPoints : 0,
  });



  return (
    <div className="w-full md:w-[350px]">
      <div className="bg-white p-5 rounded-xl border space-y-4 sticky top-4">
        <h2 className="font-semibold">Order Summary</h2>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal ({totalQty} items)</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Discount</span>
          <span className="text-green-600">-${promoDiscount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Loyalty points</span>
          <span>-${loyaltyPoints.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping fee</span>
          <span>Pending</span>
        </div>
        <div className="border-t pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-pink-600">${total.toFixed(2)}</span>
        </div>
        <button className="w-full bg-pink-700 text-white py-3 rounded-full mt-2">
          Place Order
        </button>
      </div>
    </div>
  )
}

export default AddressBillingSummary