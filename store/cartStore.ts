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

  addItem: (variantId: number, qty: number, selectedOption?: string | null) => Promise<void>
  updateItem: (variantId: number, qty: number) => Promise<void>
  removeItem: (variantId: number) => Promise<void>

  resetQuantity: () => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set, get) => {
  const recalc = (cart: CartItem[]) => calculateCartTotals(cart)

  const setCartState = (cart: CartItem[]) => {
    const { totalQty, subtotal } = recalc(cart)
    set({ cart, totalQty, subtotal })
  }

  const applyOptimistic = (updater: (cart: CartItem[]) => CartItem[]) => {
    const prev = get().cart
    setCartState(updater(prev))
    return prev
  }

  const rollback = (prev: CartItem[], err: unknown) => {
    setCartState(prev)
    set({ error: err instanceof Error ? err.message : "Unknown error" })
  }

  return {
    cart: [],
    error: null,
    totalQty: 0,
    subtotal: 0,
    quantityInput: 1,

    incrementQty: () => set((state) => ({ quantityInput: state.quantityInput + 1 })),
    decrementQty: () => set((state) => ({ quantityInput: Math.max(1, state.quantityInput - 1) })),

    fetchCart: async () => {
      try {
        set({ error: null })
        const res = await fetch("/api/cart")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Fetch failed")
        setCartState(data)
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Unknown error" })
      }
    },

    // ADD ITEM
    addItem: async (variantId, qty, selectedOption = null) => {
      const prev = applyOptimistic((cart) => {
        const exists = cart.find((i) => i.variant_id === variantId)
        if (!exists) {
          return [
            ...cart,
            { variant_id: variantId, quantity: qty, selected_option: selectedOption } as CartItem,
          ]
        }
        return cart.map((i) =>
          i.variant_id === variantId
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      })

      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          body: JSON.stringify({ variantId, quantity: qty, selectedOption }),
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) throw new Error("Failed to add item")
      } catch (err) {
        rollback(prev, err)
      }
    },

    // UPDATE ITEM
    updateItem: async (variantId, qty) => {
      const prev = applyOptimistic((cart) =>
        cart.map((i) =>
          i.variant_id === variantId ? { ...i, quantity: qty } : i
        )
      )

      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          body: JSON.stringify({ variantId, quantity: qty }),
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) throw new Error("Update failed")
      } catch (err) {
        rollback(prev, err)
      }
    },

    // REMOVE ITEM
    removeItem: async (variantId) => {
      const prev = applyOptimistic((cart) =>
        cart.filter((i) => i.variant_id !== variantId)
      )

      try {
        const res = await fetch("/api/cart", {
          method: "DELETE",
          body: JSON.stringify({ variantId }),
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) throw new Error("Remove failed")
      } catch (err) {
        rollback(prev, err)
      }
    },

    resetQuantity: () => set({ quantityInput: 1 }),

    clearCart: () => set({ cart: [], error: null, totalQty: 0, subtotal: 0, quantityInput: 1 }),
  }
})