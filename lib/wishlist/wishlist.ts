'use server'
/** Customer wishlist data access. */
import { createClient } from '@/lib/supabase/server'
import type { WishlistView } from '@/shared/types/wishlist'

export const getWishlist = async (userId: string): Promise<WishlistView[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wishlist_view')
    .select('*')
    .eq('user_id', userId)
    .order('wishlisted_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as WishlistView[]
}

export const addToWishlist = async (userId: string, productId: number) => {
  const supabase = await createClient()
  const { error } = await supabase
    .from('wishlist')
    .insert({ user_id: userId, product_id: productId })
    .select()
    .eq('user_id', userId)
    .single()
  if (error) {
    if (error.code === '23505')
      return { success: false, status: 409, message: 'Product is already in your wishlist' }
    return { success: false, status: 403, message: error.message }
  }
  return { success: true, status: 201, message: 'Product added to wishlist' }
}

export const removeFromWishlist = async (userId: string, productId: number) => {
  const supabase = await createClient()
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('product_id', productId)
    .eq('user_id', userId)
  if (error) return { success: false, status: 403, message: error.message }
  return { success: true, status: 200, message: 'Product removed from wishlist' }
}
