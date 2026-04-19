export type CartItem = {
  id: number
  user_id: string
  variant_id: number
  quantity: number
  size: string

  // product fields (from view)
  product_id: number
  name: string
  slug: string
  wholesale: boolean
  discount: number | null
  image_url: string | null

  // variant fields (from view)
  price: number
  final_price: number
  stock: number
  sku: string | null
  variant_image_url: string[] | null
}

export type CartItemInput = {
  userId: string
  variantId: number
  quantity: number
  size: string
}
