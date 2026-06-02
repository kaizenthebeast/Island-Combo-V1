'use client'

import React from 'react'
import { useCheckoutStore, type PaymentMethod as PaymentMethodValue } from '@/lib/store/checkout-store'
import { PayPalSdk } from '@/components/functional-ui/PayPalSdk'
import CardPaymentFields from '@/components/functional-ui/placeOrder/CardPaymentFields'

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

      <PayPalSdk>
        <div className="flex flex-col gap-4 relative">
          {OPTIONS.map((opt) => {
            const selected = paymentMethod === opt.value
            return (
              <label
                key={opt.value}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${selected ? 'border-brand bg-brand-tint/40' : 'border-border hover:border-brand/40'
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

          {/* Inline reveal under the options — mirrors the add-address form reveal */}
          {paymentMethod === 'cod' && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              You’ll pay with cash to the courier when your order is delivered.
            </div>
          )}

          {/* Card box stays mounted so the PayPal SDK + hosted-field iframes
              preload during page idle — selecting "Card" then reveals an
              already-initialized form instantly. When not selected it's parked
              offscreen at full width (NOT display:none) so the iframes still
              initialize at the correct size and don't render blank. */}
          <div
            aria-hidden={paymentMethod !== 'card'}
            className={
              paymentMethod === 'card'
                ? ''
                : 'pointer-events-none absolute inset-x-0 top-0 -z-10 opacity-0'
            }
          >
            <div className="rounded-xl border border-border p-5 shadow-xs">
              <h3 className="text-base font-bold text-foreground mb-4">Card details</h3>
              <CardPaymentFields />
            </div>
          </div>
        </div>
      </PayPalSdk>
    </div>
  )
}

export default PaymentMethod
