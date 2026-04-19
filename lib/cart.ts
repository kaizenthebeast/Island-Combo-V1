import { createClient } from '@/lib/supabase/server'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import type { CartItem, CartItemInput } from '@/types/cart'


function mapCartItem(item: CartItem): CartItem {
  return {
    ...item,
    image_url: getPublicImageUrl(item.image_url),
  }
}


export async function getCart(userId: string): Promise<CartItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cart_view')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})

  if (error) throw new Error(error.message)

  return (data ?? []).map(mapCartItem)
}


export async function addToCart(item: CartItemInput) {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('cart')
    .select('id, quantity')
    .eq('user_id', item.userId)
    .eq('variant_id', item.variantId)
    .eq('size', item.size)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) {
    const { data, error } = await supabase
      .from('cart')
      .update({
        quantity: existing.quantity + item.quantity,
      })
      .eq('id', existing.id)

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('cart')
    .insert({
      user_id: item.userId,
      variant_id: item.variantId,
      quantity: item.quantity,
      size: item.size,
    })

  if (error) throw error
  return data
}


export async function updateCartQuantity(items: CartItemInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cart')
    .update({ quantity: items.quantity ?? 1 })
    .eq("variant_id", items.variantId)
    .eq("size", items.size)
    .eq("user_id", items.userId)

  if (error) throw error
  return data
}


export async function removeFromCart(items: CartItemInput) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cart')
    .delete()
    .eq("variant_id", items.variantId)
    .eq("size", items.size)
    .eq("user_id", items.userId)
  if (error) throw error
}
