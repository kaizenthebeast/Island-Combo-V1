import { create } from 'zustand';
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
            const res = await fetch('/api/favorite')
            const json = await res.json()

            if (!json.success) {
                set({ error: json.message });
                return;
            }

            set({ favorites: json.data, totalFavQty: json.data.length, error: null });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch favorites';
            set({ error: message });
        }
    },

    addFavorite: async (productId) => {
        const prevQty = get().totalFavQty;
        try {
            const res = await fetch('/api/favorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId }),
            })

            const json = await res.json()

            if (!json.success) {
                set({ error: json.message });
                return;
            }

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
            const res = await fetch('/api/favorite', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId }),
            })

            const json = await res.json()

            if (!json.success) {
                // Rollback on API error
                set({ favorites: prevFavorites, totalFavQty: prevQty, error: json.message });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove favorite';
            // Rollback on network error
            set({ favorites: prevFavorites, totalFavQty: prevQty, error: message });
        }
    },

    isFavorite: (productId) => {
        return get().favorites.some(f => f.product_id === productId);
    },
}));