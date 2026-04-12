import type { Product, Variant } from './product'

export type CartItem = {
  id: string
  user_id: string
  variant_id: string
  quantity: number
  added_at?: string
  product: Product
  variant: Variant
}

export type CartItemInput = {
  userId: string
  variantId: string
  quantity?: number
}
