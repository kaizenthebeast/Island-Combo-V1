'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { ProductCatalogItem } from '@/types/product'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'

type Props = {
  product: ProductCatalogItem
}

const ProductCard: React.FC<Props> = ({ product }) => {
  const hasDiscount = product.discount !== null && product.discount > 0

  return (
    <Link href={`/product/${product.slug}`} className="w-full">
      <Card className="w-full border-none shadow-none relative overflow-hidden flex flex-col cursor-pointer group">

        {product.has_wholesale && (
          <div className="absolute top-0 right-0 bg-[#900036] text-white text-xs px-3 py-1 rounded-tr-md rounded-bl-md z-10 flex items-center gap-1">
            <Package className="w-3 h-3" />
            Wholesale
          </div>
        )}

        {/* Image */}
        <div className="relative w-full aspect-square overflow-hidden rounded-md bg-gray-50">
          <Image
            src={getPublicImageUrl(product.image_url) ?? 'images/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105 bg-gray-100 rounded-md overflow-hidden"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            priority
          />
        </div>

        {/* Content */}
        <CardContent className="px-0 pt-2 pb-0 space-y-1 flex-1">
          <h3 className="text-xs sm:text-sm font-medium leading-snug line-clamp-2">
            {product.name}
          </h3>

          <p className="text-sm sm:text-base font-semibold">
            ${product.final_price.toFixed(2)}
          </p>

          {/* Sale discount — product-level percentage off */}
          {hasDiscount && (
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs text-gray-400 line-through">
                ${product.base_price.toFixed(2)}
              </span>
              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded">
                -{product.discount}%
              </span>
            </div>
          )}

          {/* Wholesale nudge — shows threshold and discount when has_wholesale is true */}
          {product.has_wholesale && product.wholesale_min_qty && product.wholesale_discount_percent && (
            <p className="text-xs text-[#900036] font-medium">
              Buy {product.wholesale_min_qty}+ for {product.wholesale_discount_percent}% off
            </p>
          )}
        </CardContent>

      </Card>
    </Link>
  )
}

export default ProductCard