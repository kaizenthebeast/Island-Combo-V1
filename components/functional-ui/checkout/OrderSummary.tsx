'use client'

import React, { useState } from 'react'
import { CartItem } from '@/types/cart'
import { useCartStore } from '@/store/cartStore'
import { customToast } from '@/components/popup/ToastCustom'
import Image from 'next/image'
import CartQuantityButton from '../cart/CartQuantityButton'
import { X, CircleCheckBig } from 'lucide-react'

type Props = {
    cartItems: CartItem[]
}

const OrderSummary = ({ cartItems }: Props) => {
    const [activeItemKey, setActiveItemKey] = useState<string | null>(null)
    const [editQuantities, setEditQuantities] = useState<Record<string, number>>({})

    const { removeItem, updateItem } = useCartStore()

    function handleActions(action: string, variantId: number, qty: number) {
        switch (action) {
            case 'remove':
                removeItem(variantId)
                customToast.success({
                    title: "Item removed from cart!",
                    description: "The item has been removed from your cart.",
                })
                break
            case 'update':
                updateItem(variantId, qty)
                customToast.success({
                    title: "Cart item updated!",
                    description: "The item has been updated in your cart.",
                })
                break
            default:
                break
        }
    }


    const handleEditToggle = (key: string, currentQty: number) => {
        setActiveItemKey(prev => {
            const isSame = prev === key
            if (!isSame) {
                setEditQuantities(prev => ({ ...prev, [key]: currentQty }))
            }
            return isSame ? null : key
        })
    }

    const handleQuantityChange = (key: string, value: number) => {
        setEditQuantities(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="flex flex-col space-y-4 w-full">
            <h2 className="title-header text-lg sm:text-xl md:text-2xl">
                Order Summary
            </h2>

            <div className="flex flex-col gap-4">
                {cartItems.map((item) => {
                    const key = `${item.variant_id}`
                    const isActive = activeItemKey === key
                    const quantity = editQuantities[key] ?? item.quantity

                    return (
                        <div
                            key={key}
                            className="grid grid-cols-[96px_1fr] sm:grid-cols-[140px_1fr] md:grid-cols-[160px_1fr] gap-3 sm:gap-4 md:gap-5"
                        >
                            {/* Image */}
                            <div className="relative w-full aspect-square sm:aspect-[3/4] bg-gray-100 rounded-md overflow-hidden">
                                <Image
                                    src={item.image_url ?? '/images/placeholder.png'}
                                    alt="product"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 96px, (max-width: 768px) 140px, 160px"
                                    loading="eager"
                                />
                            </div>

                            {/* Details */}
                            <div className="flex flex-col justify-between min-w-0 py-1">

                                {/* Name + Remove */}
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-md sm:text-base md:text-2xl font-medium line-clamp-2 leading-snug">
                                        {item.name}
                                    </h4>
                                    <button
                                        onClick={() => handleActions('remove', item.variant_id, item.quantity)}
                                        className="text-red-400 hover:text-red-600 shrink-0 mt-0.5"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                {item.attributes && item.attributes.length > 0 && (
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        {item.attributes
                                            .map(attr => `${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}: ${attr.value}`)
                                            .join(' - ')}
                                    </p>
                                )}
                                {/* Price */}
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                    <p className="text-base sm:text-lg font-bold text-[#900036]">
                                        ${item.final_price}
                                    </p>
                                    {item.discount && (
                                        <>
                                            <p className="text-xs text-gray-400 line-through">
                                                {item.price}
                                            </p>
                                            <p className="text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded">
                                                -{item.discount}%
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Quantity row */}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <p className="text-xs sm:text-sm font-semibold">
                                        Qty: {item.quantity}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleEditToggle(key, item.quantity)}
                                        className="text-xs text-[#900036] underline underline-offset-2"
                                    >
                                        {isActive ? 'Cancel' : 'Update'}
                                    </button>

                                    {isActive && (
                                        <>
                                            <CartQuantityButton
                                                value={quantity}
                                                onChange={(val) => handleQuantityChange(key, val)}
                                            />
                                            <button
                                                onClick={() => {
                                                    handleActions('update', item.variant_id, quantity)
                                                    setActiveItemKey(null)
                                                }}
                                                className="text-xs bg-[#900036] text-white px-3 py-1 rounded-full"
                                            >
                                                Save
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Wholesale badge */}
                                {item.wholesale && (
                                    <div className="flex items-center gap-1.5 bg-[#EAF7F1] text-[#0F5132] px-2 py-1.5 rounded-md mt-3 text-xs">
                                        <CircleCheckBig size={14} className="shrink-0" />
                                        <p>Wholesale pricing applied!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default OrderSummary