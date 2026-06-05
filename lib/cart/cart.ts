import { createClient } from '@/lib/supabase/server'
import { getPublicImageUrl } from '@/lib/utils/image-url'
import { AppError, HTTP } from '@/lib/api/respond'
import type { PostgrestError } from '@supabase/supabase-js'
import type { CartItem, CartItemInput } from '@/lib/types/cart'


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
}