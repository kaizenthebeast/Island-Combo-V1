'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart-store'
import { useCartQuantity } from '@/lib/hooks/use-cart-quantity'
import { customToast } from '@/components/popup/ToastCustom'
import CartQuantityButton from './CartQuantityButton'
import WholesaleCheckIcon from '@/components/icons/WholesaleCheckIcon'

const MobileCart = () => {
  const router = useRouter()
  const {
    cart,
    selectedIds,
    selectedQty,
    selectedSubtotal,
    toggleSelected,
    removeItem,
  } = useCartStore()
  const changeQty = useCartQuantity()

  const handleRemove = (variantId: number) => {
    removeItem(variantId)
    customToast.success({
      title: 'Item removed from cart!',
      description: 'The item has been removed from your cart.',
    })
  }

  return (
    <div className="flex flex-col min-h-svh pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="text-foreground"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">
          Cart ({cart.length})
        </h1>
        <span className="w-[22px]" aria-hidden />
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {cart.map((item) => {
          const isSelected = selectedIds.includes(item.variant_id)
          const isWholesale = item.applied_tier_label === 'wholesale'
          // Pending items (just added, not yet backfilled by fetchCart) have no
          // price fields, so fall back to 0 to avoid undefined.toFixed crashes.
          const basePrice = item.price ?? 0
          const displayPrice = item.applied_price || item.final_price || basePrice
          const hasDiscount = item.discount !== null && item.discount > 0
          const priceIsReduced = displayPrice < basePrice

          return (
            <div
              key={item.id}
              className="px-4 py-4 border-b border-border flex flex-col gap-2"
            >
              <div className="flex gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelected(item.variant_id)}
                  aria-label={`Select ${item.name}`}
                  className="w-5 h-5 accent-brand cursor-pointer shrink-0 mt-1"
                />

                {/* Image */}
                <div className="relative w-20 h-20 shrink-0 rounded-md bg-muted overflow-hidden">
                  <Image
                    src={item.image_url ?? '/images/placeholder.png'}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-contain p-1.5"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  {/* Name + trash */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium line-clamp-2 leading-snug">
                        {item.name}
                      </h4>
                      {item.attributes && item.attributes.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.attributes
                            .map((a) => `${a.name.charAt(0).toUpperCase() + a.name.slice(1)}: ${a.value}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.variant_id)}
                      aria-label="Remove item"
                      className="text-muted-foreground hover:text-danger cursor-pointer shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Stepper */}
                  <CartQuantityButton
                    value={item.quantity}
                    onChange={(val) => changeQty(item.variant_id, val)}
                  />

                  {/* Price — below the stepper on mobile */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">
                      ${displayPrice.toFixed(2)}
                    </span>
                    {priceIsReduced && (
                      <>
                        <span className="text-[11px] text-muted-foreground line-through">
                          ${basePrice.toFixed(2)}
                        </span>
                        {isWholesale ? (
                          <span className="text-[10px] bg-success-tint text-success px-1 py-0.5 rounded">
                            -{item.pricing_tiers.find((t) => t.label === 'wholesale')?.discount_percent}%
                          </span>
                        ) : hasDiscount && (
                          <span className="text-[10px] bg-discount text-brand px-1 py-0.5 rounded">
                            -{item.discount}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isWholesale && (
                <div className="flex items-center gap-1.5 bg-success-tint text-success px-3 py-2 rounded-md text-[11px]">
                  <WholesaleCheckIcon size={14} className="shrink-0" />
                  <p>Wholesale pricing applied to your order!</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed bottom checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            Total amount ({selectedQty} items)
          </span>
          <span className="text-lg font-bold text-brand">
            ${selectedSubtotal.toFixed(2)}
          </span>
        </div>

        {selectedQty > 0 ? (
          <Link
            href="/checkout/address"
            className="bg-brand text-brand-foreground font-medium px-8 py-3 rounded-full text-sm"
          >
            Checkout
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="bg-brand/40 text-brand-foreground font-medium px-8 py-3 rounded-full text-sm cursor-not-allowed"
          >
            Checkout
          </button>
        )}
      </div>
    </div>
  )
}

export default MobileCart
