'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ProductDetails } from '@/types/product'
import { useCartStore } from '@/store/cartStore'

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
    const defaultVariant = product.variants?.[0];
    const [selectedVariant, setSelectedVariant] = useState(defaultVariant)
    const [selectedSize, setSelectedSize] = useState<string | null>(null)
    const hasDiscount = product.discount !== null && product.discount > 0;

    //Carousel 
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const [count, setCount] = useState(0)
    // STORE
    const { addItem, quantityInput, resetQuantity } = useCartStore();

    async function handleAddToCart() {
        if (!selectedVariant) return

        if (!selectedSize) {
            alert("Please select a size")
            return
        }

        if (quantityInput <= 0) return
        console.log(selectedVariant.variant_id, quantityInput, selectedSize);

        await addItem(selectedVariant.variant_id, quantityInput, selectedSize)
    }

    useEffect(() => {
        resetQuantity();
    }, []);

    useEffect(() => {
        if (!api) {
            return
        }
        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap() + 1)

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1)
        })
    }, [api])


    const productDetails = [
        { label: "Material", value: "Polypropylene" },
        { label: "Dimension", value: "44cm x 24cm x 65cm" },
        { label: "Wheel style", value: "Spinner wheels" },
    ];
    // Sizes
    const sizes = Array.from(
        new Set(product.variants.flatMap((v) => v.attributes?.filter((att) => att.name === 'size').map((a) => a.value)))
    )


    return (
        <div className='w-full h-full'>
            <div className="grid md:grid-cols-2  grid-cols-1 w-full gap-5" >
                {/* IMAGE CAROUSEL */}
                <div className="relative w-full">
                    <Carousel className="w-full" setApi={setApi}>
                        <CarouselContent>
                            {(selectedVariant.image_url.length > 0
                                ? selectedVariant.image_url
                                : ["/images/placeholder.png"]
                            ).map((url: string, index: number) => (
                                <CarouselItem key={index}>
                                    <div className="relative w-full min-h-[500px]">
                                        <Image
                                            src={url}
                                            alt={`${product.name} image ${index + 1}`}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover rounded-xl"
                                            priority={index === 0}
                                        />
                                        <div className='absolute bottom-0 right-0 text-black'>{current} / {count}</div>
                                    </div>
                                </CarouselItem>
                            ))}

                        </CarouselContent>
                    </Carousel>

                </div>

                {/* PRICING DETAILS */}
                <div className="flex flex-col gap-4">

                    {product.wholesale && (
                        <div className="flex items-center gap-2 bg-[#900036] text-white text-xs text-center p-2 w-[165px] rounded-md">
                            <Package />
                            Wholesale available
                        </div>
                    )}

                    <h1 className="title-header">{product.name}</h1>

                    <p className="text-gray-600 leading-relaxed">
                        {product.description}
                        {product.wholesale}
                    </p>

                    {/* PRICE */}
                    <div className="flex items-center gap-3">
                        <p className="text-4xl font-bold text-[#900036]">
                            ${selectedVariant.final_price.toFixed(2)}
                        </p>

                        {hasDiscount && (
                            <div className='flex gap-3 text-[#900036] items-center'>
                                <p className="text-lg line-through">
                                    ${selectedVariant.price.toFixed(2)}
                                </p>
                                <p className="text-sm bg-[#900036] text-white p-2 rounded-md">
                                    -{product.discount}%
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Variant Image */}
                    <div className='flex flex-col space-y-3'>
                        <p className="text-sm font-medium text-gray-700">Variants</p>
                        <div className='flex flex-wrap gap-2'>
                            {/* Loop through variants */}
                            {product.variants.map((variant) => {
                                const isActive = selectedVariant.variant_id === variant.variant_id


                                return (
                                    <button type='button' key={variant.variant_id}
                                        onClick={() => setSelectedVariant(variant)}
                                        className={`w-20 h-20 relative overflow-hidden border rounded-md
                                  ${isActive ? 'border-[#900036]' : 'border-gray-200'}`}>
                                        <Image
                                            src={variant.image_url?.[0] ?? '/images/placeholder.png'}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                            alt="variant-image"
                                            loading="eager"
                                        />
                                    </button>
                                )
                            })}
                        </div>

                    </div>


                    {/* SIZES */}
                    <div className='flex flex-col space-y-3'>
                        <p className="text-sm font-medium text-gray-700">Sizes</p>
                        <div className='flex flex-wrap gap-2'>
                            {sizes.map((size) => {
                                const isActive = selectedSize === size


                                return (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => setSelectedSize(size)}
                                        className={`px-4 py-2 border rounded-md ${isActive
                                            ? "bg-[#900036] text-white"
                                            : "border-gray-300"
                                            }`}
                                    >
                                        {size}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* STOCK */}
                    <p className="text-md font-medium text-gray-700">Stocks: {selectedVariant.stock}</p>


                    {/* QUANTITY CONTROL*/}

                    <div className="flex items-center gap-3">
                        <p className="text-md font-medium text-gray-700">Quantity</p>

                        {/* QUANTITY CONTROL */}
                        <ProductQuantityButton />

                        {/* STATUS BADGE */}
                        {product.wholesale && (
                            <div className="flex items-center gap-2 text-white bg-green-500 px-4 py-2 rounded-md w-fit ">
                                <CircleCheckBig />
                                <p className="text-sm font-medium">
                                    Wholesale pricing applied to your order!
                                </p>

                            </div>
                        )}

                    </div>


                    {/* Add To Cart */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            type='button'
                            onClick={handleAddToCart}
                            disabled={!selectedSize || quantityInput <= 0}
                            className="flex-1 h-11 bg-[#900036] text-white rounded-full">
                            <ShoppingCart />
                            Add to cart
                        </Button>
                        <Link
                            href="/checkout"
                            className={`flex-1 h-11 ${!selectedSize || quantityInput <= 0 ? 'pointer-events-none' : ''}`}
                        >
                            <button
                                type='button'
                                className="w-full h-full border border-[#900036] text-[#900036] rounded-full flex items-center justify-center hover:bg-[#900036] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:border-gray-400 disabled:text-gray-400"
                                disabled={!selectedSize || quantityInput <= 0}
                            >
                                Buy Now
                            </button>
                        </Link>

                        <Button variant="ghost" size="icon">
                            <Heart />
                        </Button>
                    </div>

                </div>
            </div>
            {/* Product Details */}
            <div className='flex flex-col md:w-1/3 w-full lg:mt-12 md:mt-8 mt-6 space-y-3'>
                <h2 className='title-header'>Product Details</h2>
                {productDetails.map((item, index) => (
                    <div key={index} className='flex flex-wrap items-center justify-between'>
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                    </div>
                ))}

            </div>

            <div className='bg-black h-1 my-5 rounded-md' />
            {/* Review Content */}
        </div>

    )
}

export default ProductDetails
