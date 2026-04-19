'use client'

import React, { useState } from 'react'
import { CartItem } from '@/types/cart'
import { useCartStore } from '@/store/cartStore'

import Image from 'next/image'
import QuantityButton from '../../functional-ui/QuantityButton'
import { X, CircleCheckBig } from 'lucide-react'

type Props = {
    cartItems: CartItem[]
}

const OrderSummary = ({ cartItems }: Props) => {
    const [update, setUpdate] = useState(false)
    const { removeItem, updateItem } = useCartStore() 
    return (
        <div className="flex flex-col space-y-4 w-full">
            <h2 className="title-header text-lg sm:text-xl md:text-2xl">
                Order Summary
            </h2>

            {/* Card */}
            {cartItems.map((item) => (
                <div key={item.product_id} className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 md:gap-5">

                    {/* Image */}
                    <div className="relative w-full h-48 md:h-full bg-gray-100 rounded-md overflow-hidden">
                        <Image
                            src={item.image_url ?? 'images/placeholder.png'}
                            alt="product"
                            fill
                            loading="lazy"
                            className="object-cover"
                        />
                    </div>

                    {/* Details */}
                    <div className="flex flex-col min-w-0">

                        {/* Title + Remove */}
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="text-base sm:text-lg font-medium line-clamp-2">
                                {item.name}
                            </h4>
                            <button
                                type="button"
                                onClick={() => removeItem(item.variant_id, item.size)}
                                className="text-red-500 hover:text-red-700 shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-sm mt-1">Size: {item.size}</p>

                        {/* Controls + Pricing */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">

                            {/* Controls */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setUpdate(prev => !prev)}
                                    className="text-sm underline"
                                >
                                    {update ? 'Cancel' : 'Update'}
                                </button>

                                {update && <QuantityButton />}

                                {update && (
                                    <button
                                        type="button"
                                        className="text-sm bg-[#900036] text-white px-2 py-1 rounded"
                                    >
                                        Save
                                    </button>
                                )}
                            </div>

                            {/* Pricing */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xl sm:text-2xl font-bold text-[#900036]">
                                    ${item.final_price.toFixed(2)}
                                </p>
                                <div className="flex gap-2 items-center text-[#900036]">
                                    <p className="text-sm line-through">$</p>
                                    <p className="text-xs sm:text-sm bg-[#900036] text-white px-2 py-1 rounded-md">
                                        -29%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Wholesale */}
                        <div className="py-2 px-2 bg-green-200 flex items-center gap-2 rounded-md mt-4 text-sm">
                            <CircleCheckBig size={18} />
                            <p className="leading-tight">
                                Wholesale pricing applied to your order!
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default OrderSummary