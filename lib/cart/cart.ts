import { createClient } from '@/lib/supabase/server'
import { getPublicImageUrl } from '@/lib/utils/image-url'
import { AppError, HTTP } from '@/lib/api/respond'
import type { PostgrestError } from '@supabase/supabase-js'
import type { CartItem, CartItemInput, CartResponse } from '@/types/cart'
import { computeCartTotals, round2, unitPriceOf } from './totals'
import { promoUnusableReason, type PromoRow } from './promo-rules'


function mapCartItem(item: CartItem): CartItem {
  return {
    ...item,
    image_url: getPublicImageUrl(item.image_url),
  }
}


// Map the SQLSTATE codes cart_upsert_item raises to a clean message + status.
// The DB messages ("Only N left in stock", …) are already user-facing, so we
// keep them; only the HTTP status is decided here.
const CART_ERROR_STATUS: Record<string, number> = {
  '23514': HTTP.CONFLICT,      // requested quantity exceeds stock
  'P0002': HTTP.NOT_FOUND,     // variant gone / inactive
  '28000': HTTP.UNAUTHORIZED,  // not authenticated
  '22023': HTTP.BAD_REQUEST,   // invalid arguments
}

function throwCartError(error: PostgrestError): never {
  const status = CART_ERROR_STATUS[error.code]
  if (status) throw new AppError(error.message, status)
  throw error
}


export const getCart = async (userId: string): Promise<CartItem[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cart_view')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(mapCartItem)
}


export const addToCart = async (item: CartItemInput) => {
  const supabase = await createClient()

  // Insert-or-increment is handled atomically server-side by cart_upsert_item.
  // It locks the variant row before reading stock, so a concurrent checkout can
  // never let us over-reserve, and it rejects quantities that exceed stock.
  // user_id is taken from auth.uid() inside the function, not from the client.
  const { data, error } = await supabase
    .rpc('cart_upsert_item', {
      p_variant_id: item.variantId,
      p_quantity: item.quantity,
      p_selected_option: item.selectedOption ?? null,
      p_mode: 'add',
    })
    .single()

  if (error) throwCartError(error)
  return data
}


export const updateCartQuantity = async ({
  variantId,
  quantity,
}: {
  userId: string
  variantId: number
  quantity: number
}) => {
  const supabase = await createClient()

  // Same stock-safe path as addToCart, but 'set' replaces the line quantity
  // instead of incrementing it.
  const { data, error } = await supabase
    .rpc('cart_upsert_item', {
      p_variant_id: variantId,
      p_quantity: quantity,
      p_mode: 'set',
    })
    .single()

  if (error) throwCartError(error)
  return data
}


export const removeFromCart = async ({
  userId,
  variantId,
}: {
  userId: string
  variantId: number
}) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', userId)
    .eq('variant_id', variantId)

  if (error) throw error
}


export const removeAllItemFromCart = async ({
   userId,
}: { userId: string }) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', userId)

  if (error) throw error

  // Emptying the cart drops its header too (applied promo + points reservation).
  await clearCartMeta(userId)
}


// Removes the cart header (applied promo code + points reservation). Holds do
// not touch the points balance, so this is a plain delete.
export const clearCartMeta = async (userId: string) => {
  const supabase = await createClient()
  const { error } = await supabase.from('cart_meta').delete().eq('user_id', userId)
  if (error) throw new AppError(error.message, HTTP.INTERNAL)
}


// Cart facts derived once and reused by Fetch Cart + the discount/points logic:
// the line items, the total quantity (promo min-quantity) and the server-side
// subtotal.
export type CartFacts = {
  items: CartItem[]
  totalQty: number
  subtotal: number
}

export const loadCartFacts = async (userId: string): Promise<CartFacts> => {
  const items = await getCart(userId)
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = round2(items.reduce((sum, i) => sum + unitPriceOf(i) * i.quantity, 0))
  return { items, totalQty, subtotal }
}


// Fetch Cart (§3.3): line items + server-side calculated totals reflecting the
// applied promo code and the loyalty-point redemption stored on the cart header.
// A stored promo that is no longer usable (expired, archived, …) is simply
// ignored in the totals rather than erroring.
export const getCartWithTotals = async (userId: string): Promise<CartResponse> => {
  const facts = await loadCartFacts(userId)
  const supabase = await createClient()

  const { data: meta } = await supabase
    .from('cart_meta')
    .select('promo_code, points_redeemed')
    .eq('user_id', userId)
    .maybeSingle()

  let promo: { code: string; value: number } | null = null
  if (meta?.promo_code) {
    const { data: row } = await supabase
      .from('promo')
      .select('code, value, status, expires_at, min_quantity, max_uses, used_count')
      .eq('code', meta.promo_code)
      .maybeSingle<PromoRow>()
    if (row && !promoUnusableReason(row, { totalQty: facts.totalQty })) {
      promo = { code: row.code, value: Number(row.value) }
    }
  }

  const totals = computeCartTotals({
    items: facts.items,
    promo,
    pointsRedeemed: meta?.points_redeemed ?? 0,
  })

  return { items: facts.items, totals }
}