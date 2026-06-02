'use client'

import { useState } from 'react'
import {
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js'

// Public by design — the PayPal SDK needs the client id in the browser.
const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

// PayPal's style allowlist only covers the text/spacing inside the field iframes.
const cardFieldStyle = {
  input: { 'font-size': '14px', padding: '8px 12px' },
}

const FieldsSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-11 rounded-lg bg-muted" />
    <div className="h-11 rounded-lg bg-muted" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-11 rounded-lg bg-muted" />
      <div className="h-11 rounded-lg bg-muted" />
    </div>
  </div>
)

/**
 * Inline credit/debit card form, revealed when "Card" is selected at checkout.
 * Renders PayPal's hosted (PCI-compliant) card fields — mirrors the cash-voucher
 * payment UI. Must be rendered inside the <PayPalSdk> provider.
 *
 * UI ONLY for now: createOrder/onApprove are placeholders. Wiring a real charge
 * needs an order-specific PayPal flow (charge the cart total + record the order);
 * the existing /api/paypal/orders endpoints are cash-voucher-specific (they add a
 * fee and create a voucher on capture) and must NOT be reused here.
 */
const CardPaymentFields = () => {
  if (!CLIENT_ID) {
    return (
      <p className="text-sm text-danger">
        PayPal is not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID.
      </p>
    )
  }
  return <CardFieldsInner />
}

const CardFieldsInner = () => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer()
  const [error, setError] = useState<string | null>(null)

  // TODO(order-payment): wire to an order-specific PayPal create+capture that
  // charges the real cart total and records the order. Do NOT reuse
  // /api/paypal/orders (cash-voucher-specific: adds a fee + creates a voucher).
  const createOrder = async (): Promise<string> => {
    throw new Error('Card payment isn’t enabled yet.')
  }
  const onApprove = async () => {
    /* no-op until the order capture endpoint exists */
  }
  const onError = (err: Record<string, unknown>) => {
    setError(typeof err?.message === 'string' ? err.message : 'Payment failed. Please try again.')
  }

  if (isRejected) {
    return <p className="text-sm text-danger">Couldn’t load PayPal. Please refresh and try again.</p>
  }
  if (isPending) return <FieldsSkeleton />

  return (
    <PayPalCardFieldsProvider
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      style={cardFieldStyle}
    >
      <div className="space-y-3">
        <PayPalNameField placeholder="Name on card" />
        <PayPalNumberField placeholder="Card number" />
        <div className="grid grid-cols-2 gap-3">
          <PayPalExpiryField placeholder="Expires" />
          <PayPalCVVField placeholder="CSC" />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <p className="mt-3 text-xs text-muted-foreground">
        Your card is processed securely by PayPal. Use the “Place Order” button to complete your purchase.
      </p>
    </PayPalCardFieldsProvider>
  )
}

export default CardPaymentFields
