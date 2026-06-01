'use client'

import React from 'react'
import CashVoucherForm from '@/components/forms/CashVoucherForm'

type Props = {
  step: number
  submitting: boolean
  onNext: () => void
  onBack: () => void
}

const CashVoucherFormContainer = ({ step, submitting, onNext, onBack }: Props) => {
  return (
    <div className="w-full max-w-md mx-auto lg:mx-0 p-5 sm:p-6 rounded-2xl shadow-lg border border-gray-100 bg-white">
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

      {/* Form Content */}
      <CashVoucherForm currentStep={step} />

      {/* Buttons */}
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
        ) : step === 3 ? (
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full bg-brand text-white font-semibold text-sm tracking-wide hover:bg-brand-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Processing…' : 'Pay now'}
          </button>
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
    </div>
  )
}

export default CashVoucherFormContainer
