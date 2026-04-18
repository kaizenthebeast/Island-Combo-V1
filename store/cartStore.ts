// store/cartStore.ts

import { create } from "zustand"
import { CartItem } from "@/types/cart"
import { calculateCartTotals } from "@/helper/cartUtils"

type CartState = {
  cart: CartItem[]
  loading: boolean
  error: string | null
  totalQty: number
  subtotal: number
  quantityInput: number

  incrementQty: () => void
  decrementQty: () => void
  fetchCart: () => Promise<void>
  addItem: (variantId: number, qty: number, size: string) => Promise<void>
  updateItem: (variantId: number, qty: number, size: string) => Promise<void>
  removeItem: (variantId: number, size: string) => Promise<void>
}

export const useCartStore = create<CartState>((set, get) => {

  const recalc = (cart: CartItem[]) => calculateCartTotals(cart)

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
    quantityInput: 1,

    incrementQty: () => {
      set((state) => ({
        quantityInput: state.quantityInput + 1
      }))
    },

    decrementQty: () => {
      set((state) => ({
        quantityInput: Math.max(1, state.quantityInput - 1),
      }))
    },

    fetchCart: async () => {
      try {
        set({ loading: true, error: null })

        const res = await fetch("/api/cart")
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)

        setCartState(data)

      } catch (err: unknown) {
        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      } finally {
        set({ loading: false })
      }
    },

    // ADD ITEM
    addItem: async (variantId, qty, size) => {
      const prev = get().cart

      const existing = prev.find(
        i => i.variant_id === variantId && i.size === size
      )

      // only optimistic if exists
      if (existing) {
        const updated = prev.map(i =>
          i.variant_id === variantId && i.size === size
            ? { ...i, quantity: i.quantity + qty }
            : i
        )

        setCartState(updated)
      }

      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          body: JSON.stringify({ variantId, quantity: qty, size }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Failed to add item")

        await get().fetchCart()

      } catch (err) {
        setCartState(prev)
        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },

    // UPDATE ITEM
    updateItem: async (variantId, qty, size) => {
      const prev = get().cart

      const updated = prev.map(i =>
        i.variant_id === variantId && i.size === size
          ? { ...i, quantity: qty }
          : i
      )

      setCartState(updated)

      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          body: JSON.stringify({ variantId, quantity: qty, size }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Update failed")

        await get().fetchCart()

      } catch (err) {
        setCartState(prev)
        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },

    // REMOVE ITEM
    removeItem: async (variantId, size) => {
      const prev = get().cart

      const updated = prev.filter(
        i => !(i.variant_id === variantId && i.size === size)
      )

      setCartState(updated)

      try {
        const res = await fetch("/api/cart", {
          method: "DELETE",
          body: JSON.stringify({ variantId, size }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Remove failed")

        await get().fetchCart()

      } catch (err) {
        setCartState(prev)
        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },
  }
})
