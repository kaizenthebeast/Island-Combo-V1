'use client'

import React from 'react'
import { useCheckoutStore, type PaymentMethod as PaymentMethodValue } from '@/store/useCheckoutStore'

const OPTIONS: { value: PaymentMethodValue; title: string; desc?: string }[] = [
  { value: 'cod', title: 'Cash On Delivery', desc: 'Pay to courier via cash upon delivery' },
  { value: 'card', title: 'Credit or Debit Card' },
]

const PaymentMethod = () => {
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod)
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="title-header">How would you like to pay?</h2>

      <div className="flex flex-col gap-4">
        {OPTIONS.map((opt) => {
          const selected = paymentMethod === opt.value
          return (
            <label
              key={opt.value}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${
                selected ? 'border-brand bg-brand-tint/40' : 'border-border hover:border-brand/40'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{opt.title}</span>
                {opt.desc && (
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                )}
              </div>

              <input
                type="radio"
                name="paymentMethod"
                value={opt.value}
                checked={selected}
                onChange={() => setPaymentMethod(opt.value)}
                className="w-5 h-5 accent-brand cursor-pointer shrink-0"
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default PaymentMethod
