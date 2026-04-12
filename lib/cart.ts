import { createClient } from '@/lib/supabase/server';
import type { CartItem, CartItemInput } from '@/types/cart'

export type { CartItem, CartItemInput } from '@/types/cart'

export async function getCart(userId: string): Promise<CartItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cart')
    .select(`
      id,
      quantity,
      added_at,
      variant:product_variants (
        id,
        sku,
        price,
        stock,
        image_url,
        product:products (
          id,
          name,
          slug,
          discount,
          is_active
        )
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  return data as unknown as CartItem[];
}


export async function addToCart(items: CartItemInput) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    'add_to_cart_increment',
    {
      p_user_id: items.userId,
      p_variant_id: items.variantId,
      p_quantity: items.quantity ?? 1,
    }
  );

  if (error) throw error;

  return data;
}


export async function updateCartQuantity(items: CartItemInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cart')
    .update({ quantity: items.quantity ?? 1 })
    .eq('user_id', items.userId)
    .eq('variant_id', items.variantId);

  if (error) throw error;

  return data;
}


export async function removeFromCart(items: CartItemInput) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', items.userId)
    .eq('variant_id', items.variantId);

  if (error) throw error;
}
