import { createClient } from '@/lib/supabase/server'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import type { CartItem, CartItemInput } from '@/types/cart'


function mapCartItem(item: CartItem): CartItem {
  return {
    ...item,
    image_url: getPublicImageUrl(item.image_url),
  }
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

  // variant_id alone uniquely identifies the SKU — selected_option is display-only
  const { data: existing, error: fetchError } = await supabase
    .from('cart')
    .select('id, quantity')
    .eq('user_id', item.userId)
    .eq('variant_id', item.variantId)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) {
    // Item already in cart — just bump the quantity
    const { data, error } = await supabase
      .from('cart')
      .update({ quantity: existing.quantity + item.quantity })
      .eq('id', existing.id)

    if (error) throw error
    return data
  }

  // New cart row — selected_option is nullable, null for no-attribute products
  const { data, error } = await supabase
    .from('cart')
    .insert({
      user_id: item.userId,
      variant_id: item.variantId,
      quantity: item.quantity,
      selected_option: item.selectedOption ?? null,
    })

  if (error) throw error
  return data
}


export const updateCartQuantity = async ({
  userId,
  variantId,
  quantity,
}: {
  userId: string
  variantId: number
  quantity: number
}) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cart')
    .update({ quantity })
    .eq('user_id', userId)
    .eq('variant_id', variantId)

  if (error) throw error
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