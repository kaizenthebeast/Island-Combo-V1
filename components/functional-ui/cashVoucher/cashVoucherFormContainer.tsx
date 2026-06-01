'use client'
import React, { useState } from 'react'
import CashVoucherForm from '@/components/forms/CashVoucherForm'

const CashVoucherFormContainer = () => {
    const [stepValue, setStepValue] = useState(1)

    const handleNextStep = () => {
        if (stepValue >= 3) return
        setStepValue(prev => prev + 1)
    }

    const handlePrevStep = () => {
        if (stepValue <= 1) return
        setStepValue(prev => prev - 1)
    }

    return (
        <div className="p-6 rounded-2xl shadow-lg border border-gray-100 bg-white w-full h-[492px]">

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3].map((step, index) => (
                    <React.Fragment key={step}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center  font-semibold border-2 transition-all
                ${stepValue >= step
                                ? 'bg-brand border-brand text-white'
                                : 'bg-white border-gray-300 text-gray-400'}`}>
                            {step}
                        </div>
                        {index < 2 && (
                            <div className={`h-[2px] w-30 transition-all ${stepValue > step ? 'bg-brand' : 'bg-gray-200'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Form Content */}
            <CashVoucherForm currentStep={stepValue} />

            {/* Buttons */}
            <div className="mt-6 flex flex-col gap-2">
                <button
                    onClick={handleNextStep}
                    className="w-full py-3 rounded-full bg-brand text-white font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity">
                    {stepValue === 3 ? 'Pay Now' : 'Next'}
                </button>
                {stepValue > 1 && (
                    <button
                        onClick={handlePrevStep}
                        className="w-full py-3 rounded-full border border-brand text-brand font-semibold text-sm tracking-wide hover:bg-brand hover:text-white transition-all">
                        Back
                    </button>
                )}
            </div>
        </div>
    )
}

export default CashVoucherFormContainer