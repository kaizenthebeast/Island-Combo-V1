'use server'
import { createClient } from './supabase/server';
import type { FavoriteView } from '@/types/favorite';

export const getFavorite = async () => {
    const supabase = await createClient()

    const { data: userData, error: errorData } = await supabase.auth.getUser();
    if (errorData || !userData) {
        throw new Error(`Error User not found: ${errorData?.message ?? "Unathorized"} `)
    }
    const userId = userData.user.id;
    const { data, error } = await supabase
        .from('favorites_view')
        .select('*')
        .eq('user_id', userId)
        .order('favorited_at', { ascending: false });
    if (error) {
        throw new Error(`Error fetching favorites: ${error.message}`);
    }

    return data as FavoriteView[];
}


export const addFavorite = async (productId: number) => {
    const supabase = await createClient()

    const { data: userData, error: errorData } = await supabase.auth.getUser();
    if (errorData || !userData) {
        throw new Error(`Error User not found: ${errorData?.message ?? "Unathorized"} `)
    }
    const userId = userData.user.id
    const { error } = await supabase.from('favorites')
        .insert({ 'userId': userId, 'product_id': productId })
        .select()
        .eq('user_id', userId).single()

    if (error) {
        // Handles duplicate favorite gracefully (unique constraint)
        if (error.code === '23505') {
            throw new Error('Product is already in favorites');
        }
        throw new Error(`Error adding favorite: ${error.message}`);
    }

}