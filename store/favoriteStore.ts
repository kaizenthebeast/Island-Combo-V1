import { create } from 'zustand';
import { getFavorite, addFavorite, removeFavorite } from '@/lib/favorite';
import { FavoriteView } from '@/types/favorite';

type FavoriteState = {
    favorites: FavoriteView[];
    totalFavQty: number;
    error: string | null;

    fetchFavorite: () => Promise<void>;
    addFavorite: (productId: number) => Promise<void>;
    removeFavorite: (productId: number) => Promise<void>;
    isFavorite: (productId: number) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
    favorites: [],
    totalFavQty: 0,
    error: null,

    fetchFavorite: async () => {
        try {
            const res = await getFavorite();
            if (!res) {
                console.error('Error fetching the favorite');
                return;
            }
            set({ favorites: res, totalFavQty: res.length, error: null });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch favorites';
            set({ error: message });
        }
    },

    addFavorite: async (productId) => {
        const prevQty = get().totalFavQty;
        try {
            await addFavorite(productId);
            set({ totalFavQty: prevQty + 1, error: null });
            // Re-fetch to get the full FavoriteView with variants
            await get().fetchFavorite();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add favorite';
            set({ totalFavQty: prevQty, error: message });
        }
    },

    removeFavorite: async (productId) => {
        const prevFavorites = get().favorites;
        const prevQty = get().totalFavQty;
        // Optimistic update
        set(state => ({
            favorites: state.favorites.filter(f => f.product_id !== productId),
            totalFavQty: prevQty - 1,
            error: null,
        }))
        try {
            await removeFavorite(productId);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove favorite';
            // Rollback
            set({ favorites: prevFavorites, totalFavQty: prevQty, error: message });
        }
    },

    isFavorite: (productId) => {
        return get().favorites.some(f => f.product_id === productId);
    },
}));