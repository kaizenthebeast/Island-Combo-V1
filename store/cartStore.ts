import { create } from "zustand";
import { CartItem } from "@/lib/cart";


type CartState = {
  cart: CartItem[];
  loading: boolean;
  error: string | null;

  fetchCart: (initialCart?: CartItem[]) => void;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  loading: false,
  error: null,

  fetchCart: async (initialCart) => {
      if (initialCart) {
      set({ cart: initialCart });
      return;
    }

    try {
      const res = await fetch("/api/cart", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to fetch cart");
      }

      set({ cart: body, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      set({ error: message, loading: false });
    }
  },

  addItem: async (productId, quantity = 1) => {
    const previousCart = get().cart;
    set({ loading: true, error: null });

    const existingItem = previousCart.find((item) => item.product_id === productId);

    const optimisticCart: CartItem[] = existingItem
      ? previousCart.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      )
      : [
          ...previousCart,
          {
            id: crypto.randomUUID(), 
            user_id: "temp",
            product_id: productId,
            quantity,
            products: undefined,
          },
        ];

    set({ cart: optimisticCart });

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, quantity }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to add item");
      }

      get().fetchCart();
      set({ loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      set({ cart: previousCart, error: message, loading: false });
    }
  },

  updateItem: async (productId, quantity) => {
    const previousCart = get().cart;
    set({ loading: true, error: null });

    const optimisticCart = previousCart.map((item) =>
      item.product_id === productId ? { ...item, quantity } : item
    );

    set({ cart: optimisticCart });

    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, quantity }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to update item");
      }

       get().fetchCart();
      set({ loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      set({ cart: previousCart, error: message, loading: false });
    }
  },

  removeItem: async (productId) => {
    const previousCart = get().cart;
    set({ loading: true, error: null });

    const optimisticCart = previousCart.filter((item) => item.product_id !== productId);
    set({ cart: optimisticCart });

    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to remove item");
      }

      get().fetchCart();
      set({ loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      set({ cart: previousCart, error: message, loading: false });
    }
  },
}));