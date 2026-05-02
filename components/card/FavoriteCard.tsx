'use client'

import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { FavoriteView } from '@/types/favorite'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import { Button } from '../ui/button'

type Props = {
  product: FavoriteView
}

const FavoriteCard: React.FC<Props> = ({ product }) => {
  const hasDiscount = product.discount !== null && product.discount > 0

  return (
    <Card className="w-full border-none shadow-none relative overflow-hidden flex flex-col cursor-pointer group">

      {/* Badge */}
      {product.wholesale === true && (
        <div className="absolute top-0 right-0 bg-[#900036] text-white text-xs px-3 py-1 rounded-tr-md rounded-bl-md z-10">
          Wholesale
        </div>
      )}

      {/* Image */}
      <div className="relative w-full aspect-square overflow-hidden rounded-md bg-gray-50">
        <Image
          src={getPublicImageUrl(product.primary_image) ?? '/images/placeholder.png'}
          alt={product.product_name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105 bg-gray-100 rounded-md overflow-hidden"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          priority
        />
      </div>

      {/* Content */}
      <CardContent className="px-0 pt-2 pb-0 space-y-1 flex-1">
        <h3 className="text-xs sm:text-sm font-medium leading-snug line-clamp-2">
          {product.product_name}
        </h3>

        <p className="text-sm sm:text-base font-semibold">
          $22.00
        </p>

        {hasDiscount && (
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-xs text-gray-400 line-through">
              $23.00
            </span>
            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded">
              -{product.discount}%
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-0 pt-2 pb-0">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full border-[#900036] text-[#900036] text-xs sm:text-sm font-bold hover:bg-[#900036] hover:text-white transition-colors duration-200"
        >
          Add To Cart
        </Button>
      </CardFooter>

    </Card>
  )
}

export default FavoriteCard