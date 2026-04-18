import { createClient } from '@/lib/supabase/server';
import type { CartItem, CartItemInput } from '@/types/cart'

export async function getCart(userId: string): Promise<CartItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cart_view")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;

  return data as CartItem[];
}


export async function addToCart(item: CartItemInput) {
  const supabase = await createClient()

  // 1. check existing item (variant + size)
  const { data: existing, error: fetchError } = await supabase
    .from('cart')
    .select('id, quantity')
    .eq('user_id', item.userId)
    .eq('variant_id', item.variantId)
    .eq('size', item.size)
    .maybeSingle()

  if (fetchError) throw fetchError

  // 2. if exists → update quantity
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

  // 3. else → insert new item
  const { data, error } = await supabase
    .from('cart')
    .insert({
      user_id: item.userId,
      variant_id: item.variantId,
      quantity: item.quantity,
      size: item.size,
    })

  if (error) {
    console.error("INSERT ERROR:", error)
    throw error
  }

  return data
}



export async function updateCartQuantity(items: CartItemInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cart')
    .update({ quantity: items.quantity ?? 1 })
    .eq('user_id', items.userId)
    .eq('variant_id', items.variantId);

  if (error) {
    console.error("UPDATE ERROR:", error)
    throw error
  }
  return data;
}


export async function removeFromCart(items: CartItemInput) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', items.userId)
    .eq('variant_id', items.variantId);

  if (error) {
    console.error("INSERT ERROR:", error)
    throw error
  }
}
