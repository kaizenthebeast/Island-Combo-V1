'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Sheet, SheetContent, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet"
import Image from 'next/image'
import { FavoriteView } from '@/types/favorite'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import { Button } from '../ui/button'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import ProductQuantityButton from '../functional-ui/product/ProductQuantityButton'
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useCartStore } from '@/store/cartStore'
import { customToast } from '@/components/popup/ToastCustom'
type Props = {
  product: FavoriteView
}

const FavoriteCard: React.FC<Props> = ({ product }) => {
  const hasDiscount = product.discount !== null && product.discount > 0
  const [isAdding, setIsAdding] = useState(false)
  const [open, setOpen] = useState(false)

  // ─── Cart store ────────────────────────────────────────────────────────────
  const { addItem, quantityInput, resetQuantity } = useCartStore()

  // ─── Derive attribute keys from variants (stable order) ───────────────────
  const attributeKeys: string[] = useMemo(() => {
    return Array.from(
      new Set(
        (product.variants ?? []).flatMap(v => v.attributes?.map(a => a.name) ?? [])
      )
    )
  }, [product.variants])

  // ─── Selected attributes state ────────────────────────────────────────────
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string | null>>(
    () => Object.fromEntries(attributeKeys.map(k => [k, null]))
  )

  const defaultVariant = product.variants?.[0]

  const originalPrice = defaultVariant?.price ?? 0
  const discountedPrice = hasDiscount
    ? originalPrice * (1 - (product.discount ?? 0) / 100)
    : originalPrice

  // ─── Parse leading number for sorting (e.g. "300ml" → 300, "1L" → 1) ─────
  const parseLeadingNumber = (val: string): number => {
    const match = val.match(/^[\d.]+/)
    return match ? parseFloat(match[0]) : NaN
  }

  // ─── Available options per key (sorted consistently) ──────────────────────
  function getOptionsForKey(key: string): string[] {
    const raw = Array.from(
      new Set(
        (product.variants ?? [])
          .filter(v =>
            attributeKeys
              .filter(k => k !== key && selectedAttributes[k] !== null)
              .every(k =>
                v.attributes?.some(a => a.name === k && a.value === selectedAttributes[k])
              )
          )
          .flatMap(v =>
            v.attributes?.filter(a => a.name === key).map(a => a.value) ?? []
          )
      )
    )

    return raw.sort((a, b) => {
      const numA = parseLeadingNumber(a)
      const numB = parseLeadingNumber(b)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      if (!isNaN(numA)) return -1
      if (!isNaN(numB)) return 1
      return a.localeCompare(b)
    })
  }

  // ─── Resolved variant (exact match on all attributes) ─────────────────────
  const resolvedVariant = attributeKeys.every(k => selectedAttributes[k] !== null)
    ? (product.variants ?? []).find(v =>
      attributeKeys.every(k =>
        v.attributes?.some(a => a.name === k && a.value === selectedAttributes[k])
      )
    ) ?? null
    : null

  // ─── Display variant for price (best-effort partial match) ────────────────
  const displayVariant = resolvedVariant
    ?? (product.variants ?? []).find(v =>
      attributeKeys
        .filter(k => selectedAttributes[k] !== null)
        .every(k =>
          v.attributes?.some(a => a.name === k && a.value === selectedAttributes[k])
        )
    )
    ?? defaultVariant

  const canProceed = !!resolvedVariant && quantityInput > 0

  // ─── Reset quantity when sheet opens ──────────────────────────────────────
  useEffect(() => {
    if (open) resetQuantity()
  }, [open])

  // ─── Handle attribute selection (clears downstream keys) ──────────────────
  function handleAttributeSelect(key: string, value: string) {
    const keyIndex = attributeKeys.indexOf(key)
    setSelectedAttributes(prev => {
      const next = { ...prev, [key]: value }
      attributeKeys.slice(keyIndex + 1).forEach(k => { next[k] = null })
      return next
    })
  }

  // ─── Add to cart ──────────────────────────────────────────────────────────
  async function handleAddToCart() {
    if (isAdding) return

    const firstUnselected = attributeKeys.find(k => !selectedAttributes[k])
    if (firstUnselected) {
      customToast.error({
        title: `Please select a ${firstUnselected}`,
        description: `Choose a ${firstUnselected} option before adding to cart.`,
      })
      return
    }
    if (!resolvedVariant) {
      customToast.error({
        title: 'Combination not available',
        description: 'This product combination is currently unavailable.',
      })
      return
    }
    if (quantityInput <= 0) return

    const sizeValue =
      selectedAttributes['size'] ??
      Object.values(selectedAttributes)[0] ??
      ''

    setIsAdding(true)
    try {
      await addItem(resolvedVariant.variant_id, quantityInput, sizeValue)

      const error = useCartStore.getState().error
      if (error) {
        customToast.error({
          title: 'Failed to add to cart',
          description: error,
        })
        return
      }

      customToast.success({
        title: 'Added to cart',
        description: `${product.product_name} has been added to your cart.`,
      })
      setOpen(false)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className="w-full border-none shadow-none relative overflow-hidden flex flex-col cursor-pointer group"
      >
        {product.wholesale === true && (
          <div className="absolute top-0 right-0 bg-[#900036] text-white text-xs px-3 py-1 rounded-tr-md rounded-bl-md z-10">
            Wholesale
          </div>
        )}

        <div className="relative w-full aspect-square overflow-hidden rounded-md bg-gray-50">
          <Image
            src={getPublicImageUrl(product.primary_image) ?? '/images/placeholder.png'}
            alt={product.product_name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105 bg-gray-100 rounded-md overflow-hidden"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            priority
          />
        </div>

        <CardContent className="px-0 pt-2 pb-0 space-y-1 flex-1">
          <h3 className="text-xs sm:text-sm font-medium leading-snug line-clamp-2">
            {product.product_name}
          </h3>
          <p className="text-sm sm:text-base font-semibold">
            ${discountedPrice.toFixed(2)}
          </p>
          {hasDiscount && (
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs text-gray-400 line-through">
                ${originalPrice.toFixed(2)}
              </span>
              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded">
                -{product.discount}%
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="px-0 pt-2 pb-0">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
            className="w-full rounded-full border-[#900036] text-[#900036] text-xs sm:text-sm font-bold hover:bg-[#900036] hover:text-white transition-colors duration-200"
          >
            Add To Cart
          </Button>
        </CardFooter>
      </Card>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-sm p-0 flex flex-col overflow-y-auto [&>button]:hidden"
        >
          <SheetHeader className="p-4 border-b">
            <VisuallyHidden>
              <SheetTitle>{product.product_name}</SheetTitle>
              <SheetDescription>Product details and add to cart options</SheetDescription>
            </VisuallyHidden>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-gray-700 hover:text-black transition-colors w-fit"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </SheetHeader>

          <div className="flex flex-col flex-1 pt-4 pb-6 gap-6">

            {/* Product Summary Row */}
            <div className="flex gap-4 items-start px-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <Image
                  src={getPublicImageUrl(product.primary_image) ?? '/images/placeholder.png'}
                  alt={product.product_name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h2 className="text-sm font-semibold leading-snug text-gray-900">
                  {product.product_name}
                </h2>

                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-base font-bold text-gray-900">
                    ${(displayVariant?.final_price ?? discountedPrice).toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-sm text-gray-400 line-through">
                        ${(displayVariant?.price ?? originalPrice).toFixed(2)}
                      </span>
                      <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded font-medium">
                        -{product.discount}%
                      </span>
                    </>
                  )}
                </div>

                {product.wholesale && (
                  <div className="mt-1 flex items-center gap-1.5 bg-[#900036] text-white text-xs px-3 py-1.5 rounded-full w-fit font-medium">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Wholesale available
                  </div>
                )}
              </div>
            </div>

            {/* Gray divider */}
            <div className="bg-[#F5F5F5] h-[8px] rounded-md" />

            {/* Attribute Pickers — mirrors ProductDetails exactly */}
            {attributeKeys.map((key, keyIndex) => {
              const options = getOptionsForKey(key)
              const isFirstKey = keyIndex === 0

              return (
                <div key={key} className="flex flex-col space-y-2 px-4">
                  <p className="text-sm font-medium text-gray-700 capitalize">{key}</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((value) => {
                      const isSelected = selectedAttributes[key] === value

                      // ── First attribute key: image thumbnails (same as ProductDetails) ──
                      if (isFirstKey) {
                        const repVariant = (product.variants ?? []).find(v =>
                          v.attributes?.some(a => a.name === key && a.value === value)
                        )
                        const thumbnailUrl = repVariant?.image_url?.[0]
                          ? getPublicImageUrl(repVariant.image_url[0])
                          : '/images/placeholder.png'

                        return (
                          <button
                            type="button"
                            key={value}
                            onClick={() => handleAttributeSelect(key, value)}
                            className="flex flex-col items-center gap-1"
                          >
                            <div
                              className={`w-14 h-14 relative overflow-hidden border-2 rounded-md transition-colors
                                ${isSelected
                                  ? 'border-[#900036]'
                                  : 'border-gray-200 hover:border-gray-400'
                                }`}
                            >
                              <Image
                                src={thumbnailUrl ?? '/images/placeholder.png'}
                                fill
                                sizes="56px"
                                className="object-cover"
                                alt={value}
                                loading="eager"
                              />
                            </div>
                            <span className="text-xs text-gray-600">{value}</span>
                          </button>
                        )
                      }

                      // ── Subsequent attribute keys: pill buttons (same as ProductDetails) ──
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleAttributeSelect(key, value)}
                          className={`px-3 py-1.5 text-sm border rounded-md transition-colors
                            ${isSelected
                              ? 'bg-[#900036] text-white border-[#900036]'
                              : 'border-gray-300 hover:border-gray-500'
                            }`}
                        >
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Stock */}
            {attributeKeys.length > 0 && (
              <p className="text-sm font-medium text-gray-700 px-4">
                {resolvedVariant
                  ? `Stocks: ${resolvedVariant.stock}`
                  : `Select ${attributeKeys.find(k => !selectedAttributes[k]) ?? 'an option'} to see stock`
                }
              </p>
            )}

            {/* Quantity */}
            <div className="space-y-3 px-4">
              <h3 className="text-base font-bold text-gray-900">Quantity</h3>
              <ProductQuantityButton />
            </div>

            <div className="flex-1" />

            {/* Add to Cart */}
            <div className="px-6">
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={!canProceed || isAdding}
                className="w-full rounded-full bg-[#900036] hover:bg-[#700028] disabled:opacity-40 text-white font-bold text-base py-6 transition-colors duration-200"
              >
                {isAdding ? 'Adding...' : 'Add to cart'}
              </Button>
            </div>

          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default FavoriteCard