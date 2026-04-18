'use client'
import React, { useState, useMemo } from 'react'

type Props = {
    quantity: number
    setQuantity: React.Dispatch<React.SetStateAction<number>>
}

const QuantityButton = ({ quantity, setQuantity }: Props) => {
     const increment = () =>{
        setQuantity((q) => q + 1);
     }

     const decrement = () =>{
          setQuantity((q) => Math.max(0, q - 1))
     }

    return (
        <div className="flex items-center gap-2">

            <button
                type="button"
                onClick={decrement}
                disabled={quantity === 0}
                className="w-8 h-8 flex items-center bg-gray-100 justify-center text-lg font-semibold text-gray-600 rounded-md"
            >
                −
            </button>

            <span className="min-w-[20px] text-center font-medium">
                {quantity}
            </span>

            <button
                type="button"
                onClick={increment}
                className="w-8 h-8 flex items-center bg-gray-100 justify-center text-lg font-semibold text-gray-600 rounded-md"
            >
                +
            </button>

        </div>
    )
}

export default QuantityButton