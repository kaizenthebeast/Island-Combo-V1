'use client'
import React, { useState } from 'react'

const PRESET_AMOUNTS = [50, 100, 500, 1000, 500, 2000]

const StepOne = () => {
    const [selected, setSelected] = useState<number | null>(null)
    const [customAmount, setCustomAmount] = useState('')

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold">Select Amount</h2>
            <div className="grid grid-cols-2 gap-3">
                {PRESET_AMOUNTS.map((amount, index) => (
                    <button
                        key={index}
                        onClick={() => setSelected(index)}
                        className={`py-3 rounded-lg border text-sm font-medium transition-all
                            ${selected === index
                                ? 'bg-brand border-brand text-white'
                                : 'bg-white border-brand text-gray-700 hover:border-brand'}`}>
                        ${amount}
                    </button>
                ))}
            </div>
            <div>
                <label className="text-sm text-gray-600 mb-1 block">Custom amount:</label>
                <input
                    type="number"
                    placeholder="$0.00"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
            </div>
        </div>
    )
}

const StepTwo = () => {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Recipient Details</h2>
                <span className="text-xs text-brand border border-brand rounded-full px-2 py-0.5">Needs Valid ID</span>
            </div>
            <input
                type="text"
                placeholder="First name *"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <input
                type="text"
                placeholder="Last name *"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <input
                type="email"
                placeholder="Email *"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                <span className="text-orange-400">ℹ</span>
                <p className="text-xs text-gray-600">Your recipient must bring a <span className="font-semibold">valid ID</span> that matches their name.</p>
            </div>
        </div>
    )
}

const StepThree = () => {
    return (
        <div className="space-y-3">
            <h2 className="text-lg font-bold">Payment Method</h2>
            <input
                type="text"
                placeholder="Name on card *"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <input
                type="text"
                placeholder="Card number *"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <div className="grid grid-cols-2 gap-3">
                <input
                    type="text"
                    placeholder="MM/YY *"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <input
                    type="text"
                    placeholder="Security Code *"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
            </div>

            {/* Order Summary */}
            <div className="bg-pink-50 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-bold text-center">Order Summary</h3>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Recipient name</span>
                    <span>-</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Voucher value</span>
                    <span>$500.00</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Convenience fee</span>
                    <span>$5.00</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-pink-200">
                    <span>Total</span>
                    <span className="text-brand">$505.00</span>
                </div>
            </div>
        </div>
    )
}

const CashVoucherForm = ({ currentStep }: { currentStep: number }) => {
    switch (currentStep) {
        case 1: return <StepOne />
        case 2: return <StepTwo />
        case 3: return <StepThree />
        default: return null
    }
}

export default CashVoucherForm