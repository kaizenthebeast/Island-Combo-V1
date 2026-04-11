import { create } from "zustand";
import { CartItem } from "@/lib/cart";
import { calculateCartTotals } from "@/helper/cartUtils";


type CartState = {
  cart: CartItem[]
  loading: boolean
  error: string | null
  totalQty: number | 0
  subtotal: number | 0

  fetchCart: (initialCart?: CartItem[]) => void
  addItem: (productId: string, quantity?: number) => Promise<void>
  updateItem: (productId: string, quantity: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  loading: false,
  error: null,
  totalQty: 0,
  subtotal: 0,

  fetchCart: async (initialCart) => {
    set({ loading: true, error: null });

    //Initial state load these values
    if (initialCart) {
      const { totalQty, subtotal } = calculateCartTotals(initialCart);
      set({
        cart: initialCart,
        subtotal,
        totalQty,
        loading: false,
      });
      return;
    };

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

      //fetch cart
      const { subtotal, totalQty } = calculateCartTotals(body)
      set({
        cart: body,
        subtotal,
        totalQty,
        loading: false
      })

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      set({ error: message, loading: false });
    }
  },

  addItem: async (productId, quantity = 1) => {
    const previousCart = get().cart;
    const previousSubtotal = get().subtotal;
    const previousTotalQty = get().totalQty;
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
          products: {
            id: productId,
            name: "Loading...",
            description: "",
            price: 0,
            is_active: true,
            category: { name: "Unknown" },
            slug: "",
          },
        },
      ];
    const { totalQty, subtotal } = calculateCartTotals(optimisticCart);

    set({ cart: optimisticCart, totalQty, subtotal });

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
      set({
        cart: previousCart,
        totalQty: previousTotalQty,
        subtotal: previousSubtotal,
        error: message,
        loading: false,
      });
    }
  },

  updateItem: async (productId, quantity) => {
    const previousCart = get().cart;
    const previousSubtotal = get().subtotal;
    const previousTotalQty = get().totalQty;

    set({ loading: true, error: null });

    const optimisticCart = previousCart.map((item) =>
      item.product_id === productId ? { ...item, quantity } : item
    );

    const { subtotal, totalQty } = calculateCartTotals(optimisticCart);
    set({ cart: optimisticCart, subtotal: subtotal, totalQty: totalQty });

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
      set({
        cart: previousCart,
        totalQty: previousTotalQty,
        subtotal: previousSubtotal,
        error: message,
        loading: false,
      });
    }
  },

  removeItem: async (productId) => {
    const previousCart = get().cart;
    const previousSubtotal = get().subtotal;
    const previousTotalQty = get().totalQty;

    set({ loading: true, error: null });

    const optimisticCart = previousCart.filter((item) => item.product_id !== productId);
    const { subtotal, totalQty } = calculateCartTotals(optimisticCart);

    set({ cart: optimisticCart, subtotal: subtotal, totalQty: totalQty });

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
      set({
        cart: previousCart,
        totalQty: previousTotalQty,
        subtotal: previousSubtotal,
        error: message,
        loading: false,
      });
    }
  },
}));