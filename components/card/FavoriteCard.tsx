'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Sheet, SheetContent, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet"
import Image from 'next/image'
import { FavoriteView } from '@/types/favorite'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import { Button } from '../ui/button'
import { ArrowLeft, ShoppingBag, Package } from 'lucide-react'
import WholesaleCheckIcon from '@/components/icons/WholesaleCheckIcon'
import ProductQuantityButton from '../functional-ui/product/ProductQuantityButton'
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useCartStore } from '@/store/cartStore'
import { customToast } from '@/components/popup/ToastCustom'
import { variantMatchesSelection } from '@/helper/variantSelection'

const WHOLESALE_LABEL = 'wholesale'
const PLACEHOLDER_IMAGE = '/images/placeholder.png'

const roundToCents = (value: number) => Math.round(value * 100) / 100

// Leading numeric prefix of a value (e.g. "12oz" → 12), used to sort sizes numerically.
const parseLeadingNumber = (value: string): number => {
  const match = value.match(/^[\d.]+/)
  return match ? parseFloat(match[0]) : NaN
}

type Props = {
  product: FavoriteView
}

const FavoriteCard: React.FC<Props> = ({ product }) => {
  const hasDiscount = product.discount !== null && product.discount > 0
  const [isAdding, setIsAdding] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const { addItem, quantityInput, resetQuantity } = useCartStore()

  const attributeKeys: string[] = useMemo(
    () =>
      Array.from(
        new Set(
          (product.variants ?? []).flatMap(
            (variant) => variant.attributes?.map((attr) => attr.name) ?? [],
          ),
        ),
      ),
    [product.variants],
  )

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string | null>>(
    () => Object.fromEntries(attributeKeys.map((key) => [key, null])),
  )

  const defaultVariant = product.variants?.[0]

  // Card-level wholesale flag: true if ANY variant has a wholesale tier (mirrors the
  // catalog mv's has_wholesale) so the card badge matches the product page. The sheet
  // below uses the variant-specific tier for live pricing.
  const cardWholesaleTier = useMemo(() => {
    for (const variant of product.variants ?? []) {
      const tier = variant.pricing_tiers?.find((candidate) => candidate.label === WHOLESALE_LABEL)
      if (tier) return tier
    }
    return null
  }, [product.variants])

  const originalPrice = defaultVariant?.price ?? 0
  const discountedPrice = hasDiscount
    ? originalPrice * (1 - (product.discount ?? 0) / 100)
    : originalPrice

  // Available values for one attribute, given the other already-selected attributes.
  // Numeric-leading values (sizes) sort numerically; the rest alphabetically.
  function getOptionsForKey(key: string): string[] {
    const otherSelectedKeys = attributeKeys.filter(
      (otherKey) => otherKey !== key && selectedAttributes[otherKey] !== null,
    )
    const optionValues = Array.from(
      new Set(
        (product.variants ?? [])
          .filter((variant) =>
            variantMatchesSelection(variant, otherSelectedKeys, selectedAttributes),
          )
          .flatMap(
            (variant) =>
              variant.attributes?.filter((attr) => attr.name === key).map((attr) => attr.value) ?? [],
          ),
      ),
    )

    return optionValues.sort((a, b) => {
      const aNumber = parseLeadingNumber(a)
      const bNumber = parseLeadingNumber(b)
      if (!isNaN(aNumber) && !isNaN(bNumber)) return aNumber - bNumber
      if (!isNaN(aNumber)) return -1
      if (!isNaN(bNumber)) return 1
      return a.localeCompare(b)
    })
  }

  const allAttributesSelected = attributeKeys.every((key) => selectedAttributes[key] !== null)
  const selectedKeys = attributeKeys.filter((key) => selectedAttributes[key] !== null)

  // The exact variant once every attribute is chosen; null until then.
  const resolvedVariant = allAttributesSelected
    ? (product.variants ?? []).find((variant) =>
        variantMatchesSelection(variant, attributeKeys, selectedAttributes),
      ) ?? null
    : null

  // Best variant to preview: the resolved one, else the closest partial match,
  // else the first variant.
  const displayVariant =
    resolvedVariant ??
    (product.variants ?? []).find((variant) =>
      variantMatchesSelection(variant, selectedKeys, selectedAttributes),
    ) ??
    defaultVariant

  // Wholesale pricing for the previewed variant (same logic as ProductDetails).
  const wholesaleTier =
    displayVariant?.pricing_tiers?.find((tier) => tier.label === WHOLESALE_LABEL) ?? null
  const isWholesaleUnlocked = wholesaleTier !== null && quantityInput >= wholesaleTier.min_quantity
  const wholesalePrice = wholesaleTier
    ? roundToCents((displayVariant?.price ?? 0) * (1 - wholesaleTier.discount_percent / 100))
    : null

  const canAddToCart = !!resolvedVariant && quantityInput > 0

  useEffect(() => {
    if (isSheetOpen) resetQuantity()
  }, [isSheetOpen])

  function handleAttributeSelect(key: string, value: string) {
    const keyIndex = attributeKeys.indexOf(key)
    setSelectedAttributes((previous) => {
      const updated = { ...previous, [key]: value }
      // Selecting an earlier attribute clears the later (dependent) ones.
      attributeKeys.slice(keyIndex + 1).forEach((laterKey) => { updated[laterKey] = null })
      return updated
    })
  }

  async function handleAddToCart() {
    if (isAdding) return

    const firstUnselectedKey = attributeKeys.find((key) => !selectedAttributes[key])
    if (firstUnselectedKey) {
      customToast.error({
        title: `Please select a ${firstUnselectedKey}`,
        description: `Choose a ${firstUnselectedKey} option before adding to cart.`,
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

      const addError = useCartStore.getState().error
      if (addError) {
        customToast.error({ title: 'Failed to add to cart', description: addError })
        return
      }

      customToast.success({
        title: 'Added to cart',
        description: `${product.product_name} has been added to your cart.`,
      })
      setIsSheetOpen(false)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <Card
        onClick={() => setIsSheetOpen(true)}
        className="w-full h-full border-none shadow-none relative overflow-hidden flex flex-col cursor-pointer group"
      >
        {cardWholesaleTier && (
          <div className="absolute top-0 right-0 bg-brand text-white text-xs px-3 py-1 rounded-tr-md rounded-bl-md z-10 flex items-center gap-1">
            <Package className="w-3 h-3" />
            Wholesale
          </div>
        )}

        <div className="relative w-full aspect-square overflow-hidden rounded-md bg-muted">
          <Image
            src={getPublicImageUrl(product.primary_image) ?? PLACEHOLDER_IMAGE}
            alt={product.product_name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105 bg-muted rounded-md overflow-hidden"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
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
              <span className="text-xs text-muted-foreground line-through">
                ${originalPrice.toFixed(2)}
              </span>
              <span className="text-xs bg-discount text-brand px-2 py-0.5 rounded">
                -{product.discount}%
              </span>
            </div>
          )}
          {cardWholesaleTier && (
            <p className="text-xs text-brand font-medium">
              Buy {cardWholesaleTier.min_quantity}+ for {cardWholesaleTier.discount_percent}% off
            </p>
          )}
        </CardContent>

        <CardFooter className="px-0 pt-2 pb-0">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setIsSheetOpen(true) }}
            className="w-full rounded-full border-brand text-brand text-xs sm:text-sm font-bold hover:bg-brand hover:text-white transition-colors duration-200"
          >
            Add To Cart
          </Button>
        </CardFooter>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
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
              onClick={() => setIsSheetOpen(false)}
              className="flex items-center gap-1 text-foreground hover:text-black transition-colors w-fit"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </SheetHeader>

          <div className="flex flex-col flex-1 pt-4 pb-6 gap-6">

            {/* Product summary row */}
            <div className="flex gap-4 items-start px-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted shrink-0">
                <Image
                  src={getPublicImageUrl(product.primary_image) ?? PLACEHOLDER_IMAGE}
                  alt={product.product_name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h2 className="text-sm font-semibold leading-snug text-foreground">
                  {product.product_name}
                </h2>

                {/* Price — swaps to wholesale price when the quantity threshold is met */}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-base font-bold text-foreground">
                    ${isWholesaleUnlocked && wholesalePrice !== null
                      ? wholesalePrice.toFixed(2)
                      : (displayVariant?.final_price ?? discountedPrice).toFixed(2)
                    }
                  </span>
                  {isWholesaleUnlocked && wholesalePrice !== null ? (
                    <>
                      <span className="text-sm text-muted-foreground line-through">
                        ${(displayVariant?.price ?? originalPrice).toFixed(2)}
                      </span>
                      <span className="text-xs bg-brand text-white px-2 py-0.5 rounded font-medium">
                        -{wholesaleTier!.discount_percent}%
                      </span>
                    </>
                  ) : hasDiscount && (
                    <>
                      <span className="text-sm text-muted-foreground line-through">
                        ${(displayVariant?.price ?? originalPrice).toFixed(2)}
                      </span>
                      <span className="text-xs bg-discount text-brand px-2 py-0.5 rounded font-medium">
                        -{product.discount}%
                      </span>
                    </>
                  )}
                </div>

                {wholesaleTier && (
                  <div className="mt-1 flex items-center gap-1.5 bg-brand text-white text-xs px-3 py-1.5 rounded-full w-fit font-medium">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Buy {wholesaleTier.min_quantity}+ for {wholesaleTier.discount_percent}% off
                  </div>
                )}
              </div>
            </div>

            <div className="bg-muted h-[8px] rounded-md" />

            {/* Attribute pickers. The first key renders image thumbnails, the rest text chips. */}
            {attributeKeys.map((key, keyIndex) => {
              const options = getOptionsForKey(key)
              const isFirstKey = keyIndex === 0

              return (
                <div key={key} className="flex flex-col space-y-2 px-4">
                  <p className="text-sm font-medium text-foreground capitalize">{key}</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((value) => {
                      const isSelected = selectedAttributes[key] === value

                      if (isFirstKey) {
                        const representativeVariant = (product.variants ?? []).find((variant) =>
                          variant.attributes?.some((attr) => attr.name === key && attr.value === value),
                        )
                        const thumbnailUrl = representativeVariant?.image_url?.[0]
                          ? getPublicImageUrl(representativeVariant.image_url[0])
                          : PLACEHOLDER_IMAGE

                        return (
                          <button
                            type="button"
                            key={value}
                            onClick={() => handleAttributeSelect(key, value)}
                            className="flex flex-col items-center gap-1"
                          >
                            <div className={`w-14 h-14 relative overflow-hidden border-2 rounded-md transition-colors ${isSelected ? 'border-brand' : 'border-border hover:border-border'}`}>
                              <Image
                                src={thumbnailUrl ?? PLACEHOLDER_IMAGE}
                                fill sizes="56px"
                                className="object-cover"
                                alt={value}
                                loading="eager"
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{value}</span>
                          </button>
                        )
                      }

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleAttributeSelect(key, value)}
                          className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${isSelected ? 'bg-brand text-white border-brand' : 'border-border hover:border-border'}`}
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
              <p className="text-sm font-medium text-foreground px-4">
                {resolvedVariant
                  ? `Stocks: ${resolvedVariant.stock}`
                  : `Select ${attributeKeys.find((key) => !selectedAttributes[key]) ?? 'an option'} to see stock`
                }
              </p>
            )}

            {/* Quantity + wholesale notice */}
            <div className="space-y-3 px-4">
              <h3 className="text-base font-bold text-foreground">Quantity</h3>
              <ProductQuantityButton />

              {wholesaleTier && (
                isWholesaleUnlocked ? (
                  <div className="inline-flex items-center gap-2 text-success bg-success-tint px-3 py-2 rounded-md w-fit text-sm">
                    <WholesaleCheckIcon size={14} className="shrink-0" />
                    <p className="font-medium">
                      Wholesale pricing applied! ({wholesaleTier.discount_percent}% off)
                    </p>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-warning bg-warning-tint px-3 py-2 rounded-md w-fit text-sm">
                    <Package size={14} className="shrink-0" />
                    <p className="font-medium">
                      Add {wholesaleTier.min_quantity - quantityInput} more for {wholesaleTier.discount_percent}% wholesale discount
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="flex-1" />

            {/* Add to cart */}
            <div className="px-6">
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAddToCart || isAdding}
                className="w-full rounded-full bg-brand hover:bg-brand-hover disabled:opacity-40 text-white font-bold text-base py-6 transition-colors duration-200"
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
