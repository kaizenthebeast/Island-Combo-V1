'use client'

import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'
import { FavoriteView } from '@/types/favorite'
import {getPublicImageUrl} from '@/helper/getPublicImageUrl'
import { Button } from '../ui/button'

type Props = {
  product: FavoriteView
}
const FavoriteCard: React.FC<Props> = ({ product }) => {
  const hasDiscount = product.discount !== null && product.discount > 0

  return (
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
            src={getPublicImageUrl(product.primary_image) ?? 'images/placeholder.png'}
            alt={product.product_name}
            fill
            className="object-fill"
            priority
            sizes='235'
          />
        </div>

        <CardContent className="px-0 pt-2 pb-0 space-y-1 flex-1">

          <h3 className="text-sm font-medium leading-snug line-clamp-2">
            {product.product_name}
          </h3>

          <p className="text-lg font-semibold">
            $22
          </p>

          {hasDiscount && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 line-through">
                $23



              </span>

              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded">
                -{product.discount}%
              </span>
            </div>
          )}

        </CardContent>
        <CardFooter className='mt-5 p-0'>
            <Button type='button' variant='outline' size='lg' className='w-full rounded-full border-[#900036] text-[#900036] font-bold'>Add To Cart</Button>
        </CardFooter>

      </Card>
  )

}

export default FavoriteCard
