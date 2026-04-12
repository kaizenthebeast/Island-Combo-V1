'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { Product } from '@/types/product'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  product: Product
}
const ProductCard: React.FC<Props> = ({ product }) => {
  return (
    <Link href={`/product/${product.slug}`}>

      <Card className="w-[224px] h-[336px] border-none shadow-none relative overflow-hidden flex flex-col cursor-pointer">

        {/* Badge */}
        {product.wholesale === true && (
          <div className="absolute top-0 right-0 bg-[#900036] text-white text-xs px-3 py-1 rounded-tr-md rounded-bl-md z-10">
            Wholesale available
          </div>
        )}

        {/* Image */}
        <div className="relative w-full h-[70%] flex items-center justify-center">
          <Image
            src={product.default_variant.image_url}
            alt={product.name}
            fill
            className="object-fill"
            priority
            sizes='235'
          />
        </div>

        <CardContent className="px-0 pt-2 pb-0 space-y-1 flex-1">

          <h3 className="text-sm font-medium leading-snug line-clamp-2">
            {product.name}
          </h3>

          <p className="text-lg font-semibold">
            ${product.default_variant?.final_price}
          </p>

          {product.default_variant?.price && product.discount ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 line-through">
                ${product.default_variant.price.toFixed(2)}
              </span>

              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded">
                -{product.discount}%
              </span>
            </div>
          ) : null}

        </CardContent>

      </Card>

    </Link>
  )

}

export default ProductCard
