import { createClient } from './supabase/server'
import type { FavoriteView } from '@/types/favorite'

// ─── READ ─────────────────────────────────────────────────────────────────────
// userId is passed in from the route layer (resolved via requireUser())
// so this function never touches auth itself.

export const getFavorite = async (userId: string): Promise<FavoriteView[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('favorites_view')
    .select('*')
    .eq('user_id', userId)
    .order('favorited_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data as FavoriteView[]
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const addFavorite = async (userId: string, productId: number) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, product_id: productId })
    .select()
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === '23505')
      return { success: false, status: 409, message: 'Product is already in favorites' }
    return { success: false, status: 403, message: error.message }
  }

  return { success: true, status: 201, message: 'Product added to favorites' }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const removeFavorite = async (userId: string, productId: number) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('product_id', productId)
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 200, message: 'Product removed from favorites' }
}