'use client'

import Image from 'next/image'
import type { Product } from '@/types/product'
import { ShoppingCart, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from "@/lib/utils"
type Props = {
    product: Product

}
const sizes = ["XS", "S", "M", "L", "XL"]
const ProductDetails = ({ product }: Props) => {
    return (
        <>

            {/* Product Image */}
            <div className="relative w-full md:w-1/2 aspect-square">
                <Image
                    src={product.default_variant.image_url}
                    alt={product.name}
                    fill
                    className="object-cover rounded-xl"
                    priority
                />
            </div>

            {/* Product Details */}
            <div className="flex flex-col gap-4 md:w-1/2">

                {product.wholesale && (
                    <div className="bg-[#900036] text-white text-xs text-center p-3 w-[140px] rounded-full">
                        Wholesale available
                    </div>
                )}

                <h1 className="text-3xl font-bold">
                    {product.name}
                </h1>


                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                    {product.description}
                </p>

                {/* Price Section */}
                <div className="flex items-center gap-3">
                    <p className="text-4xl font-bold text-[#900036]">
                        ${product.default_variant?.final_price}
                    </p>

                    {product.default_variant?.price && product.default_variant.price > product.default_variant.final_price && (
                        <div className='flex gap-3 text-[#900036] items-center'>
                            <p className="text-lg line-through ">
                                ${product.default_variant.price}
                            </p>
                            <p className="text-sm bg-[#900036] text-white p-2 rounded-md">
                                -{product.discount}%
                            </p>
                        </div>
                    )}
                </div>


                {/* VARIANTS (IMAGE BASED UI ONLY) */}
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-gray-700">Variants</p>

                    <div className="flex gap-3 flex-wrap">
                        <button type='button' className={cn("relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all")}>
                            <Image src={product.default_variant.image_url} alt={product.name} fill className='object-cover'/>
                        </button>
                    </div>
                </div>

                {/* Sizes */}
                <>
                    <p>Size</p>
                    <div className='flex flex-wrap gap-2'>
                        {sizes.map((size) => (
                            <Button
                                key={size}
                                type='button'
                                className="h-9 px-4 border  text-black bg-transparent transition-all rounded-md shadow-sm hover:border-[#900036] hover:bg-transparent"
                            >
                                {size}
                            </Button>
                        ))}
                    </div>
                </>

                {/* CART LOGIC */}
                <div className="flex flex-col items-center sm:flex-row gap-3 pt-2">
                    <Button className="flex-1 h-11 bg-[#900036] hover:bg-[#76002d] text-white rounded-full">
                        <ShoppingCart />
                        Add to cart
                    </Button>

                    <Button
                        variant="outline"
                        className="flex-1 h-11 border-[#900036] text-[#900036] hover:bg-[#900036] hover:text-white rounded-full"
                    >
                        Buy now
                    </Button>
                    {/* Add favorite heart icon only */}
                    <Button variant="ghost" size="icon">
                        <Heart />
                    </Button>
                </div>

            </div>
        </>
    )
}

export default ProductDetails