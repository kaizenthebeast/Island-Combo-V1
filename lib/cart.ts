import { createClient } from '@/lib/supabase/server';

export type CartItems = {
  userId: string;
  productId: string;
  quantity?: number;
};

// Get cart items
export async function getCart(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cart')
    .select('*, products(*)')
    .eq('user_id', userId);

  if (error) throw error;

  return data;
}

// Add to cart (RPC)
export async function addToCart(items: CartItems) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    'add_to_cart_increment',
    {
      p_user_id: items.userId,
      p_product_id: items.productId,
      p_quantity: items.quantity ?? 1, // fallback
    }
  );

  if (error) throw error;

  return data;
}

// Update quantity
export async function updateCartQuantity(items: CartItems) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cart')
    .update({ quantity: items.quantity ?? 1 })
    .eq('user_id', items.userId)
    .eq('product_id', items.productId);

  if (error) throw error;

  return data;
}

// Remove item
export async function removeFromCart(items: CartItems) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', items.userId)
    .eq('product_id', items.productId);

  if (error) throw error;
}
