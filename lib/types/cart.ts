/** Shared cart-item types. */
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
  // used client-side to re-resolve price when quantity changes
  pricing_tiers: CartPricingTier[]
  // applied_price  = price * (1 - matched_tier.discount_percent / 100)
  // applied_tier_label = e.g. "retail" | "wholesale" | "bulk"
  applied_price: number
  // null when no tier matches the current quantity (cart_view returns it
  // un-COALESCEd); consumers compare with === so a null is treated as "no tier".
  applied_tier_label: string | null

  // variant attributes
  attributes: CartAttribute[]
}

export type CartItemInput = {
  userId: string
  variantId: number
  quantity: number
  selectedOption?: string | null
}

// The cart "header" record (lib/cart + cart_meta table): the applied promo code
// and the loyalty-point reservation persisted for the cart.
export type CartMeta = {
  promo_code: string | null
  points_redeemed: number
}

// Server-side calculated totals returned by Fetch Cart (§3.3).
export type CartTotals = {
  subtotal: number
  promoCode: string | null
  promoValue: number | null   // discount percentage of the applied code
  promoDiscount: number       // dollar value of the promo discount
  pointsRedeemed: number      // points held against this cart
  pointsDiscount: number      // dollar value of the points redemption
  total: number               // subtotal − promoDiscount − pointsDiscount (≥ 0)
}

export type CartResponse = {
  items: CartItem[]
  totals: CartTotals
}