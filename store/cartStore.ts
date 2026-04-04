import { create } from 'zustand'

export type CartItem = {
    user_id: string
    product_id: string
    quantity: number
}



type CartState = {
    items: CartItem[]
    loading: boolean
    error: string | null

    fetchCart: () => Promise<void>
    addItem: (productId: string, quantity?: number) => Promise<void>
    updateItem: (productId: string, quantity: number) => Promise<void>
    removeItem: (productId: string) => Promise<void>
};

export const useCartStore = create<CartState>((set) => ({
    items: [],
    loading: false,
    error: null,

    fetchCart: async () => {
        set({ loading: true, error: null });

        try {
            const res = await fetch("/api/cart");
            if (!res.ok) {
                throw new Error("Failed to fetch cart");
            }

            const data = await res.json();
            set({ items: data, loading: false })
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Unknown error";
            set({ error: message, loading: false });
        }
    },

    addItem: async (productId, quantity) => {
        set({ loading: true, error: null });

        try {
            const res = await fetch('/api/cart', {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity }),
            })
            if (!res.ok) {
                throw new Error("Failed to add item");
            }

            const updated = await fetch('/api/cart');
            const data = await updated.json();

            set({ items: data, loading: false })

        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Unknown error";
            set({ error: message, loading: false });
        }

    },
    updateItem: async (productId, quantity) => {
        set({ loading: true, error: null });

        try {
            const res = await fetch('/api/cart', {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity })
            })
            if (!res.ok) {
                throw new Error("Failed to update item");
            }

            const updated = await fetch('/api/cart');
            const data = await updated.json();
            set({ items: data, loading: false })

        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Unknown error";
            set({ error: message, loading: false });
        }

    },
    removeItem: async (productId) => {
        set({ loading: true, error: null });

        try {
            const res = await fetch('/api/cart', {
                method: "DELETE",
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({ productId })
            })

            if (!res.ok) {
                throw new Error("Failed to update item");
            }

            const updated = await fetch('/api/cart');
            const data = await updated.json();
            set({ items: data, loading: false })

        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Unknown error";
            set({ error: message, loading: false });
        }

    },
}))