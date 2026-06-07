/** Zustand store for the wishlist. */
import { create } from 'zustand';
import { WishlistView } from '@/lib/types/wishlist';

type WishlistState = {
    wishlist: WishlistView[];
    totalWishlistQty: number;
    error: string | null;

    fetchWishlist: () => Promise<void>;
    addToWishlist: (productId: number) => Promise<void>;
    removeFromWishlist: (productId: number) => Promise<void>;
    isWishlisted: (productId: number) => boolean;

    clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
    wishlist: [],
    totalWishlistQty: 0,
    error: null,

    fetchWishlist: async () => {
        try {
            const res = await fetch('/api/wishlist')
            const json = await res.json()

            if (!json.success) {
                set({ error: json.message });
                return;
            }

            set({ wishlist: json.data, totalWishlistQty: json.data.length, error: null });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch wishlist';
            set({ error: message });
        }
    },

    addToWishlist: async (productId) => {
        const prevQty = get().totalWishlistQty;
        try {
            const res = await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId }),
            })

            const json = await res.json()

            if (!json.success) {
                set({ error: json.message });
                return;
            }

            set({ totalWishlistQty: prevQty + 1, error: null });
            // Re-fetch to get the full WishlistView with variants
            await get().fetchWishlist();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add to wishlist';
            set({ totalWishlistQty: prevQty, error: message });
        }
    },

    removeFromWishlist: async (productId) => {
        const prevWishlist = get().wishlist;
        const prevQty = get().totalWishlistQty;
        // Optimistic update
        set(state => ({
            wishlist: state.wishlist.filter(w => w.product_id !== productId),
            totalWishlistQty: prevQty - 1,
            error: null,
        }))
        try {
            const res = await fetch('/api/wishlist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId }),
            })

            const json = await res.json()

            if (!json.success) {
                // Rollback on API error
                set({ wishlist: prevWishlist, totalWishlistQty: prevQty, error: json.message });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove from wishlist';
            // Rollback on network error
            set({ wishlist: prevWishlist, totalWishlistQty: prevQty, error: message });
        }
    },

    clearWishlist: () => {
      set({
        wishlist: [],
        totalWishlistQty: 0,
        error: null
      })
    },

    isWishlisted: (productId) => {
        return get().wishlist.some(w => w.product_id === productId);
    },
}));
