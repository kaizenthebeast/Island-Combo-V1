'use client'

import { useState, useEffect } from 'react'
import { useFavoriteStore } from "@/store/favoriteStore";
import { getPublicImageUrl } from '@/helper/getPublicImageUrl';

import Image from 'next/image'
import Link from 'next/link'
import type { ProductDetails } from '@/types/product'
import { useCartStore } from '@/store/cartStore'
import { customToast } from '@/components/popup/ToastCustom'

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import { ShoppingCart, Heart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProductQuantityButton from './ProductQuantityButton'
import WholesaleCheckIcon from '@/components/icons/WholesaleCheckIcon'

type Props = {
    product: ProductDetails
}

const ProductDetails = ({ product }: Props) => {

    const { addItem, quantityInput, resetQuantity } = useCartStore()
    const { addFavorite, removeFavorite, isFavorite } = useFavoriteStore();

    const favorited = isFavorite(product.product_id)

    // Default to the cheapest variant so the page mirrors the catalog (mv),
    // which surfaces the lowest-priced variant for each product.
    const defaultVariant = product.variants?.reduce(
        (cheapest, v) => (v.final_price < cheapest.final_price ? v : cheapest),
        product.variants[0]
    )

    // ─── Derive all attribute dimensions from the variants ──────────────────
    const attributeKeys: string[] = Array.from(
        new Set(
            product.variants.flatMap(v => v.attributes?.map(a => a.name) ?? [])
        )
    )

    // Pre-select the default variant's attributes (variation, size, …) so price,
    // stock, and "Add to cart" are ready on load without manual selection.
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string | null>>(
        () => Object.fromEntries(
            attributeKeys.map(k => [
                k,
                defaultVariant?.attributes?.find(a => a.name === k)?.value ?? null,
            ])
        )
    )

    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const [count, setCount] = useState(0)

    const hasDiscount = product.discount !== null && product.discount > 0

    const allProductImages = product.variants
        .flatMap((v) => v.image_url)
        .filter(Boolean)
        .reduce<string[]>((acc, url) => {
            if (!acc.includes(url)) acc.push(url)
            return acc
        }, [])

    const carouselImages = allProductImages.length > 0
        ? allProductImages
        : ["/images/placeholder.png"]

    // ───  Resolved variant ────────────────────────────────────────────────
    const resolvedVariant = attributeKeys.every(k => selectedAttributes[k] !== null)
        ? product.variants.find(v =>
            attributeKeys.every(k =>
                v.attributes?.some(a => a.name === k && a.value === selectedAttributes[k])
            )
        ) ?? null
        : null

    // ───  Display variant ─────────────────────────────────────────────────
    const displayVariant = resolvedVariant
        ?? product.variants.find(v =>
            attributeKeys
                .filter(k => selectedAttributes[k] !== null)
                .every(k =>
                    v.attributes?.some(a => a.name === k && a.value === selectedAttributes[k])
                )
        )
        ?? defaultVariant

    // ───  Wholesale tier logic ────────────────────────────────────────────
    const wholesaleTier = displayVariant?.pricing_tiers?.find(
        (t) => t.label === 'wholesale'
    ) ?? null

    const wholesaleUnlocked = wholesaleTier !== null && quantityInput >= wholesaleTier.min_quantity

    const wholesalePrice = wholesaleTier
        ? Math.round((displayVariant?.price ?? 0) * (1 - wholesaleTier.discount_percent / 100) * 100) / 100
        : null

    useEffect(() => { resetQuantity() }, [])

    useEffect(() => {
        if (!api) return
        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap() + 1)
        api.on("select", () => setCurrent(api.selectedScrollSnap() + 1))

        // Open the gallery on the default variant's image
        const firstImage = defaultVariant?.image_url?.[0]
        if (firstImage) {
            const index = carouselImages.indexOf(firstImage)
            if (index > 0) api.scrollTo(index, true)
        }
    }, [api])

    // ─── Available options per attribute key ────────────────────────────────
    function getOptionsForKey(key: string): string[] {
        return Array.from(
            new Set(
                product.variants
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
    }

    // ─── Select an attribute value ──────────────────────────────────────────
    function handleAttributeSelect(key: string, value: string) {
        const keyIndex = attributeKeys.indexOf(key)
        setSelectedAttributes(prev => {
            const next = { ...prev, [key]: value }
            attributeKeys.slice(keyIndex + 1).forEach(k => { next[k] = null })
            return next
        })
        if (keyIndex === 0 && api) {
            const repVariant = product.variants.find(v =>
                v.attributes?.some(a => a.name === key && a.value === value)
            )
            const firstImage = repVariant?.image_url?.[0]
            if (firstImage) {
                const index = carouselImages.indexOf(firstImage)
                if (index !== -1) api.scrollTo(index)
            }
        }
    }

    async function handleAddToCart() {
        const firstUnselected = attributeKeys.find(k => !selectedAttributes[k])
        if (firstUnselected) {
            customToast.error({ title: 'Selection required', description: `Please select a ${firstUnselected}.` })
            return
        }
        if (!resolvedVariant) {
            customToast.error({ title: 'Unavailable combination', description: 'This option combination is not available.' })
            return
        }
        if (quantityInput <= 0) return

        const selectedOption = Object.values(selectedAttributes)[0] ?? null
        await addItem(resolvedVariant.variant_id, quantityInput, selectedOption)

        const error = useCartStore.getState().error
        if (error) {
            customToast.error({ title: 'Failed to add to cart', description: error })
            return
        }
        customToast.success({
            title: 'Added to cart',
            description: `${product.name} has been added to your cart.`,
        })
    }

    async function handleFavoriteToggle(productId: number) {
        if (favorited) {
            await removeFavorite(productId)
            const error = useFavoriteStore.getState().error
            if (error) { customToast.error({ title: 'Failed to remove favorite', description: error }); return }
            customToast.success({ title: 'Removed from favorites', description: 'Product has been removed from your favorites.' })
        } else {
            await addFavorite(productId)
            const error = useFavoriteStore.getState().error
            if (error) { customToast.error({ title: 'Failed to add favorite', description: error }); return }
            customToast.success({ title: 'Added to favorites', description: 'Product has been added to your favorites.' })
        }
    }

    const canProceed = !!resolvedVariant && quantityInput > 0

    return (
        <div className="w-full h-full">
            <div className="grid md:grid-cols-2 grid-cols-1 w-full gap-5">

                {/* IMAGE CAROUSEL */}
                <div className="relative w-full">
                    <Carousel className="w-full" setApi={setApi}>
                        <CarouselContent>
                            {carouselImages.map((url: string, index: number) => (
                                <CarouselItem key={index}>
                                    <div className="relative w-full aspect-square sm:aspect-12/13">
                                        <Image
                                            src={getPublicImageUrl(url) || defaultVariant.image_url[0]}
                                            alt={`${product.name} image ${index + 1}`}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover rounded-xl"
                                            priority={index === 0}
                                        />
                                        <div className="absolute bottom-2 right-3 text-xs text-white bg-black/40 px-2 py-0.5 rounded-full">
                                            {current} / {count}
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </div>

                {/* PRODUCT INFO */}
                <div className="flex flex-col gap-4">

                    {/* Wholesale available badge — only shown if variant has a wholesale tier */}
                    {wholesaleTier && (
                        <div className="inline-flex items-center gap-2 bg-brand text-white text-xs px-3 py-2 w-fit rounded-md">
                            <Package className="shrink-0 w-4 h-4" />
                            <span>
                                Wholesale available — buy {wholesaleTier.min_quantity}+ for{' '}
                                <span className="font-bold">{wholesaleTier.discount_percent}% off</span>
                            </span>
                        </div>
                    )}

                    <h1 className="title-header">{product.name}</h1>

                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                        {product.description}
                    </p>

                    {/* PRICE */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Swaps to wholesale price when threshold is met */}
                        <p className="text-3xl sm:text-4xl font-bold text-brand">
                            ${wholesaleUnlocked && wholesalePrice !== null
                                ? wholesalePrice.toFixed(2)
                                : displayVariant.final_price.toFixed(2)
                            }
                        </p>
                        {wholesaleUnlocked && wholesalePrice !== null ? (
                            // Wholesale active — show original price struck through
                            <div className="flex gap-2 items-center">
                                <p className="text-base sm:text-lg line-through text-muted-foreground">
                                    ${displayVariant.price.toFixed(2)}
                                </p>
                                <p className="text-xs sm:text-sm bg-discount text-brand px-2 py-1 rounded-md">
                                    -{wholesaleTier!.discount_percent}%
                                </p>
                            </div>
                        ) : hasDiscount && (
                            // Regular sale discount
                            <div className="flex gap-2 items-center">
                                <p className="text-base sm:text-lg line-through text-muted-foreground">
                                    ${displayVariant.price.toFixed(2)}
                                </p>
                                <p className="text-xs sm:text-sm bg-discount text-brand px-2 py-1 rounded-md">
                                    -{product.discount}%
                                </p>
                            </div>
                        )}
                    </div>

                    {/* GENERIC ATTRIBUTE PICKERS */}
                    {attributeKeys.map((key, keyIndex) => {
                        const options = getOptionsForKey(key)
                        const isFirstKey = keyIndex === 0
                        return (
                            <div key={key} className="flex flex-col space-y-2">
                                <p className="text-sm font-medium text-foreground capitalize">{key}</p>
                                <div className="flex flex-wrap gap-2">
                                    {options.map((value) => {
                                        const isSelected = selectedAttributes[key] === value
                                        if (isFirstKey) {
                                            const repVariant = product.variants.find(v =>
                                                v.attributes?.some(a => a.name === key && a.value === value)
                                            )
                                            const thumbnailUrl = repVariant?.image_url?.[0]
                                                ? getPublicImageUrl(repVariant.image_url[0])
                                                : '/images/placeholder.png'
                                            return (
                                                <button type="button" key={value} onClick={() => handleAttributeSelect(key, value)} className="flex flex-col items-center gap-1">
                                                    <div className={`w-16 h-16 sm:w-20 sm:h-20 relative overflow-hidden border-2 rounded-md transition-colors ${isSelected ? 'border-brand' : 'border-border hover:border-border'}`}>
                                                        <Image src={thumbnailUrl} fill sizes="80px" className="object-cover" alt={value} loading="eager" />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{value}</span>
                                                </button>
                                            )
                                        }
                                        return (
                                            <button key={value} type="button" onClick={() => handleAttributeSelect(key, value)}
                                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm border rounded-md transition-colors ${isSelected ? 'bg-brand text-white border-brand' : 'border-border hover:border-border'}`}>
                                                {value}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}

                    {/* STOCK */}
                    <p className="text-sm font-medium text-foreground">
                        {resolvedVariant
                            ? `Stocks: ${resolvedVariant.stock}`
                            : attributeKeys.length > 0
                                ? `Select ${attributeKeys.filter(k => !selectedAttributes[k])[0] ?? 'an option'} to see stock`
                                : `Stocks: ${defaultVariant.stock}`
                        }
                    </p>

                    {/* QUANTITY + WHOLESALE NOTICE (beside the stepper) */}
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-medium text-foreground">Quantity</p>
                        <ProductQuantityButton />

                        {wholesaleTier && (
                            wholesaleUnlocked ? (
                                // Threshold met — confirm wholesale is active
                                <div className="inline-flex items-center gap-2 text-success bg-success-tint px-3 py-2 rounded-full w-fit text-xs sm:text-sm">
                                    <WholesaleCheckIcon className="shrink-0 w-4 h-4" />
                                    <p className="font-medium">
                                        Wholesale pricing applied to your order!
                                    </p>
                                </div>
                            ) : (
                                // Threshold not yet met — nudge user to add more
                                <div className="inline-flex items-center gap-2 text-warning bg-warning-tint px-3 py-2 rounded-full w-fit text-xs sm:text-sm">
                                    <Package className="shrink-0 w-4 h-4" />
                                    <p className="font-medium">
                                        Add {wholesaleTier.min_quantity - quantityInput} more for {wholesaleTier.discount_percent}% off
                                    </p>
                                </div>
                            )
                        )}
                    </div>

                    {/* ADD TO CART / BUY NOW / FAVORITE */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <div className="flex gap-3 sm:contents">
                            <Button type="button" onClick={handleAddToCart} disabled={!canProceed}
                                className="sm:flex-1 h-11 bg-brand hover:bg-brand-hover text-white rounded-full cursor-pointer">
                                <ShoppingCart className="mr-2 w-4 h-4" />
                                Add to cart
                            </Button>
                            <Button type="button" variant="outline" disabled={!canProceed}
                                className="sm:flex-1 h-11 border-brand text-brand rounded-full hover:bg-brand hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                asChild={canProceed}>
                                {canProceed ? <Link href="/checkout">Buy Now</Link> : <span>Buy Now</span>}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleFavoriteToggle(product.product_id)} className="shrink-0">
                                <Heart className={`w-5 h-5 transition-colors ${favorited ? 'fill-brand text-brand' : 'text-muted-foreground'}`} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PRODUCT DETAILS TABLE */}
            {product.product_details?.length > 0 && (
                <div className="w-full sm:w-2/3 md:w-1/2 lg:w-2/5 mt-6 md:mt-10 space-y-2">
                    <h2 className="title-header">Product Details</h2>
                    <div>
                        {product.product_details.map((item, index) => (
                            <div key={index} className="flex items-start justify-between gap-4 py-2">
                                <span className="text-sm text-muted-foreground shrink-0">{item.attribute_name}</span>
                                <span className="text-sm font-medium text-right">{item.attribute_value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-muted h-[8px] my-7 rounded-md" />
        </div>
    )
}

export default ProductDetails