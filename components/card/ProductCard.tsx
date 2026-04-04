'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/store/cartStore'

type Product = {
  id: string
  name: string
  price: number
}

type Props = {
  product: Product
}

const MIN_QTY = 1
const MAX_QTY = 10

const clampQuantity = (value: number) =>
  Math.min(Math.max(value, MIN_QTY), MAX_QTY)

const ProductCard: React.FC<Props> = ({ product }) => {
  const cart = useCartStore((state) => state.cart)
  const addItem = useCartStore((state) => state.addItem)
  const updateItem = useCartStore((state) => state.updateItem)
  const removeItem = useCartStore((state) => state.removeItem)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quantityInput, setQuantityInput] = useState('1')

  const cartItem = useMemo(
    () => cart.find((item) => item.product_id === product.id),
    [cart, product.id]
  )

  const formattedPrice = useMemo(
    () =>
      new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(product.price),
    [product.price]
  )

  useEffect(() => {
    if (cartItem) {
      setQuantityInput(String(cartItem.quantity))
    } else {
      setQuantityInput('1')
    }
  }, [cartItem])

  const handleAdd = async () => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      await addItem(product.id, 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIncrement = async () => {
    if (!cartItem || isSubmitting || cartItem.quantity >= MAX_QTY) return

    try {
      setIsSubmitting(true)
      await updateItem(product.id, cartItem.quantity + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecrement = async () => {
    if (!cartItem || isSubmitting) return

    try {
      setIsSubmitting(true)

      if (cartItem.quantity === 1) {
        await removeItem(product.id)
        return
      }

      await updateItem(product.id, cartItem.quantity - 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuantityInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, '')

    if (value === '') {
      setQuantityInput('')
      return
    }

    const numericValue = clampQuantity(Number(value))
    setQuantityInput(String(numericValue))
  }

  const commitQuantityInput = async () => {
    if (!cartItem || isSubmitting) return

    const parsed = Number(quantityInput)

    if (!quantityInput || Number.isNaN(parsed)) {
      setQuantityInput(String(cartItem.quantity))
      return
    }

    const nextQuantity = clampQuantity(parsed)

    if (nextQuantity === cartItem.quantity) {
      setQuantityInput(String(cartItem.quantity))
      return
    }

    try {
      setIsSubmitting(true)
      await updateItem(product.id, nextQuantity)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl border shadow-sm transition hover:shadow-md">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="line-clamp-2 text-lg font-semibold tracking-tight">
            {product.name}
          </h2>
          <p className="text-base font-medium text-muted-foreground">
            {formattedPrice}
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0">
        {!cartItem ? (
          <Button
            className="w-full rounded-xl"
            onClick={handleAdd}
            disabled={isSubmitting}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Adding...' : 'Add to Cart'}
          </Button>
        ) : (
          <div className="flex w-full items-center justify-between rounded-xl border px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDecrement}
              disabled={isSubmitting}
              aria-label={
                cartItem.quantity === 1
                  ? `Remove ${product.name} from cart`
                  : `Decrease quantity of ${product.name}`
              }
            >
              {cartItem.quantity === 1 ? (
                <Trash2 className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>

            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantityInput}
              onChange={handleQuantityInputChange}
              onBlur={commitQuantityInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void commitQuantityInput()
                  e.currentTarget.blur()
                }
              }}
              disabled={isSubmitting}
              aria-label={`Quantity for ${product.name}`}
              className="mx-2 h-9 w-16 text-center"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleIncrement}
              disabled={isSubmitting || cartItem.quantity >= MAX_QTY}
              aria-label={`Increase quantity of ${product.name}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

export default ProductCard