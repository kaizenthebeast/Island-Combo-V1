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
    const addFavoriteToStore = useFavoriteStore((state) => state.addFavorite)

    const defaultVariant = product.variants?.[0]
    const [selectedVariant, setSelectedVariant] = useState(defaultVariant)
    const [selectedSize, setSelectedSize] = useState<string | null>(null)

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

    const selectedFlavor = selectedVariant.attributes
        ?.find((att) => att.name === 'flavor')?.value

    const sizes = Array.from(
        new Set(
            product.variants
                .filter((v) =>
                    v.attributes?.some(
                        (att) => att.name === 'flavor' && att.value === selectedFlavor
                    )
                )
                .flatMap((v) =>
                    v.attributes
                        ?.filter((att) => att.name === 'size')
                        .map((a) => a.value)
                )
        )
    )

    const resolvedVariant = selectedSize
        ? product.variants.find((v) =>
            v.attributes?.some((a) => a.name === 'flavor' && a.value === selectedFlavor) &&
            v.attributes?.some((a) => a.name === 'size' && a.value === selectedSize)
        )
        : null

    useEffect(() => { resetQuantity() }, [])

    useEffect(() => {
        if (!api) return
        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap() + 1)
        api.on("select", () => setCurrent(api.selectedScrollSnap() + 1))
    }, [api])

    function handleVariantChange(variant: typeof defaultVariant) {
        setSelectedVariant(variant)
        setSelectedSize(null)

        // Find the first image of this variant in the carousel and scroll to it
        const firstImage = variant.image_url?.[0]
        if (firstImage && api) {
            const index = carouselImages.indexOf(firstImage)
            if (index !== -1) api.scrollTo(index)
        }
    }

    async function handleAddToCart() {
        if (!selectedVariant) return
        if (!selectedSize) { alert("Please select a size"); return }
        if (quantityInput <= 0) return
        if (!resolvedVariant) { alert("This size is not available for the selected flavor"); return }
        await addItem(resolvedVariant.variant_id, quantityInput, selectedSize)
    }

    async function handleAddFavorite(productId: number) {
        await addFavoriteToStore(productId)
        const error = useFavoriteStore.getState().error
        if (error) {
            customToast.error({ title: 'Failed to add favorite', description: error })
            return
        }
        customToast.success({
            title: 'Successfully adding product to favorites',
            description: 'Success adding the product on favorite lists.',
        })
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
                                            src={getPublicImageUrl(url) || selectedVariant.image_url[0]}
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
                            ${selectedVariant.final_price.toFixed(2)}
                        </p>
                        {hasDiscount && (
                            <div className="flex gap-2 items-center">
                                <p className="text-base sm:text-lg line-through text-gray-400">
                                    ${selectedVariant.price.toFixed(2)}
                                </p>
                                <p className="text-xs sm:text-sm bg-[#900036] text-white px-2 py-1 rounded-md">
                                    -{product.discount}%
                                </p>
                            </div>
                        )}
                    </div>

                    {/* VARIANT THUMBNAILS */}
                    <div className="flex flex-col space-y-2">
                        <p className="text-sm font-medium text-gray-700">Variants</p>
                        <div className="flex flex-wrap gap-2">
                            {product.variants.map((variant) => {
                                const isActive = selectedVariant.variant_id === variant.variant_id
                                const thumbnailUrl = variant.image_url?.[0]
                                    ? getPublicImageUrl(variant.image_url[0])
                                    : '/images/placeholder.png'

                                return (
                                    <button
                                        type="button"
                                        key={variant.variant_id}
                                        onClick={() => handleVariantChange(variant)}
                                        className={`w-16 h-16 sm:w-20 sm:h-20 relative overflow-hidden border-2 rounded-md transition-colors
                                            ${isActive ? 'border-[#900036]' : 'border-gray-200 hover:border-gray-400'}`}
                                    >
                                        <Image
                                            src={thumbnailUrl}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                            alt="variant thumbnail"
                                            loading="eager"
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* SIZES */}
                    <div className="flex flex-col space-y-2">
                        <p className="text-sm font-medium text-gray-700">Sizes</p>
                        <div className="flex flex-wrap gap-2">
                            {sizes.map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm border rounded-md transition-colors ${selectedSize === size
                                        ? "bg-[#900036] text-white border-[#900036]"
                                        : "border-gray-300 hover:border-gray-500"
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* STOCK */}
                    <p className="text-sm font-medium text-gray-700">
                        {resolvedVariant
                            ? `Stocks: ${resolvedVariant.stock}`
                            : 'Select a size to see stock'
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
                            {/* Add to Cart — full width on mobile, flex-1 on sm+ */}
                            <Button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={!canProceed}
                                className=" sm:flex-1 h-11 bg-[#900036] hover:bg-[#700028] text-white rounded-full"
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

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAddFavorite(product.product_id)}
                                className="shrink-0"
                            >
                                <Heart className="w-5 h-5" />
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