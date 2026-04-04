import { create } from 'zustand'

export type CartItem = {
    user_id: string
    product_id: string
    quantity: number
}



type CartState = {

    cart: CartItem[]
    loading: boolean
    error: string | null

    fetchCart: () => Promise<void>
    addItem: (productId: string, quantity?: number) => Promise<void>
    updateItem: (productId: string, quantity: number) => Promise<void>
    removeItem: (productId: string) => Promise<void>
};

export const useCartStore = create<CartState>((set, get) => ({
    cart: [],
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
            set({ cart: data, loading: false })
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Unknown error";
            set({ error: message, loading: false });
        }
    },

    addItem: async (productId, quantity = 1) => {
        const previousCart = get().cart
        set({ loading: true, error: null });

        // Update UI first
        const existingItem = previousCart.find((item) => item.product_id === productId)
        let optCart: CartItem[]

        if (existingItem) {
            optCart = previousCart.map((item) =>
                item.product_id === productId ? { ...item, quantity: item.quantity + quantity } : item
            )
        } else {
            optCart = [...previousCart, { user_id: '', product_id: productId, quantity: quantity }]
        }

        set({ cart: optCart })

        //Database
        try {
            const res = await fetch('/api/cart', {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity }),
            })
            if (!res.ok) {
                throw new Error("Failed to add item");
            }
            set({ loading: false })
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            set({ cart: previousCart, error: message, loading: false });
        }

    },
    updateItem: async (productId, quantity) => {
        const previousCart = get().cart;
        set({ loading: true, error: null });

        const optCart = previousCart.map((item) =>
            item.product_id === productId ? { ...item, quantity } : item
        )
        set({ cart: optCart })

        try {
            const res = await fetch('/api/cart', {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity })
            })
            if (!res.ok) {
                throw new Error("Failed to update item");
            }

            set({ loading: false })

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            set({ cart: previousCart, error: message, loading: false });
        }

    },
    removeItem: async (productId) => {
        const previousCart = get().cart;
        set({ loading: true, error: null });

        const optCart = previousCart.filter((item) => item.product_id !== productId)
        set({ cart: optCart })

        try {
            const res = await fetch('/api/cart', {
                method: "DELETE",
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({ productId })
            })

            if (!res.ok) {
                throw new Error("Failed to update item");
            }
            set({ loading: false })

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            set({ cart: previousCart, error: message, loading: false });
        }

    },
}))