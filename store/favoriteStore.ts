import { create } from 'zustand';
import { getFavorite, addFavorite } from '@/lib/favorite';
import { FavoriteView } from '@/types/favorite';

type FavoriteState = {
    favorites: FavoriteView[];
    totalFavQty: number;
    error: string | null;

    fetchFavorite: () => Promise<void>;
    addFavorite: (productId: number) => Promise<void>;
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
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add favorite';
            set({ totalFavQty: prevQty, error: message });
        }
    },
}));