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
import { ShoppingCart, Heart, CircleCheckBig, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProductQuantityButton from './ProductQuantityButton'

type Props = {
    product: ProductDetails
}

const ProductDetails = ({ product }: Props) => {

    const { addItem, quantityInput, resetQuantity } = useCartStore()
    const { addFavorite, removeFavorite, isFavorite } = useFavoriteStore();

    // ─── Check if this product is already favorited ──────────────────────────
    const favorited = isFavorite(product.product_id)

    const defaultVariant = product.variants?.[0]

    // ─── Derive all attribute dimensions from the variants ──────────────────
    // e.g. ['flavor', 'size'] or ['color', 'size'] or ['model'] — whatever exists
    const attributeKeys: string[] = Array.from(
        new Set(
            product.variants.flatMap(v => v.attributes?.map(a => a.name) ?? [])
        )
    )

    // ─── State: one selected value per attribute key ────────────────────────
    // e.g. { flavor: null, size: null } or { color: null, size: null }
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string | null>>(
        () => Object.fromEntries(attributeKeys.map(k => [k, null]))
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

    // ─── Available options per attribute key ────────────────────────────────
    // Only shows values reachable given what's already selected in prior keys.
    // e.g. if Lime is selected, size only shows sizes Lime actually comes in.
    function getOptionsForKey(key: string): string[] {
        return Array.from(
            new Set(
                product.variants
                    .filter(v =>
                        // variant must match all OTHER already-selected attributes
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

    // ─── Resolved variant ───────────────────────────────────────────────────
    // The single SKU that matches ALL selected attributes.
    // null if any attribute is still unselected.
    const resolvedVariant = attributeKeys.every(k => selectedAttributes[k] !== null)
        ? product.variants.find(v =>
            attributeKeys.every(k =>
                v.attributes?.some(a => a.name === k && a.value === selectedAttributes[k])
            )
        ) ?? null
        : null

    // ─── Display variant for price ──────────────────────────────────────────
    // Best-effort partial match so price updates as user selects, even before
    // all attributes are chosen. Falls back to the first variant.
    const displayVariant = resolvedVariant
        ?? product.variants.find(v =>
            attributeKeys
                .filter(k => selectedAttributes[k] !== null)
                .every(k =>
                    v.attributes?.some(a => a.name === k && a.value === selectedAttributes[k])
                )
        )
        ?? defaultVariant

    useEffect(() => { resetQuantity() }, [])

    useEffect(() => {
        if (!api) return
        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap() + 1)
        api.on("select", () => setCurrent(api.selectedScrollSnap() + 1))
    }, [api])

    // ─── Select an attribute value ──────────────────────────────────────────
    // Resets all attributes that come AFTER the changed key so stale
    // downstream selections don't carry over (e.g. changing flavor clears size).
    function handleAttributeSelect(key: string, value: string) {
        const keyIndex = attributeKeys.indexOf(key)

        setSelectedAttributes(prev => {
            const next = { ...prev, [key]: value }
            // Clear downstream keys
            attributeKeys.slice(keyIndex + 1).forEach(k => { next[k] = null })
            return next
        })

        // Scroll carousel to first image of the representative variant
        // when the FIRST attribute key changes (i.e. the "primary" dimension)
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
        // Guard: make sure every attribute has a selection
        const firstUnselected = attributeKeys.find(k => !selectedAttributes[k])
        if (firstUnselected) {
            alert(`Please select a ${firstUnselected}`)
            return
        }
        if (!resolvedVariant) { alert('This combination is not available'); return }
        if (quantityInput <= 0) return
        const sizeValue =
            selectedAttributes['size'] ??
            Object.values(selectedAttributes)[0] ??
            ''

        await addItem(resolvedVariant.variant_id, quantityInput, sizeValue)
    }

    // ─── Toggle favorite — adds if not favorited, removes if already favorited ──
    async function handleFavoriteToggle(productId: number) {
        if (favorited) {
            await removeFavorite(productId)
            const error = useFavoriteStore.getState().error
            if (error) {
                customToast.error({ title: 'Failed to remove favorite', description: error })
                return
            }
            customToast.success({
                title: 'Removed from favorites',
                description: 'Product has been removed from your favorites.',
            })
        } else {
            await addFavorite(productId)
            const error = useFavoriteStore.getState().error
            if (error) {
                customToast.error({ title: 'Failed to add favorite', description: error })
                return
            }
            customToast.success({
                title: 'Added to favorites',
                description: 'Product has been added to your favorites.',
            })
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
                                    <div className="relative w-full aspect-square sm:aspect-[12/13]">
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

                    {product.wholesale && (
                        <div className="inline-flex items-center gap-2 bg-[#900036] text-white text-xs px-3 py-2 w-fit rounded-md">
                            <Package className="shrink-0 w-4 h-4" />
                            <span>Wholesale available</span>
                        </div>
                    )}

                    <h1 className="title-header">{product.name}</h1>

                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                        {product.description}
                    </p>

                    {/* PRICE */}
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-3xl sm:text-4xl font-bold text-[#900036]">
                            ${displayVariant.final_price.toFixed(2)}
                        </p>
                        {hasDiscount && (
                            <div className="flex gap-2 items-center">
                                <p className="text-base sm:text-lg line-through text-gray-400">
                                    ${displayVariant.price.toFixed(2)}
                                </p>
                                <p className="text-xs sm:text-sm bg-[#900036] text-white px-2 py-1 rounded-md">
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
                                <p className="text-sm font-medium text-gray-700 capitalize">{key}</p>
                                <div className="flex flex-wrap gap-2">
                                    {options.map((value) => {
                                        const isSelected = selectedAttributes[key] === value

                                        // First attribute key gets image thumbnails
                                        if (isFirstKey) {
                                            const repVariant = product.variants.find(v =>
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
                                                        className={`w-16 h-16 sm:w-20 sm:h-20 relative overflow-hidden border-2 rounded-md transition-colors
                                                            ${isSelected
                                                                ? 'border-[#900036]'
                                                                : 'border-gray-200 hover:border-gray-400'
                                                            }`}
                                                    >
                                                        <Image
                                                            src={thumbnailUrl}
                                                            fill
                                                            sizes="80px"
                                                            className="object-cover"
                                                            alt={value}
                                                            loading="eager"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-600">{value}</span>
                                                </button>
                                            )
                                        }

                                        // All subsequent attribute keys get pill buttons
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => handleAttributeSelect(key, value)}
                                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm border rounded-md transition-colors ${isSelected
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

                    {/* STOCK */}
                    <p className="text-sm font-medium text-gray-700">
                        {resolvedVariant
                            ? `Stocks: ${resolvedVariant.stock}`
                            : attributeKeys.length > 0
                                ? `Select ${attributeKeys.filter(k => !selectedAttributes[k])[0] ?? 'an option'} to see stock`
                                : `Stocks: ${defaultVariant.stock}`
                        }
                    </p>

                    {/* QUANTITY + WHOLESALE NOTICE */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-gray-700">Quantity</p>
                            <ProductQuantityButton />
                        </div>
                        {product.wholesale && (
                            <div className="inline-flex items-center gap-2 text-[#0F5132] mt-3 bg-[#EAF7F1] px-3 py-2 rounded-md w-fit text-sm">
                                <CircleCheckBig className="shrink-0 w-4 h-4" />
                                <p className="font-medium">Wholesale pricing applied!</p>
                            </div>
                        )}
                    </div>

                    {/* ADD TO CART / BUY NOW / FAVORITE */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <div className="flex gap-3 sm:contents">
                            <Button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={!canProceed}
                                className="sm:flex-1 h-11 bg-[#900036] hover:bg-[#700028] text-white rounded-full"
                            >
                                <ShoppingCart className="mr-2 w-4 h-4" />
                                Add to cart
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={!canProceed}
                                className="sm:flex-1 h-11 border-[#900036] text-[#900036] rounded-full hover:bg-[#900036] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                asChild={canProceed}
                            >
                                {canProceed ? <Link href="/checkout">Buy Now</Link> : <span>Buy Now</span>}
                            </Button>

                            {/* Heart button — filled if product is already in favorites */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleFavoriteToggle(product.product_id)}
                                className="shrink-0"
                            >
                                <Heart
                                    className={`w-5 h-5 transition-colors ${
                                        favorited
                                            ? 'fill-[#900036] text-[#900036]'
                                            : 'text-gray-500'
                                    }`}
                                />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PRODUCT DETAILS TABLE */}
            {product.product_details?.length > 0 && (
                <div className="w-full sm:w-2/3 md:w-1/2 lg:w-2/5 mt-6 md:mt-10 space-y-2">
                    <h2 className="title-header">Product Details</h2>
                    <div className="divide-y divide-gray-100">
                        {product.product_details.map((item, index) => (
                            <div key={index} className="flex items-start justify-between gap-4 py-2">
                                <span className="text-sm text-gray-500 shrink-0">{item.attribute_name}</span>
                                <span className="text-sm font-medium text-right">{item.attribute_value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-[#F5F5F5] h-[8px] my-7 rounded-md" />
        </div>
    )
}

export default ProductDetails