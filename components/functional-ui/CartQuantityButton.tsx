'use client'

import React from 'react'

type Props = {
  value: number
  onChange: (val: number) => void
  min?: number
}

const CartQuantityButton = ({ value, onChange, min = 1 }: Props) => {
  return (
    <div className="flex items-center gap-2">

      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 flex items-center bg-gray-100 justify-center text-lg font-semibold text-gray-600 rounded-md"
      >
        −
      </button>

      <span className="min-w-[20px] text-center font-medium">
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 flex items-center bg-gray-100 justify-center text-lg font-semibold text-gray-600 rounded-md"
      >
        +
      </button>

    </div>
  )
}

export default CartQuantityButton
