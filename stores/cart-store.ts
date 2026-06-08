/** Zustand store for the shopping cart. */
import { create } from "zustand"
import { CartItem, CartTotals } from "@/types/cart"
import { calculateCartTotals } from "@/lib/utils/cart-totals"

// Default tier label for a brand-new item before the server backfills real data.
const DEFAULT_TIER_LABEL = "retail"

type PricingTier = CartItem["pricing_tiers"][number]

const roundToCents = (value: number) => Math.round(value * 100) / 100

// Most-specific active tier: the highest min_quantity the quantity still
// qualifies for. Null when the variant has no tiers or none match.
//
//   tiers = [{ min_quantity: 1, discount_percent: 0 }, { min_quantity: 10, discount_percent: 20 }]
//   quantity = 12 → wholesale tier (20% off);  quantity = 5 → retail tier (0% off)
const findActiveTier = (
  tiers: CartItem["pricing_tiers"],
  quantity: number,
): PricingTier | null => {
  if (!tiers?.length) return null
  return (
    [...tiers]
      .filter((tier) => quantity >= tier.min_quantity)
      .sort((a, b) => b.min_quantity - a.min_quantity)[0] ?? null
  )
}

// Re-resolves a cart item's tier pricing for a new quantity, client-side, so the
// price reflects wholesale/bulk thresholds instantly without a server round-trip.
// When no tier matches, the item keeps its current applied price/label.
const applyResolvedTier = (item: CartItem, quantity: number): CartItem => {
  const tier = findActiveTier(item.pricing_tiers, quantity)
  if (!tier) return { ...item, quantity }
  return {
    ...item,
    quantity,
    applied_price: roundToCents(item.price * (1 - tier.discount_percent / 100)),
    applied_tier_label: tier.label,
  }
}

// Partial stub for a newly-added item; fetchCart backfills the real pricing_tiers
// and applied_price from the server. Cast through unknown because the stub is
// intentionally incomplete — UI should guard with: applied_price || final_price || price.
const createPendingItem = (
  variantId: number,
  quantity: number,
  selectedOption: string | null,
): CartItem =>
({
  variant_id: variantId,
  quantity,
  selected_option: selectedOption,
  pricing_tiers: [],
  applied_price: 0,
  applied_tier_label: DEFAULT_TIER_LABEL,
} as unknown as CartItem)

type CartState = {
  cart: CartItem[]
  error: string | null
  totalQty: number      // total items across all cart rows
  subtotal: number      // sum of applied_price * quantity for all items
  serverTotals: CartTotals | null // server-side totals from Fetch Cart (promo + points)
  quantityInput: number // controlled quantity selector on product pages

  // Selection: which rows are checked for checkout. Defaults to all selected.
  selectedIds: number[]
  selectedQty: number
  selectedSubtotal: number

  incrementQty: () => void
  decrementQty: () => void

  fetchCart: () => Promise<void>

  addItem: (variantId: number, qty: number, selectedOption?: string | null) => Promise<void>
  updateItem: (variantId: number, qty: number) => Promise<void>
  setItemQuantityLocal: (variantId: number, qty: number) => void
  removeItem: (variantId: number) => Promise<void>
  removeAllItem: () => Promise<void>

  toggleSelected: (variantId: number) => void
  setAllSelected: (selected: boolean) => void

  resetQuantity: () => void
  clearCart: () => void
}


