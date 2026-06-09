'use client'

import { CartItem } from '@/shared/types/cart'
import { useCartStore } from '@/features/cart/stores/cart-store'
import { useCartQuantity } from '@/shared/hooks/use-cart-quantity'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import Image from 'next/image'
import CartQuantityButton from '@/features/cart/components/CartQuantityButton'
import { X } from 'lucide-react'
import WholesaleCheckIcon from '@/shared/components/common/icons/WholesaleCheckIcon'

type Props = {
    cartItems: CartItem[]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const OrderSummary = ({ cartItems }: Props) => {
    const { removeItem, selectedIds, toggleSelected, removeAllItem } = useCartStore()
    const changeQty = useCartQuantity()

    const handleRemove = (variantId: number) => {
        removeItem(variantId)
        customToast.success({
            title: 'Item removed from cart!',
            description: 'The item has been removed from your cart.',
        })
    }

    const handleClearCart = () => {
        removeAllItem()
        customToast.success({
            title: 'Cart cleared!',
            description: 'All items have been removed from your cart.',
        })
    }

    return (
        <div className="flex flex-col space-y-4 w-full">
            <div className="flex items-center justify-between">
                <h2 className="title-header text-lg sm:text-xl md:text-2xl">Order Summary</h2>
                <button type='button' onClick={handleClearCart} className="text-sm text-muted-foreground hover:text-foreground">
                    Clear Cart
                </button>
            </div>


            <div className="flex flex-col gap-4">
                {cartItems.map((item) => {
                    const isWholesale = item.applied_tier_label === 'wholesale'
                    // Pending items (just added, not yet backfilled by fetchCart) have no
                    // price fields, so fall back to 0 to avoid undefined.toFixed crashes.
                    const basePrice = item.price ?? 0
                    const displayPrice = item.applied_price || item.final_price || basePrice
                    const hasDiscount = item.discount !== null && item.discount > 0
                    const priceIsReduced = displayPrice < basePrice

                    return (
                        <div key={item.id} className="flex items-start gap-3 sm:gap-4">
                            {/* Selection checkbox */}
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(item.variant_id)}
                                onChange={() => toggleSelected(item.variant_id)}
                                aria-label={`Select ${item.name}`}
                                className="w-5 h-5 accent-brand cursor-pointer shrink-0 mt-2"
                            />

                            {/* Image */}
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-muted rounded-md overflow-hidden">
                                <Image
                                    src={item.image_url ?? '/images/placeholder.png'}
                                    alt={item.name}
                                    fill
                                    className="object-contain p-2"
                                    sizes="112px"
                                    loading="eager"
                                />
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 flex flex-col gap-3">
                                {/* Name + remove */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h4 className="text-sm sm:text-base font-medium leading-snug line-clamp-2">
                                            {item.name}
                                        </h4>
                                        {item.attributes && item.attributes.length > 0 && (
                                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                                {item.attributes.map((a) => `${cap(a.name)}: ${a.value}`).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemove(item.variant_id)}
                                        aria-label="Remove item"
                                        className="text-muted-foreground hover:text-danger cursor-pointer shrink-0"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Stepper + price on the same row */}
                                <div className="flex items-center justify-between gap-3">
                                    <CartQuantityButton
                                        value={item.quantity}
                                        onChange={(val) => changeQty(item.variant_id, val)}
                                    />

                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        <span className="text-sm sm:text-base font-bold">
                                            ${displayPrice.toFixed(2)}
                                        </span>
                                        {priceIsReduced && (
                                            <>
                                                <span className="text-xs text-muted-foreground line-through">
                                                    ${basePrice.toFixed(2)}
                                                </span>
                                                {isWholesale ? (
                                                    <span className="text-xs bg-success-tint text-success px-1.5 py-0.5 rounded">
                                                        -{item.pricing_tiers.find((t) => t.label === 'wholesale')?.discount_percent}%
                                                    </span>
                                                ) : hasDiscount && (
                                                    <span className="text-xs bg-discount text-brand px-1.5 py-0.5 rounded">
                                                        -{item.discount}%
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {isWholesale && (
                                    <div className="flex items-center gap-1.5 bg-success-tint text-success px-3 py-2 rounded-md text-xs sm:text-sm">
                                        <WholesaleCheckIcon size={16} className="shrink-0" />
                                        <p>Wholesale pricing applied to your order!</p>
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
