'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import type { Product, Variant } from '@/types/product'
import { ShoppingCart, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from "@/lib/utils"

type Props = {
    product: Product
}

const ProductDetails = ({ product }: Props) => {
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
    const [selectedSize, setSelectedSize] = useState<string | null>(null)
    const [selectedVariant, setSelectedVariant] = useState<Variant>(product.variants[0])

    /**
     * Extract styles
     */
    const styles = useMemo(() => {
        return Array.from(
            new Set(
                product.variants.flatMap(v =>
                    v.variant_attributes
                        .filter(a => a.attribute_name.toLowerCase() === 'style')
                        .map(a => a.attribute_value)
                )
            )
        )
    }, [product.variants])

    /**
     * Extract sizes based on selected style
     */
    const sizes = useMemo(() => {
        return Array.from(
            new Set(
                product.variants
                    .filter(v =>
                        selectedStyle
                            ? v.variant_attributes.some(
                                a =>
                                    a.attribute_name.toLowerCase() === 'style' &&
                                    a.attribute_value === selectedStyle
                            )
                            : true
                    )
                    .flatMap(v =>
                        v.variant_attributes
                            .filter(a => a.attribute_name.toLowerCase() === 'size')
                            .map(a => a.attribute_value)
                    )
            )
        )
    }, [product.variants, selectedStyle])

  
    /**
     * Handlers
     */
    const handleStyleSelect = (style: string) => {
        setSelectedStyle(style)
        setSelectedSize(null)

        const firstMatch = product.variants.find(v =>
            v.variant_attributes.some(
                a => a.attribute_name.toLowerCase() === 'style' &&
                    a.attribute_value === style
            )
        )

        if (firstMatch) {
            setSelectedVariant(firstMatch)
        }
    }

    const handleSizeSelect = (size: string) => {
        setSelectedSize(size)

        const match = product.variants.find(v => {
            const hasStyle = selectedStyle
                ? v.variant_attributes.some(
                    a =>
                        a.attribute_name.toLowerCase() === 'style' &&
                        a.attribute_value === selectedStyle
                )
                : true

            const hasSize = v.variant_attributes.some(
                a =>
                    a.attribute_name.toLowerCase() === 'size' &&
                    a.attribute_value === size
            )

            return hasStyle && hasSize
        })

        if (match) {
            setSelectedVariant(match)
        }
    }


    return (
        <>
            {/* IMAGE */}
            <div className="relative w-full md:w-1/2 aspect-square">
                <Image
                    src={selectedVariant.image_url}
                    alt={product.name}
                    fill
                    className="object-cover rounded-xl"
                    priority
                />
            </div>

            {/* DETAILS */}
            <div className="flex flex-col gap-4 md:w-1/2">

                {product.wholesale && (
                    <div className="bg-[#900036] text-white text-xs text-center p-3 w-[140px] rounded-full">
                        Wholesale available
                    </div>
                )}

                <h1 className="text-3xl font-bold">{product.name}</h1>

                <p className="text-gray-600 leading-relaxed">
                    {product.description}
                </p>

                {/* PRICE */}
                <div className="flex items-center gap-3">
                    <p className="text-4xl font-bold text-[#900036]">
                        ${selectedVariant.final_price}
                    </p>

                    {product.discount > 0 && (
                        <div className='flex gap-3 text-[#900036] items-center'>
                            <p className="text-lg line-through">
                                ${selectedVariant.price}
                            </p>
                            <p className="text-sm bg-[#900036] text-white p-2 rounded-md">
                                -{product.discount}%
                            </p>
                        </div>
                    )}
                </div>

                {/* STYLE (VARIANTS IMAGE) */}
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-gray-700">Variant</p>

                    <div className="flex gap-3 flex-wrap">
                        {styles.map((style) => {
                            const variantForStyle = product.variants.find(v =>
                                v.variant_attributes.some(
                                    a =>
                                        a.attribute_name.toLowerCase() === 'style' &&
                                        a.attribute_value === style
                                )
                            )

                            const isActive = selectedStyle === style

                            if (!variantForStyle) return null

                            return (
                                <button
                                    key={style}
                                    onClick={() => handleStyleSelect(style)}
                                    className={cn(
                                        "relative w-16 h-16 rounded-lg overflow-hidden border-2",
                                        isActive
                                            ? "border-[#900036] scale-105"
                                            : "border-gray-200"
                                    )}
                                >
                                    <Image
                                        src={variantForStyle.image_url}
                                        alt={style}
                                        fill
                                        className="object-cover"
                                    />
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* SIZES */}
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-gray-700">Size</p>

                    <div className="flex flex-wrap gap-2">
                        {sizes.map((size) => {
                            const isActive = selectedSize === size

                            return (
                                <button
                                    key={size}
                                    onClick={() => handleSizeSelect(size)}
                                    className={cn(
                                        "px-4 py-2 border rounded-md",
                                        isActive
                                            ? "bg-[#900036] text-white"
                                            : "border-gray-300"
                                    )}
                                >
                                    {size}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* STOCK */}
                <p>Stocks: {selectedVariant.stock}</p>

                {/* ACTIONS */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button className="flex-1 h-11 bg-[#900036] text-white rounded-full">
                        <ShoppingCart />
                        Add to cart
                    </Button>

                    <Button
                        variant="outline"
                        className="flex-1 h-11 border-[#900036] text-[#900036] rounded-full"
                    >
                        Buy now
                    </Button>

                    <Button variant="ghost" size="icon">
                        <Heart />
                    </Button>
                </div>

            </div>
        </>
    )
}

export default ProductDetails
