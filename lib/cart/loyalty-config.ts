/** Loyalty-point redemption rules (mirrors supabase migration 0014 comments). */

// Conversion rate: 100 points = $1.00 (matches the "300 Loyalty Points ($3)" UI).
export const POINTS_PER_DOLLAR = 100

// Minimum number of points a user may redeem in one go.
export const MIN_REDEEM_POINTS = 100

/** Cash value (in dollars) of a points amount. */
export const pointsToCash = (points: number) =>
  Math.round((points / POINTS_PER_DOLLAR) * 100) / 100

/** Most points redeemable against a given cart subtotal (max = subtotal). */
export const maxRedeemablePoints = (subtotal: number) =>
  Math.floor(subtotal * POINTS_PER_DOLLAR)