export const useCartStore = create<CartState>((set, get) => {

  const computeTotals = (cart: CartItem[]) => calculateCartTotals(cart)

  const computeSelectedTotals = (cart: CartItem[], selectedIds: number[]) =>
    computeTotals(cart.filter((item) => selectedIds.includes(item.variant_id)))

  // Preserve the user's checkbox selection across cart refreshes: keep ids still
  // selected, auto-select brand-new rows. On the first populated load (previous
  // cart empty) everything is selected.
  const reconcileSelection = (
    previousCart: CartItem[],
    previousSelected: number[],
    nextCart: CartItem[],
  ): number[] => {
    const nextIds = nextCart.map((item) => item.variant_id)
    if (previousCart.length === 0) return nextIds
    return nextIds.filter(
      (id) => previousSelected.includes(id) || !previousCart.some((p) => p.variant_id === id),
    )
  }

  // Commits a new cart plus its recomputed full + selected-only totals atomically.
  const commitCart = (cart: CartItem[]) => {
    const selectedIds = reconcileSelection(get().cart, get().selectedIds, cart)
    const { totalQty, subtotal } = computeTotals(cart)
    const selectedTotals = computeSelectedTotals(cart, selectedIds)
    set({
      cart,
      totalQty,
      subtotal,
      selectedIds,
      selectedQty: selectedTotals.totalQty,
      selectedSubtotal: selectedTotals.subtotal,
    })
  }

  // Optimistic update: apply the change to the UI immediately and return the
  // previous cart so the caller can roll back if the API call fails.
  const applyOptimistic = (applyChange: (cart: CartItem[]) => CartItem[]) => {
    const previousCart = get().cart
    commitCart(applyChange(previousCart))
    return previousCart
  }

  const rollback = (previousCart: CartItem[], error: unknown) => {
    commitCart(previousCart)
    set({ error: error instanceof Error ? error.message : "Unknown error" })
  }

  return {
    cart: [],
    error: null,
    totalQty: 0,
    subtotal: 0,
    serverTotals: null,
    quantityInput: 1,
    selectedIds: [],
    selectedQty: 0,
    selectedSubtotal: 0,

    incrementQty: () => set((state) => ({ quantityInput: state.quantityInput + 1 })),
    decrementQty: () => set((state) => ({ quantityInput: Math.max(1, state.quantityInput - 1) })),

    // Loads the full cart from cart_view (pricing_tiers, applied_price, and
    // applied_tier_label resolved in SQL) — the source of truth, called after
    // every mutation settles.
    fetchCart: async () => {
      try {
        set({ error: null })
        const response = await fetch("/api/cart")
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error(payload.message || "Fetch failed")
        // Fetch Cart returns { items, totals }; tolerate a bare array too.
        const data = payload.data
        const items = Array.isArray(data) ? data : (data?.items ?? [])
        commitCart(items)
        set({ serverTotals: Array.isArray(data) ? null : (data?.totals ?? null) })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : "Unknown error" })
      }
    },

    // Adds a new row or increments an existing one. New items get a partial stub
    // (backfilled by fetchCart); existing items re-resolve their tier immediately
    // against the combined quantity.
    addItem: async (variantId, qty, selectedOption = null) => {
      const previousCart = applyOptimistic((cart) => {
        const existingItem = cart.find((item) => item.variant_id === variantId)
        if (!existingItem) {
          return [...cart, createPendingItem(variantId, qty, selectedOption)]
        }
        return cart.map((item) =>
          item.variant_id === variantId
            ? applyResolvedTier(item, item.quantity + qty)
            : item,
        )
      })

      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          body: JSON.stringify({ variantId, quantity: qty, selectedOption }),
          headers: { "Content-Type": "application/json" },
        })
        if (!response.ok) throw new Error("Failed to add item")
        await get().fetchCart()
      } catch (error) {
        rollback(previousCart, error)
      }
    },

    // Sets an exact quantity and re-resolves the tier so wholesale/bulk pricing
    // shows immediately, then persists via the API.
    updateItem: async (variantId, qty) => {
      const previousCart = applyOptimistic((cart) =>
        cart.map((item) =>
          item.variant_id === variantId ? applyResolvedTier(item, qty) : item,
        ),
      )

      try {
        const response = await fetch("/api/cart", {
          method: "PATCH",
          body: JSON.stringify({ variantId, quantity: qty }),
          headers: { "Content-Type": "application/json" },
        })
        if (!response.ok) throw new Error("Update failed")
        await get().fetchCart()
      } catch (error) {
        rollback(previousCart, error)
      }
    },

    removeItem: async (variantId) => {
      const previousCart = applyOptimistic((cart) =>
        cart.filter((item) => item.variant_id !== variantId),
      )

      try {
        const response = await fetch("/api/cart", {
          method: "DELETE",
          body: JSON.stringify({ variantId, clearAll: false}),
          headers: { "Content-Type": "application/json" },
        })
        if (!response.ok) throw new Error("Remove failed")
      } catch (error) {
        rollback(previousCart, error)
      }
    },

    removeAllItem: async () => {
      const previousCart = applyOptimistic(() => [])

      try {
        const response = await fetch('/api/cart', {
          method: "DELETE",
          body: JSON.stringify({ variantId: null, clearAll: true}),
          headers: { "Content-Type": "application/json" }
        })
        if (!response.ok) throw new Error('Remove all items failed')
      } catch (error) {
        rollback(previousCart, error)
      }
    },

    // Instant local quantity change (no API). The caller debounces the persisting
    // updateItem call while the user keeps clicking.
    setItemQuantityLocal: (variantId, qty) =>
      set((state) => {
        const cart = state.cart.map((item) =>
          item.variant_id === variantId ? applyResolvedTier(item, qty) : item,
        )
        const { totalQty, subtotal } = computeTotals(cart)
        const selectedTotals = computeSelectedTotals(cart, state.selectedIds)
        return {
          cart,
          totalQty,
          subtotal,
          selectedQty: selectedTotals.totalQty,
          selectedSubtotal: selectedTotals.subtotal,
        }
      }),

    toggleSelected: (variantId) =>
      set((state) => {
        const selectedIds = state.selectedIds.includes(variantId)
          ? state.selectedIds.filter((id) => id !== variantId)
          : [...state.selectedIds, variantId]
        const selectedTotals = computeSelectedTotals(state.cart, selectedIds)
        return { selectedIds, selectedQty: selectedTotals.totalQty, selectedSubtotal: selectedTotals.subtotal }
      }),

    setAllSelected: (selected) =>
      set((state) => {
        const selectedIds = selected ? state.cart.map((item) => item.variant_id) : []
        const selectedTotals = computeSelectedTotals(state.cart, selectedIds)
        return { selectedIds, selectedQty: selectedTotals.totalQty, selectedSubtotal: selectedTotals.subtotal }
      }),

    resetQuantity: () => set({ quantityInput: 1 }),
    clearCart: () =>
      set({
        cart: [],
        error: null,
        totalQty: 0,
        subtotal: 0,
        serverTotals: null,
        quantityInput: 1,
        selectedIds: [],
        selectedQty: 0,
        selectedSubtotal: 0,
      }),
  }
})
