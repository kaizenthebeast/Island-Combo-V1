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
                    const key = `${item.id}`
                    const isActive = activeItemKey === key
                    const quantity = editQuantities[key] ?? item.quantity
                    const isWholesale = item.applied_tier_label === 'wholesale'
                    const displayPrice = item.applied_price || item.final_price || item.price
                    const hasDiscount = item.discount !== null && item.discount > 0
                    const priceIsReduced = displayPrice < item.price

                    return (
                        <div
                            key={key}
                            className="grid grid-cols-[96px_1fr] sm:grid-cols-[140px_1fr] md:grid-cols-[160px_1fr] gap-3 sm:gap-4 md:gap-5"
                        >
                            {/* Image */}
                            <div className="relative w-full aspect-square bg-muted rounded-md overflow-hidden">
                                <Image
                                    src={item.image_url ?? '/images/placeholder.png'}
                                    alt="product"
                                    fill
                                    className="object-contain p-2"
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
                                        className="text-danger hover:text-danger shrink-0 mt-0.5 cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Variant attributes e.g. Flavor: Coke - Size: 500ml */}
                                {item.attributes && item.attributes.length > 0 && (
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        {item.attributes
                                            .map(attr => `${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}: ${attr.value}`)
                                            .join(' - ')}
                                    </p>
                                )}

                                {/* Price — shows applied_price (tier-resolved) as the main price.
                                    Strikes through the base price when any discount is active
                                    (either a product-level sale discount or wholesale tier). */}
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                    <p className="text-base sm:text-lg font-bold text-brand">
                                        ${displayPrice.toFixed(2)}
                                    </p>
                                    {priceIsReduced && (
                                        <>
                                            <p className="text-xs text-muted-foreground line-through">
                                                ${item.price.toFixed(2)}
                                            </p>
                                            {isWholesale ? (
                                                // Show the wholesale discount percent from the matched tier
                                                <p className="text-xs bg-success-tint text-success px-1.5 py-0.5 rounded">
                                                    -{item.pricing_tiers.find(t => t.label === 'wholesale')?.discount_percent}% wholesale discount
                                                </p>
                                            ) : hasDiscount && (
                                                // Show the product-level sale discount percent
                                                <p className="text-xs bg-brand-tint text-brand px-1.5 py-0.5 rounded">
                                                    -{item.discount}%
                                                </p>
                                            )}
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
                                        className="text-xs text-brand underline underline-offset-2 cursor-pointer"
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
                                                className="text-xs bg-brand text-white px-3 py-1 rounded-full cursor-pointer"
                                            >
                                                Save
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Wholesale badge — shown when applied_tier_label is 'wholesale',
                                    meaning the current quantity meets the wholesale threshold.
                                    Replaces the old item.wholesale boolean check. */}
                                {isWholesale && (
                                    <div className="flex items-center gap-1.5 bg-success-tint text-success px-2 py-1.5 rounded-md mt-3 text-xs">
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