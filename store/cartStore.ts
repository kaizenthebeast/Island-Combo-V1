import { create } from "zustand"
import { CartItem } from "@/types/cart"
import { calculateCartTotals } from "@/helper/cartUtils"

type CartState = {
  cart: CartItem[]
  loading: boolean
  error: string | null
  totalQty: number
  subtotal: number

  fetchCart: () => Promise<void>
  addItem: (productId: string, qty?: number) => Promise<void>
  updateItem: (productId: string, qty: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
}

export const useCartStore = create<CartState>((set, get) => {
  // central recalculation
  const recalc = (cart: CartItem[]) => {
    return calculateCartTotals(cart)
  }

  // single source setter
  const setCartState = (cart: CartItem[]) => {
    const { totalQty, subtotal } = recalc(cart)

    set({
      cart,
      totalQty,
      subtotal,
    })
  }

  return {
    cart: [],
    loading: false,
    error: null,
    totalQty: 0,
    subtotal: 0,

    fetchCart: async () => {
      try {
        set({ loading: true, error: null })

        const res = await fetch("/api/cart")
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)

        setCartState(data)
        set({ loading: false })

      } catch (err: unknown) {
        set({
          error: err instanceof Error ? err.message : "Unknown error",
          loading: false,
        })
      }
    },

    addItem: async (variantId, qty = 1) => {
      const prev = get()
      set({ error: null })

      const previousCart = prev.cart

      const existing = previousCart.find(i => i.variant_id === variantId)

      let updatedCart: CartItem[]

      if (existing) {
        updatedCart = previousCart.map(i =>
          i.variant_id === variantId
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      } else {
        updatedCart = [
          ...previousCart,
          {
            variant_id: variantId,
            quantity: qty,
          } as CartItem,
        ]
      }

      // optimistic update (WITH totals)
      setCartState(updatedCart)

      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          body: JSON.stringify({ variantId, quantity: qty }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Failed to add item")

        await get().fetchCart()

      } catch (err) {
        // rollback (WITH totals)
        setCartState(previousCart)

        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },

    updateItem: async (variantId, qty) => {
      const prev = get()
      set({ error: null })

      const previousCart = prev.cart

      const updatedCart = previousCart.map(i =>
        i.variant_id === variantId
          ? { ...i, quantity: qty }
          : i
      )

      setCartState(updatedCart)

      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          body: JSON.stringify({ variantId, quantity: qty }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Update failed")

        await get().fetchCart()

      } catch (err) {
        setCartState(previousCart)

        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },

    removeItem: async (variantId) => {
      const prev = get()
      set({ error: null })

      const previousCart = prev.cart

      const updatedCart = previousCart.filter(
        i => i.variant_id !== variantId
      )

      setCartState(updatedCart)

      try {
        const res = await fetch("/api/cart", {
          method: "DELETE",
          body: JSON.stringify({ variantId }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Remove failed")

        await get().fetchCart()

      } catch (err) {
        setCartState(previousCart)

        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },
  }
})