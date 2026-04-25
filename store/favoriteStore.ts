import { create } from 'zustand';

type FavoriteState = {
    favorites: string[];
    totalFavQty: number;
    addFavorite: (productId: string) => Promise<void>;
    removeFavorite: (productId: string) => Promise<void>;
}

export const useFavoriteStore = create<FavoriteState>((set) => ({
    favorites: [],
    totalFavQty: 0,

    addFavorite: async (productId) => {
        // await yourApiCall(productId);
        set((state) => ({
            favorites: [...state.favorites, productId],
        }));
    },

    removeFavorite: async (productId) => {
        // await yourApiCall(productId);
        set((state) => ({
            favorites: state.favorites.filter((id) => id !== productId),
        }));
    },
}));