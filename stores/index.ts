/** Compatibility aggregator — store hooks now live in their feature modules
 *  (features/<domain>/stores). Prefer importing from the feature barrel; this
 *  keeps existing `@/stores` imports working. */
export * from '@/features/cart/stores/cart-store'
export * from '@/features/wishlist/stores/wishlist-store'
export * from '@/features/checkout/stores/checkout-store'
