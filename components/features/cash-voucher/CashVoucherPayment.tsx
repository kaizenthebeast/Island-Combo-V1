'use client'

import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js'
import type { CashVoucherFormValues } from '@/lib/validations/cash-voucher'
import { CONVENIENCE_FEE, chargeTotal } from '@/lib/cash-vouchers/pricing'
import type { CashVoucher } from '@/types/cash-voucher'

// Must be NEXT_PUBLIC_: this runs in the browser, where only NEXT_PUBLIC_ vars
// exist. The PayPal client id is public by design (the SDK needs it client-side).
const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

// PayPal's style allowlist only covers the input text/spacing inside the iframe
// (not borders or the card icon). We use it solely to shrink the field height
// via padding — smaller vertical padding = shorter field.
const cardFieldStyle = {
  input: { 'font-size': '14px', padding: '8px 12px' },
}

type Props = {
  onPaid: (voucher: CashVoucher) => void
}

const OrderSummary = ({
  voucherValue,
  recipientName,
}: {
  voucherValue: number
  recipientName: string
}) => (
  <div className="-mx-5 sm:-mx-6 mt-5 bg-pink-50 px-5 sm:px-6 py-5 space-y-2">
    <h3 className="text-base font-bold text-center mb-1">Order Summary</h3>
    <div className="flex justify-between text-sm text-gray-600">
      <span>Recipient name</span>
      <span>{recipientName || '-'}</span>
    </div>
    <div className="flex justify-between text-sm text-gray-600">
      <span>Voucher value</span>
      <span>${voucherValue.toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-sm text-gray-600">
      <span>Convenience fee</span>
      <span>${CONVENIENCE_FEE.toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-base font-bold pt-3 mt-1 border-t border-pink-200">
      <span>Total</span>
      <span className="text-brand">${chargeTotal(voucherValue).toFixed(2)}</span>
    </div>
  </div>
)

// Placeholder shown while the PayPal SDK + card-field iframes are still loading.
const FieldsSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-11 rounded-lg bg-gray-100" />
    <div className="h-11 rounded-lg bg-gray-100" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-11 rounded-lg bg-gray-100" />
      <div className="h-11 rounded-lg bg-gray-100" />
    </div>
  </div>
)

// Pay-now must live inside PayPalCardFieldsProvider to submit the hosted fields.
const PayNowButton = ({
  pending,
  setPending,
  setError,
}: {
  pending: boolean
  setPending: (v: boolean) => void
  setError: (v: string | null) => void
}) => {
  const { cardFieldsForm } = usePayPalCardFields()

  const onPay = async () => {
    if (!cardFieldsForm) return
    setError(null)
    setPending(true)
    try {
      await cardFieldsForm.submit()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onPay}
      disabled={pending || !cardFieldsForm}
      className="mt-5 w-full py-3 rounded-full bg-brand text-white font-semibold text-sm tracking-wide hover:bg-brand-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Processing…' : 'Pay now'}
    </button>
  )
}

const CashVoucherPayment = ({ onPaid }: Props) => {
  if (!CLIENT_ID) {
    return (
      <p className="text-sm text-red-500">
        PayPal is not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID.
      </p>
    )
  }
  // The SDK provider lives in CashVoucherContainer (preloaded on page entry).
  return <PaymentInner onPaid={onPaid} />
}

const PaymentInner = ({ onPaid }: Props) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer()
  const { getValues, watch } = useFormContext<CashVoucherFormValues>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Stable idempotency key for this payment attempt. A retry reuses it (no
  // duplicate order); going back and returning remounts → a fresh key.
  const [requestId] = useState(() => crypto.randomUUID())

  const voucherValue = watch('amount') || 0
  const recipientName = `${watch('firstName') ?? ''} ${watch('lastName') ?? ''}`.trim()

  // 1. Create the order on our server (amount is validated/charged there).
  const createOrder = async (): Promise<string> => {
    const res = await fetch('/api/paypal/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: getValues('amount'), requestId }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message ?? 'Could not start the payment.')
    return json.data.id as string
  }

  // 2. After PayPal approves, capture + create the voucher on our server.
  const onApprove = async (data: { orderID: string }) => {
    const res = await fetch(`/api/paypal/orders/${data.orderID}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientName: `${getValues('firstName')} ${getValues('lastName')}`.trim(),
        recipientEmail: getValues('email'),
      }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message ?? 'Payment could not be completed.')
    onPaid(json.data.voucher as CashVoucher)
  }

  const onError = (err: Record<string, unknown>) => {
    setError(typeof err?.message === 'string' ? err.message : 'Payment failed. Please try again.')
    setPending(false)
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Payment Method</h2>

      {isRejected ? (
        <p className="text-sm text-red-500">Couldn&apos;t load PayPal. Please refresh and try again.</p>
      ) : isPending ? (
        <>
          <FieldsSkeleton />
          <OrderSummary voucherValue={voucherValue} recipientName={recipientName} />
          <button
            type="button"
            disabled
            className="mt-5 w-full py-3 rounded-full bg-brand text-white font-semibold text-sm tracking-wide opacity-60 cursor-not-allowed"
          >
            Loading…
          </button>
        </>
      ) : (
        <PayPalCardFieldsProvider
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          style={cardFieldStyle}
        >
          {/* PayPal's default card fields — single (PayPal) border, no custom CSS. */}
          <div className="space-y-3">
            <PayPalNameField placeholder="Name on card" />
            <PayPalNumberField placeholder="Card number" />
            <div className="grid grid-cols-2 gap-3">
              <PayPalExpiryField placeholder="Expires" />
              <PayPalCVVField placeholder="CSC" />
            </div>
          </div>

          <OrderSummary voucherValue={voucherValue} recipientName={recipientName} />

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <PayNowButton pending={pending} setPending={setPending} setError={setError} />
        </PayPalCardFieldsProvider>
      )}
    </div>
  )
}

export default CashVoucherPayment
