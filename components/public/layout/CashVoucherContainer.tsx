'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import CashVoucherFormContainer from '@/components/functional-ui/cashVoucher/cashVoucherFormContainer'
import CashVoucherSuccess from '@/components/functional-ui/cashVoucher/CashVoucherSuccess'
import {
  cashVoucherSchema,
  CASH_VOUCHER_STEP_FIELDS,
  type CashVoucherFormValues,
} from '@/form-schema/cashVoucherSchema'
import type { CashVoucher } from '@/types/cashVoucher'

const SUCCESS_STEP = 4
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

const CashVoucherContainer = () => {
  // Step + the created voucher live here so the whole layout can switch to the
  // success view; the form data itself is owned by react-hook-form below.
  const [step, setStep] = useState(1)
  const [voucher, setVoucher] = useState<CashVoucher | null>(null)

  const methods = useForm<CashVoucherFormValues>({
    resolver: zodResolver(cashVoucherSchema),
    defaultValues: {
      amount: undefined,
      selectedIndex: null,
      customAmount: '',
      firstName: '',
      lastName: '',
      email: '',
    },
  })

  const { trigger, reset } = methods

  // Validate only the current step's fields before advancing (steps 1 & 2).
  const handleNext = async () => {
    if (step >= 3) return
    const fields = CASH_VOUCHER_STEP_FIELDS[step as 1 | 2]
    const valid = await trigger(fields as unknown as (keyof CashVoucherFormValues)[])
    if (valid) setStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  // Step 3's PayPal flow creates the voucher server-side after a confirmed
  // capture, then hands it back here.
  const handlePaid = (created: CashVoucher) => {
    setVoucher(created)
    setStep(SUCCESS_STEP)
  }

  const handleReset = () => {
    reset()
    setVoucher(null)
    setStep(1)
  }

  // Payment successful → replace the entire two-column layout.
  if (step === SUCCESS_STEP && voucher) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        <CashVoucherSuccess
          code={voucher.code}
          amount={voucher.amount}
          recipient={voucher.recipient_name}
          recipientEmail={voucher.recipient_email}
          onBuyAgain={handleReset}
        />
      </section>
    )
  }

  return (
    <section className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 px-4 sm:px-6 lg:px-10 py-8 lg:py-12 lg:place-items-center">
      <div className="space-y-4 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Send Cash Instantly</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Easily send and redeem cash in just a few simple steps. Follow the process below to
          ensure a smooth and secure transaction:
        </p>

        <div className="flex items-start gap-3">
          <div className="bg-brand p-2 rounded-full shrink-0">
            <Image src="/images/fastshop.png" alt="Fast Shop" width={24} height={24} />
          </div>
          <div>
            <h4 className="text-brand font-bold">Buy Cash Online</h4>
            <p className="text-sm text-muted-foreground">
              Purchase your cash voucher online in just a few steps.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-brand p-2 rounded-full shrink-0">
            <Image src="/images/qrcode.png" alt="QR Code" width={24} height={24} />
          </div>
          <div>
            <h4 className="text-brand font-bold">Send with Ease</h4>
            <p className="text-sm text-muted-foreground">Share the QR code with your recipient.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-brand p-2 rounded-full shrink-0">
            <Image src="/images/storefront.png" alt="Storefront" width={24} height={24} />
          </div>
          <div>
            <h4 className="text-brand font-bold">Redeem In-Store</h4>
            <p className="text-sm text-muted-foreground">
              Your recipient presents the QR code and a valid ID at the store to receive the cash.{' '}
              <a href="#" className="text-brand underline">
                Island Combo store.
              </a>
            </p>
          </div>
        </div>
      </div>

      <FormProvider {...methods}>
        {/* PayPal SDK loads here (on page entry) so the card fields are ready by
            the time the user reaches step 3 — no wait at the payment step. */}
        <PayPalSdk>
          <div className="w-full">
            <CashVoucherFormContainer
              step={step}
              onNext={handleNext}
              onBack={handleBack}
              onPaid={handlePaid}
            />
          </div>
        </PayPalSdk>
      </FormProvider>
    </section>
  )
}

// Loads the PayPal SDK once for the whole flow (preload). If the client id is
// missing we just render children; CashVoucherPayment shows the config message.
const PayPalSdk = ({ children }: { children: React.ReactNode }) => {
  if (!PAYPAL_CLIENT_ID) return <>{children}</>
  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        components: 'card-fields',
        currency: 'USD',
        intent: 'capture',
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}

export default CashVoucherContainer
