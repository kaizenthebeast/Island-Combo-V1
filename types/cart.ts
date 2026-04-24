// types/cart.ts
export type CartItem = {
  id: number
  user_id: string
  variant_id: number
  quantity: number
  size: string
  created_at: string

  // product fields (from view)
  product_id: number
  name: string
  slug: string
  description: string | null
  wholesale: boolean
  discount: number | null

  // variant fields (from view)
  sku: string | null
  price: number
  final_price: number
  stock: number
  is_active: boolean

  // image (from view)
  image_url: string | null        // raw path, mapped to public URL in mapCartItem
}

export type CartItemInput = {
  userId: string
  variantId: number
  quantity: number
  size: string
}