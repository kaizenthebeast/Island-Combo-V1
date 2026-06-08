'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js'
import { useCartStore } from '@/stores/cart-store'
import { useCheckoutStore } from '@/stores/checkout-store'
import type { ProductCheckoutIntent } from '@/shared/types/order'

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

// Builds the product checkout intent from the live cart + checkout stores.
const buildProductIntent = (): ProductCheckoutIntent => {
  const { selectedIds } = useCartStore.getState()
  const { fulfillment, selectedAddressId, promoCode, loyaltyEnabled } = useCheckoutStore.getState()
  return {
    kind: 'product',
    selectedVariantIds: selectedIds,
    fulfillment,
    shippingAddressId: fulfillment === 'deliver' ? selectedAddressId : null,
    paymentMethod: 'card',
    promoCode: promoCode?.code ?? null,
    useLoyalty: loyaltyEnabled,
  }
}

/**
 * Inline credit/debit card form, revealed when "Card" is selected at checkout.
 * Renders PayPal's hosted (PCI-compliant) card fields and drives a real order
 * charge through the unified /api/checkout endpoint (create → capture). The card
 * form is submitted by the external "Place Order" button via the checkout
 * store's `submitCard` (mirrors the cash-voucher PayNowButton).
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
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  // Stable idempotency key for this payment attempt (PayPal-Request-Id).
  const [requestId] = useState(() => crypto.randomUUID())

  // 1. Create the order on our server (amount validated/charged there).
  const createOrder = async (): Promise<string> => {
    setError(null)
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'create', intent: buildProductIntent(), requestId }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message ?? 'Could not start the payment.')
    return json.data.id as string
  }

  // 2. After PayPal approves, capture + create the order on our server.
  const onApprove = async (data: { orderID: string }) => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'capture',
        paypalOrderId: data.orderID,
        intent: buildProductIntent(),
      }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message ?? 'Payment could not be completed.')

    const orderRef = json.data?.order?.public_ref
    // Re-sync from the server (create_order removed only the ordered lines) so
    // any unselected items — and the cart count — stay correct.
    await useCartStore.getState().fetchCart()
    useCheckoutStore.getState().resetCheckout()
    router.push(`/checkout/success${orderRef ? `?order=${orderRef}` : ''}`)
  }

  const onError = (err: Record<string, unknown>) => {
    setError(typeof err?.message === 'string' ? err.message : 'Payment failed. Please try again.')
    useCheckoutStore.getState().setPlacing(false)
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
      <CardSubmitRegistrar setError={setError} />

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

// Lives inside PayPalCardFieldsProvider so it can access the hosted-fields form.
// Registers a submit handler in the checkout store so the external "Place Order"
// button can trigger the card submission, then clears it on unmount.
const CardSubmitRegistrar = ({ setError }: { setError: (v: string | null) => void }) => {
  const { cardFieldsForm } = usePayPalCardFields()
  const setSubmitCard = useCheckoutStore((s) => s.setSubmitCard)
  const setPlacing = useCheckoutStore((s) => s.setPlacing)

  useEffect(() => {
    if (!cardFieldsForm) {
      setSubmitCard(null)
      return
    }

    const submit = async () => {
      setError(null)
      setPlacing(true)
      try {
        // Resolves the hosted-fields form; createOrder/onApprove then run.
        await cardFieldsForm.submit()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Payment failed. Please try again.')
        setPlacing(false)
      }
    }

    setSubmitCard(submit)
    return () => setSubmitCard(null)
  }, [cardFieldsForm, setSubmitCard, setPlacing, setError])

  return null
}

export default CardPaymentFields
