'use client'

import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

type Product = {
  id: string
  name: string
  price: number
  imageUrl?: string
}

type Props = {
  product: Product
}

const ProductCard: React.FC<Props> = ({ product }) => {
  const { cart, addItem, updateItem, removeItem } = useCartStore();
  const cartItem = cart.find((item) => item.product_id === product.id);
  const currentQty = cartItem?.quantity ?? 0;

  return (
    <Card className="w-full max-w-sm rounded-2xl border shadow-sm transition hover:shadow-md overflow-hidden">
      {/* Product Image */}
      {product.imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <CardContent className="space-y-4 p-5">
        {/* Product Info */}
        <div className="space-y-1">
          <h2 className="line-clamp-2 text-lg font-semibold tracking-tight">{product.name}</h2>
          <p className="text-base font-medium text-muted-foreground">${product.price}</p>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0">
        {/* Simple Quantity Controls */}
        <div className="flex w-full items-center justify-center rounded-xl border px-3 py-2 space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (currentQty > 1) updateItem(product.id, currentQty - 1)
              else removeItem(product.id)
            }
            }
            disabled={currentQty === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>



          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (currentQty > 1) updateItem(product.id, currentQty + 1)
              else addItem(product.id)
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default ProductCard
