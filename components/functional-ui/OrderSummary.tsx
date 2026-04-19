'use client'

import React, { useState } from 'react'
import { CartItem } from '@/types/cart'
import { useCartStore } from '@/store/cartStore'

import Image from 'next/image'
import CartQuantityButton from './CartQuantityButton'
import { X, CircleCheckBig } from 'lucide-react'

type Props = {
    cartItems: CartItem[]
}

const OrderSummary = ({ cartItems }: Props) => {
    const [activeItemKey, setActiveItemKey] = useState<string | null>(null)

    // store temporary quantities
    const [editQuantities, setEditQuantities] = useState<Record<string, number>>({})

    const { removeItem, updateItem } = useCartStore()

    const handleEditToggle = (key: string, currentQty: number) => {
        setActiveItemKey(prev => {
            const isSame = prev === key

            if (!isSame) {
                setEditQuantities(prev => ({
                    ...prev,
                    [key]: currentQty
                }))
            }

            return isSame ? null : key
        })
    }

    const handleQuantityChange = (key: string, value: number) => {
        setEditQuantities(prev => ({
            ...prev,
            [key]: value
        }))
    }

    return (
        <div className="flex flex-col space-y-4 w-full">
            <h2 className="title-header text-lg sm:text-xl md:text-2xl">
                Order Summary
            </h2>

            {cartItems.map((item) => {
                const key = `${item.variant_id}-${item.size}`
                const isActive = activeItemKey === key

                const quantity = editQuantities[key] ?? item.quantity

                return (
                    <div
                        key={key}
                        className="grid grid-cols-1 md:grid-cols-[160px_1fr] md:gap-5"
                    >
                        {/* Image */}
                        <div className="relative w-full h-48 md:h-full bg-gray-100 rounded-md overflow-hidden">
                            <Image
                                src={item.image_url ?? '/images/placeholder.png'}
                                alt="product"
                                fill
                                className="object-cover"
                            />
                        </div>

                        {/* Details */}
                        <div className="flex flex-col min-w-0">

                            <div className="flex justify-between items-start gap-2">
                                <h4 className="text-base sm:text-lg font-medium line-clamp-2">
                                    {item.name}
                                </h4>

                                <button
                                    onClick={() =>
                                        removeItem(item.variant_id, item.size)
                                    }
                                    className="text-red-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-sm mt-1">Size: {item.size}</p>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">

                                <div className="flex items-center gap-2">
                                    <p className="text-md font-bold">
                                        Quantity: {item.quantity}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleEditToggle(key, item.quantity)
                                        }
                                        className="text-sm"
                                    >
                                        {isActive ? 'Cancel' : 'Update'}
                                    </button>

                                    {isActive && (
                                        <CartQuantityButton
                                            value={quantity}
                                            onChange={(val) =>
                                                handleQuantityChange(key, val)
                                            }
                                        />
                                    )}

                                    {isActive && (
                                        <button
                                            onClick={() => {
                                                updateItem(
                                                    item.variant_id,
                                                    quantity,
                                                    item.size
                                                )
                                                setActiveItemKey(null)
                                            }}
                                            className="text-sm bg-[#900036] text-white px-2 py-1 rounded"
                                        >
                                            Save
                                        </button>
                                    )}
                                </div>

                                <p className="text-xl font-bold text-[#900036]">
                                    ${item.final_price.toFixed(2)}
                                </p>
                            </div>

                            {item.wholesale && (
                                <div className="py-2 px-2 bg-green-200 flex items-center gap-2 rounded-md mt-4 text-sm">
                                    <CircleCheckBig size={18} />
                                    <p>Wholesale pricing applied!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default OrderSummary
