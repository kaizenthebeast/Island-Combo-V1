'use server'
import { createClient } from './supabase/server';
import type { FavoriteView } from '@/types/favorite';

export const getFavorite = async (): Promise<FavoriteView[]> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('favorites_view')
    .select('*')
    .eq('user_id', user.id)
    .order('favorited_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data as FavoriteView[];
};
export const addFavorite = async (productId: number) => {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, status: 401, message: 'Unauthorized' };

    const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, product_id: productId })
        .select()
        .eq('user_id', user.id)
        .single();

    if (error) {
        if (error.code === '23505') return { success: false, status: 409, message: 'Product is already in favorites' };
        return { success: false, status: 403, message: error.message };
    }

    return { success: true, status: 201, message: 'Product added to favorites' };
};

export const removeFavorite = async (productId: number) => {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, status: 401, message: 'Unauthorized' };

    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', user.id);

    if (error) return { success: false, status: 403, message: error.message };

    return { success: true, status: 200, message: 'Product removed from favorites' };
};