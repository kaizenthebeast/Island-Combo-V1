export type CartAttribute = {
  name: string
  value: string
}

export type CartPricingTier = {
  label: string
  min_quantity: number
  discount_percent: number  // percentage off base price e.g. 20 = 20% off
  computed_price?: number   // pre-computed by cart_view for convenience
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
  discount: number | null

  sku: string | null
  price: number        // base retail price of the variant
  final_price: number  // price after product-level sale discount
  stock: number
  is_active: boolean

  image_url: string | null

  // all tiers for this variant (retail, wholesale, bulk, etc.)
  // used client-side to re-resolve price when quantity changes
  pricing_tiers: CartPricingTier[]

  // applied_price  = price * (1 - matched_tier.discount_percent / 100)
  // applied_tier_label = e.g. "retail" | "wholesale" | "bulk"
  applied_price: number
  applied_tier_label: string

  // variant attributes
  attributes: CartAttribute[]
}

export type CartItemInput = {
  userId: string
  variantId: number
  quantity: number
  selectedOption?: string | null
}