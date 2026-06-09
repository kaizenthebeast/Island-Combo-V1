'use client'

import React from 'react'
import { useCartStore } from '@/features/cart/stores/cart-store'

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
                className="w-8 h-8 flex items-center bg-muted justify-center text-lg font-semibold text-muted-foreground rounded-md cursor-pointer"
            >
                −
            </button>

            <span className="min-w-[20px] text-center font-medium">
                {quantityInput}
            </span>

            <button
                type="button"
                onClick={incrementQty}
                className="w-8 h-8 flex items-center bg-muted justify-center text-lg font-semibold text-muted-foreground rounded-md cursor-pointer"
            >
                +
            </button>

        </div>
    )
}

export default ProductQuantityButton