'use client'

import React from 'react'
import { useCartStore } from '@/store/cartStore'

const ProductQuantityButton = () => {
    const {
        quantityInput,
        incrementQty,
        decrementQty,
    } = useCartStore()

    return (
        <div className="flex items-center gap-2">

            <button
                type="button"
                onClick={decrementQty}
                disabled={quantityInput <= 1}
                className="w-8 h-8 flex items-center bg-gray-100 justify-center text-lg font-semibold text-gray-600 rounded-md"
            >
                −
            </button>

            <span className="min-w-[20px] text-center font-medium">
                {quantityInput}
            </span>

            <button
                type="button"
                onClick={incrementQty}
                className="w-8 h-8 flex items-center bg-gray-100 justify-center text-lg font-semibold text-gray-600 rounded-md"
            >
                +
            </button>

        </div>
    )
}

export default ProductQuantityButton