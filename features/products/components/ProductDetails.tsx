'use client'

import { useState, useEffect } from 'react'
import { useWishlistStore } from "@/features/wishlist/stores/wishlist-store";
import { getPublicImageUrl } from '@/shared/utils/image-url';

import Image from 'next/image'
import Link from 'next/link'
import type { ProductDetails } from '@/shared/types/product'
import { useCartStore } from '@/features/cart/stores/cart-store'
import { customToast } from '@/shared/components/common/modals/ToastCustom'

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/shared/components/ui/carousel";
import { ShoppingCart, Heart, Package } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import ProductQuantityButton from './ProductQuantityButton'
import WholesaleCheckIcon from '@/shared/components/common/icons/WholesaleCheckIcon'
import { variantMatchesSelection } from '@/shared/utils/variant-selection'

const WHOLESALE_LABEL = 'wholesale'
const PLACEHOLDER_IMAGE = '/images/placeholder.png'

const roundToCents = (value: number) => Math.round(value * 100) / 100

type Props = {
    product: ProductDetails
}

const ProductDetails = ({ product }: Props) => {

    const { addItem, quantityInput, resetQuantity } = useCartStore()
    const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlistStore();

    const inWishlist = isWishlisted(product.product_id)

    // A product is sold through its variants, so a variant-less product (an admin
    // data error) is treated as unavailable: the page still renders with safe
    // fallbacks (placeholder image, $0.00 price) and purchase is disabled.
    const hasVariants = (product.variants?.length ?? 0) > 0

    // Default to the cheapest variant so the page mirrors the catalog (mv).
    const defaultVariant = hasVariants
        ? product.variants.reduce(
            (cheapest, variant) => (variant.final_price < cheapest.final_price ? variant : cheapest),
            product.variants[0],
        )
        : undefined

    const attributeKeys: string[] = Array.from(
        new Set(product.variants.flatMap((variant) => variant.attributes?.map((attr) => attr.name) ?? [])),
    )

    // Pre-select the default variant's attributes so price, stock, and "Add to cart"
    // are ready on load without manual selection.
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string | null>>(
        () =>
            Object.fromEntries(
                attributeKeys.map((key) => [
                    key,
                    defaultVariant?.attributes?.find((attr) => attr.name === key)?.value ?? null,
                ]),
            ),
    )

    const [carouselApi, setCarouselApi] = useState<CarouselApi>()
    const [currentSlide, setCurrentSlide] = useState(0)
    const [slideCount, setSlideCount] = useState(0)

    const hasDiscount = product.discount !== null && product.discount > 0

    const uniqueImages = product.variants
        .flatMap((variant) => variant.image_url)
        .filter(Boolean)
        .reduce<string[]>((images, url) => {
            if (!images.includes(url)) images.push(url)
            return images
        }, [])

    const carouselImages = uniqueImages.length > 0 ? uniqueImages : [PLACEHOLDER_IMAGE]

    const allAttributesSelected = attributeKeys.every((key) => selectedAttributes[key] !== null)
    const selectedKeys = attributeKeys.filter((key) => selectedAttributes[key] !== null)

    // The exact variant once every attribute is chosen; null until then.
    const resolvedVariant = allAttributesSelected
        ? product.variants.find((variant) =>
            variantMatchesSelection(variant, attributeKeys, selectedAttributes),
        ) ?? null
        : null

    // Best variant to preview: the resolved one, else the closest partial match,
    // else the cheapest (default) variant.
    const displayVariant =
        resolvedVariant ??
        product.variants.find((variant) =>
            variantMatchesSelection(variant, selectedKeys, selectedAttributes),
        ) ??
        defaultVariant

    const wholesaleTier =
        displayVariant?.pricing_tiers?.find((tier) => tier.label === WHOLESALE_LABEL) ?? null
    const isWholesaleUnlocked = wholesaleTier !== null && quantityInput >= wholesaleTier.min_quantity
    const wholesalePrice = wholesaleTier
        ? roundToCents((displayVariant?.price ?? 0) * (1 - wholesaleTier.discount_percent / 100))
        : null

    useEffect(() => { resetQuantity() }, [])

    useEffect(() => {
        if (!carouselApi) return
        setSlideCount(carouselApi.scrollSnapList().length)
        setCurrentSlide(carouselApi.selectedScrollSnap() + 1)
        carouselApi.on("select", () => setCurrentSlide(carouselApi.selectedScrollSnap() + 1))

        // Open the gallery on the default variant's image.
        const firstImage = defaultVariant?.image_url?.[0]
        if (firstImage) {
            const index = carouselImages.indexOf(firstImage)
            if (index > 0) carouselApi.scrollTo(index, true)
        }
    }, [carouselApi])

    // Available values for one attribute, given the other already-selected attributes.
    function getOptionsForKey(key: string): string[] {
        const otherSelectedKeys = attributeKeys.filter(
            (otherKey) => otherKey !== key && selectedAttributes[otherKey] !== null,
        )
        return Array.from(
            new Set(
                product.variants
                    .filter((variant) =>
                        variantMatchesSelection(variant, otherSelectedKeys, selectedAttributes),
                    )
                    .flatMap(
                        (variant) =>
                            variant.attributes?.filter((attr) => attr.name === key).map((attr) => attr.value) ?? [],
                    ),
            ),
        )
    }

    function handleAttributeSelect(key: string, value: string) {
        const keyIndex = attributeKeys.indexOf(key)
        setSelectedAttributes((previous) => {
            const updated = { ...previous, [key]: value }
            // Selecting an earlier attribute clears the later (dependent) ones.
            attributeKeys.slice(keyIndex + 1).forEach((laterKey) => { updated[laterKey] = null })
            return updated
        })
        // Selecting the first attribute scrolls the gallery to its representative image.
        if (keyIndex === 0 && carouselApi) {
            const representativeVariant = product.variants.find((variant) =>
                variant.attributes?.some((attr) => attr.name === key && attr.value === value),
            )
            const firstImage = representativeVariant?.image_url?.[0]
            if (firstImage) {
                const index = carouselImages.indexOf(firstImage)
                if (index !== -1) carouselApi.scrollTo(index)
            }
        }
    }

    async function handleAddToCart() {
        const firstUnselectedKey = attributeKeys.find((key) => !selectedAttributes[key])
        if (firstUnselectedKey) {
            customToast.error({ title: 'Selection required', description: `Please select a ${firstUnselectedKey}.` })
            return
        }
        if (!resolvedVariant) {
            customToast.error({ title: 'Unavailable combination', description: 'This option combination is not available.' })
            return
        }
        if (quantityInput <= 0) return

        const selectedOption = Object.values(selectedAttributes)[0] ?? null
        await addItem(resolvedVariant.variant_id, quantityInput, selectedOption)

        const addError = useCartStore.getState().error
        if (addError) {
            customToast.error({ title: 'Failed to add to cart', description: addError })
            return
        }
        customToast.success({
            title: 'Added to cart',
            description: `${product.name} has been added to your cart.`,
        })
    }

    async function handleWishlistToggle(productId: number) {
        if (inWishlist) {
            await removeFromWishlist(productId)
            const removeError = useWishlistStore.getState().error
            if (removeError) { customToast.error({ title: 'Failed to remove from wishlist', description: removeError }); return }
            customToast.success({ title: 'Removed from wishlist', description: 'Product has been removed from your wishlist.' })
        } else {
            await addToWishlist(productId)
            const addError = useWishlistStore.getState().error
            if (addError) { customToast.error({ title: 'Failed to add to wishlist', description: addError }); return }
            customToast.success({ title: 'Added to wishlist', description: 'Product has been added to your wishlist.' })
        }
    }

    const canAddToCart = !!resolvedVariant && quantityInput > 0

    return (
        <div className="w-full h-full">
            <div className="grid md:grid-cols-2 grid-cols-1 w-full gap-5">

                {/* IMAGE CAROUSEL */}
                <div className="relative w-full">
                    <Carousel className="w-full" setApi={setCarouselApi}>
                        <CarouselContent>
                            {carouselImages.map((url: string, index: number) => (
                                <CarouselItem key={index}>
                                    <div className="relative w-full aspect-square sm:aspect-12/13">
                                        <Image
                                            src={url === PLACEHOLDER_IMAGE ? PLACEHOLDER_IMAGE : getPublicImageUrl(url)}
                                            alt={`${product.name} image ${index + 1}`}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover rounded-xl"
                                            priority={index === 0}
                                        />
                                        <div className="absolute bottom-2 right-3 text-xs text-white bg-black/40 px-2 py-0.5 rounded-full">
                                            {currentSlide} / {slideCount}
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </div>

                {/* PRODUCT INFO */}
                <div className="flex flex-col gap-4">

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

                    {/* PRICE — swaps to wholesale price when the quantity threshold is met */}
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-3xl sm:text-4xl font-bold text-brand">
                            ${isWholesaleUnlocked && wholesalePrice !== null
                                ? wholesalePrice.toFixed(2)
                                : (displayVariant?.final_price ?? 0).toFixed(2)
                            }
                        </p>
                        {isWholesaleUnlocked && wholesalePrice !== null ? (
                            <div className="flex gap-2 items-center">
                                <p className="text-base sm:text-lg line-through text-muted-foreground">
                                    ${(displayVariant?.price ?? 0).toFixed(2)}
                                </p>
                                <p className="text-xs sm:text-sm bg-discount text-brand px-2 py-1 rounded-md">
                                    -{wholesaleTier!.discount_percent}%
                                </p>
                            </div>
                        ) : hasDiscount && (
                            <div className="flex gap-2 items-center">
                                <p className="text-base sm:text-lg line-through text-muted-foreground">
                                    ${(displayVariant?.price ?? 0).toFixed(2)}
                                </p>
                                <p className="text-xs sm:text-sm bg-discount text-brand px-2 py-1 rounded-md">
                                    -{product.discount}%
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ATTRIBUTE PICKERS. The first key renders image thumbnails, the rest text chips. */}
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
                                            const representativeVariant = product.variants.find((variant) =>
                                                variant.attributes?.some((attr) => attr.name === key && attr.value === value),
                                            )
                                            const thumbnailUrl = representativeVariant?.image_url?.[0]
                                                ? getPublicImageUrl(representativeVariant.image_url[0])
                                                : PLACEHOLDER_IMAGE
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
                                ? `Select ${attributeKeys.filter((key) => !selectedAttributes[key])[0] ?? 'an option'} to see stock`
                                : hasVariants
                                    ? `Stocks: ${defaultVariant?.stock ?? 0}`
                                    : 'Currently unavailable'
                        }
                    </p>

                    {/* QUANTITY + WHOLESALE NOTICE (beside the stepper) */}
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-medium text-foreground">Quantity</p>
                        <ProductQuantityButton />

                        {wholesaleTier && (
                            isWholesaleUnlocked ? (
                                <div className="inline-flex items-center gap-2 text-success bg-success-tint px-3 py-2 rounded-full w-fit text-xs sm:text-sm">
                                    <WholesaleCheckIcon className="shrink-0 w-4 h-4" />
                                    <p className="font-medium">
                                        Wholesale pricing applied to your order!
                                    </p>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 text-warning bg-warning-tint px-3 py-2 rounded-full w-fit text-xs sm:text-sm">
                                    <Package className="shrink-0 w-4 h-4" />
                                    <p className="font-medium">
                                        Add {wholesaleTier.min_quantity - quantityInput} more for {wholesaleTier.discount_percent}% off
                                    </p>
                                </div>
                            )
                        )}
                    </div>

                    {/* ADD TO CART / BUY NOW / WISHLIST */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <div className="flex gap-3 sm:contents">
                            <Button type="button" onClick={handleAddToCart} disabled={!canAddToCart}
                                className="sm:flex-1 h-11 bg-brand hover:bg-brand-hover text-white rounded-full cursor-pointer">
                                <ShoppingCart className="mr-2 w-4 h-4" />
                                Add to cart
                            </Button>
                            <Button type="button" variant="outline" disabled={!canAddToCart}
                                className="sm:flex-1 h-11 border-brand text-brand rounded-full hover:bg-brand hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                asChild={canAddToCart}>
                                {canAddToCart ? <Link href="/checkout">Buy Now</Link> : <span>Buy Now</span>}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleWishlistToggle(product.product_id)} className="shrink-0">
                                <Heart className={`w-5 h-5 transition-colors ${inWishlist ? 'fill-brand text-brand' : 'text-muted-foreground'}`} />
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
