'use client'

import React from 'react'
import CashVoucherForm from '@/components/features/cash-voucher/CashVoucherForm'
import CashVoucherPayment from '@/components/features/cash-voucher/CashVoucherPayment'
import type { CashVoucher } from '@/types/cash-voucher'

type Props = {
  step: number
  onNext: () => void
  onBack: () => void
  onPaid: (voucher: CashVoucher) => void
}

const CashVoucherFormContainer = ({ step, onNext, onBack, onPaid }: Props) => {
  return (
    <div className="w-full max-w-md mx-auto lg:mx-0 p-5 sm:p-6 rounded-2xl shadow-lg border border-gray-100 bg-white relative">
      {/* Step Indicator */}
      <div className="flex items-center mb-6">
        {[1, 2, 3].map((s, index) => (
          <React.Fragment key={s}>
            <div
              className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-semibold border-2 transition-all
                ${step >= s ? 'bg-brand border-brand text-white' : 'bg-white border-gray-300 text-gray-400'}`}
            >
              {s}
            </div>
            {index < 2 && (
              <div
                className={`flex-1 h-[2px] mx-2 transition-all ${step > s ? 'bg-brand' : 'bg-gray-200'}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Steps 1–2: amount + recipient form with nav buttons. */}
      {step !== 3 && (
        <>
          <CashVoucherForm currentStep={step} />

          <div className="mt-6">
            {step === 2 ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 py-3 rounded-full border border-brand text-brand font-semibold text-sm tracking-wide hover:bg-brand hover:text-white transition-all"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="flex-1 py-3 rounded-full bg-brand text-white font-semibold text-sm tracking-wide hover:bg-brand-hover transition-colors"
                >
                  Next
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="w-full py-3 rounded-full bg-brand text-white font-semibold text-sm tracking-wide hover:bg-brand-hover transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </>
      )}

      {/* Step 3 (PayPal card-fields payment) stays mounted from the start so the
          card fields preload while the user fills steps 1–2 — reaching the payment
          step is then instant. Parked offscreen at the content width (NOT
          display:none) until step 3 so the iframes initialize at the right size. */}
      <div
        aria-hidden={step !== 3}
        className={
          step === 3
            ? ''
            : 'pointer-events-none absolute left-5 right-5 top-0 -z-10 opacity-0 sm:left-6 sm:right-6'
        }
      >
        <CashVoucherPayment onPaid={onPaid} />
      </div>
    </div>
  )
}

export default CashVoucherFormContainer
