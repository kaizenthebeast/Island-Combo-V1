import React from 'react'
import Image from 'next/image'
import { ProductProps } from '@/lib/product';

type Props = {
    product: ProductProps

}


const ProductDetails = ({ product }: Props) => {
    return (
        <div className='flex flex-col md:flex-row gap-10 w-full'>

            {/* Product Image */}
            <div className="relative w-full md:w-1/2 aspect-square">
                <Image
                    src={product.imageUrl || '/images/placeholder.png'}
                    alt={product.name}
                    fill
                    className="object-cover rounded-xl"
                    priority
                />
            </div>

            {/* Product Details */}
            <div className="flex flex-col gap-4 md:w-1/2">


                <p className='bg-[#900036] text-white text-xs text-center p-3 w-[140px] rounded-full'>
                    Wholesale available
                </p>



                <h1 className="text-3xl font-bold">
                    {product.name}
                </h1>

                {/* Price Section */}
                <div className="flex items-center gap-3">
                    <p className="text-4xl font-bold text-[#900036]">
                        ${product.price}
                    </p>

                    {product.oldPrice && product.oldPrice > product.price && (
                        <div className='flex gap-3 text-[#900036] items-center'>
                            <p className="text-sm  line-through ">
                                ${product.oldPrice}
                            </p>
                            <p className="text-sm bg-gray-300 p-2 rounded-md">
                                -{product.discount}%
                            </p>
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                    {product.description}
                </p>

            </div>
        </div>
    )
}

export default ProductDetails