'use client'
import OrderSummary from "@/components/public/layout/OrderSummary"
import React, { useState } from 'react'
import { CircleDollarSign } from "lucide-react"

const CheckoutContainer = () => {
  const [loyalty, setLoyalty] = useState(true)

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">

      {/* LEFT */}
      <div className="w-full md:w-2/3">
        <OrderSummary />
      </div>

      {/* RIGHT */}
      <div className="w-full md:w-1/3">

        <div className="bg-gray-50 rounded-2xl p-5 space-y-6">

          {/* PROMO */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">
              Apply Promo Code
            </h3>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Promo code"
                className="flex-1 bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#900036]"
              />
              <button
                type="button"
                className="text-[#900036] font-medium text-sm"
              >
                Apply
              </button>
            </div>
          </div>

          {/* LOYALTY */}
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-full">
                <CircleDollarSign className="text-yellow-600" size={18} />
              </div>

              <div>
                <p className="text-sm font-medium">
                  300 Loyalty Points ($3)
                </p>
                <p className="text-xs text-[#900036]">
                  Custom loyalty points to use
                </p>
              </div>
            </div>

            {/* Toggle */}
            <button
              onClick={() => setLoyalty(!loyalty)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition ${loyalty ? "bg-[#900036]" : "bg-gray-300"
                }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${loyalty ? "translate-x-5" : ""
                  }`}
              />
            </button>
          </div>

          <hr className="border-gray-200" />

          {/* SUMMARY */}
          <div className="space-y-4">

            <h3 className="text-lg font-semibold">
              Order Summary
            </h3>

            <div className="space-y-3 text-sm">

              <div className="flex justify-between text-gray-700">
                <span>Subtotal (14 items)</span>
                <span>$81,589.00</span>
              </div>

              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-$31,500.00</span>
              </div>

              <div className="flex justify-between text-green-600">
                <span>Loyalty points</span>
                <span>-$3.00</span>
              </div>

              <div className="flex justify-between text-gray-400">
                <span>Shipping fee</span>
                <span>Calculated at checkout</span>
              </div>

            </div>

            <hr className="border-gray-200" />

            {/* TOTAL */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                Total
              </span>
              <span className="text-2xl font-bold text-gray-800">
                $61,009.00
              </span>
            </div>
          </div>

          {/* BUTTON */}
          <button
            type="button"
            className="w-full bg-[#900036] text-white py-3 rounded-full font-medium hover:opacity-90 transition"
          >
            Checkout
          </button>

        </div>

      </div>

    </div>
  )
}

export default CheckoutContainer