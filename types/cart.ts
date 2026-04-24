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

  sku: string | null
  price: number
  final_price: number
  stock: number
  is_active: boolean


  image_url: string | null        
}

export type CartItemInput = {
  userId: string
  variantId: number
  quantity: number
  size: string
}