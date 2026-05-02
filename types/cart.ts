export type CartAttribute = {
  name: string
  value: string
}

export type CartItem = {
  id: number
  user_id: string
  variant_id: number
  quantity: number
  selected_option: string | null
  created_at: string

  // product fields 
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

  // variant attributes 
  attributes: CartAttribute[]
}

export type CartItemInput = {
  userId: string
  variantId: number
  quantity: number
  selectedOption?: string | null
}