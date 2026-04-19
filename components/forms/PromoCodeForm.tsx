import React from 'react'

const PromoCodeForm = () => {
    return (
        <div className="space-y-3">
            <h3 className="text-base font-semibold">
                Apply Promo Code
            </h3>

            <div className="flex items-center gap-3">
                <input
                    type="text"
                    placeholder="Promo code"
                    className="flex-1 bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#900036]"
                />
                <button
                    type="button"
                    className="text-[#900036] font-medium text-sm"
                >
                    Apply
                </button>
            </div>
        </div>
    )
}

export default PromoCodeForm