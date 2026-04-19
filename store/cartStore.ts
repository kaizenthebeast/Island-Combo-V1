import { create } from "zustand"
import { CartItem } from "@/types/cart"
import { calculateCartTotals } from "@/helper/cartUtils"

type CartState = {
  cart: CartItem[]
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

  resetQuantity: () => void
  clearCart: () => void
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

  const applyOptimistic = (updater: (cart: CartItem[]) => CartItem[]) => {
    const current = get().cart
    const updated = updater(current)
    setCartState(updated)
    return current
  }

  return {
    cart: [],
    error: null,
    totalQty: 0,
    subtotal: 0,
    quantityInput: 1,

    incrementQty: () =>
      set((state) => ({
        quantityInput: state.quantityInput + 1,
      })),

    decrementQty: () =>
      set((state) => ({
        quantityInput: Math.max(1, state.quantityInput - 1),
      })),

    fetchCart: async () => {
      try {
        set({ error: null })

        const res = await fetch("/api/cart")
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || "Fetch failed")

        setCartState(data)
      } catch (err: unknown) {
        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },

    // ADD ITEM
    addItem: async (variantId, qty, size) => {
      const prev = applyOptimistic((cart) => {
        const exists = cart.find(
          (i) => i.variant_id === variantId && i.size === size
        )

        if (!exists) {
          return [
            ...cart,
            {
              variant_id: variantId,
              quantity: qty,
              size,
            } as CartItem,
          ]
        }

        return cart.map((i) =>
          i.variant_id === variantId && i.size === size
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      })

      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          body: JSON.stringify({ variantId, quantity: qty, size }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Failed to add item")

        // Optional: silent sync (non-blocking UX)
        // get().fetchCart()

      } catch (err) {
        setCartState(prev)
        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },

    // UPDATE ITEM
    updateItem: async (variantId, qty, size) => {
      const prev = applyOptimistic((cart) =>
        cart.map((i) =>
          i.variant_id === variantId && i.size === size
            ? { ...i, quantity: qty }
            : i
        )
      )

      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          body: JSON.stringify({ variantId, quantity: qty, size }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Update failed")

        // optional background sync
        // get().fetchCart()
      } catch (err) {
        setCartState(prev)
        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },

    // REMOVE ITEM
    removeItem: async (variantId, size) => {
      const prev = applyOptimistic((cart) =>
        cart.filter(
          (i) => !(i.variant_id === variantId && i.size === size)
        )
      )

      try {
        const res = await fetch("/api/cart", {
          method: "DELETE",
          body: JSON.stringify({ variantId, size }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error("Remove failed")

        // optional background sync
        // get().fetchCart()
      } catch (err) {
        setCartState(prev)
        set({
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    },

    resetQuantity: () => set({ quantityInput: 1 }),

    clearCart: () =>
      set({
        cart: [],
        error: null,
        totalQty: 0,
        subtotal: 0,
        quantityInput: 1,
      }),
  }
})