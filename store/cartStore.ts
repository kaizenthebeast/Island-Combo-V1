import { create } from "zustand"
import { CartItem } from "@/types/cart"
import { calculateCartTotals } from "@/helper/cartUtils"

// ─────────────────────────────────────────────────────────────────────────────
// TIER RESOLUTION HELPERS
// These run client-side during optimistic updates so the UI reflects the
// correct price immediately when a user changes quantity — without waiting
// for a server round-trip.
//
// Logic: find all tiers where min_quantity <= current quantity, then pick
// the one with the highest min_quantity (most specific match).
//
// Example:
//   tiers = [{ min_quantity: 1, discount_percent: 0 }, { min_quantity: 10, discount_percent: 20 }]
//   basePrice = 150
//   quantity = 12 → 150 * (1 - 20/100) = 120 (wholesale tier)
//   quantity = 5  → 150 * (1 - 0/100)  = 150 (retail tier)
// ─────────────────────────────────────────────────────────────────────────────

function resolveAppliedPrice(
  tiers: CartItem["pricing_tiers"],
  basePrice: number, // variant base retail price from product_variants.price
  quantity: number
): number | null {
  if (!tiers?.length) return null
  const matched = [...tiers]
    .filter((t) => quantity >= t.min_quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity)
  const tier = matched[0]
  if (!tier) return null
  // Apply discount_percent against base price, rounded to 2 decimal places
  return Math.round(basePrice * (1 - tier.discount_percent / 100) * 100) / 100
}

function resolveAppliedTierLabel(
  tiers: CartItem["pricing_tiers"],
  quantity: number
): string | null {
  if (!tiers?.length) return null
  const matched = [...tiers]
    .filter((t) => quantity >= t.min_quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity)
  return matched[0]?.label ?? null
}

type CartState = {
  cart: CartItem[]
  error: string | null
  totalQty: number      // total number of items across all cart rows
  subtotal: number      // sum of (applied_price * quantity) for all items
  quantityInput: number // controlled quantity selector on product pages

  // Selection (which rows are checked for checkout). Defaults to all selected.
  selectedIds: number[]      // variant_ids currently checked
  selectedQty: number        // total qty across selected rows only
  selectedSubtotal: number   // subtotal across selected rows only

  incrementQty: () => void
  decrementQty: () => void

  fetchCart: () => Promise<void>

  addItem: (variantId: number, qty: number, selectedOption?: string | null) => Promise<void>
  updateItem: (variantId: number, qty: number) => Promise<void>
  removeItem: (variantId: number) => Promise<void>

  toggleSelected: (variantId: number) => void
  setAllSelected: (selected: boolean) => void

  resetQuantity: () => void
  clearCart: () => void
}


export const useCartStore = create<CartState>((set, get) => {

  // Recalculates totalQty and subtotal from the current cart array.
  // calculateCartTotals must use applied_price tier-resolved not raw price
  // so subtotal automatically reflects wholesalek pricing.
  const recalc = (cart: CartItem[]) => calculateCartTotals(cart)

  // Preserve the user's checkbox selection across cart refreshes:
  // keep ids that are still selected, and auto-select brand-new rows.
  // On the very first populated load (prev cart empty) everything is selected.
  const reconcileSelection = (
    prevCart: CartItem[],
    prevSelected: number[],
    nextCart: CartItem[],
  ): number[] => {
    const nextIds = nextCart.map((i) => i.variant_id)
    if (prevCart.length === 0) return nextIds
    return nextIds.filter(
      (id) => prevSelected.includes(id) || !prevCart.some((p) => p.variant_id === id),
    )
  }

  // Applies recalculated totals (full + selected) and updates state atomically.
  const setCartState = (cart: CartItem[]) => {
    const selectedIds = reconcileSelection(get().cart, get().selectedIds, cart)
    const { totalQty, subtotal } = recalc(cart)
    const sel = recalc(cart.filter((i) => selectedIds.includes(i.variant_id)))
    set({
      cart,
      totalQty,
      subtotal,
      selectedIds,
      selectedQty: sel.totalQty,
      selectedSubtotal: sel.subtotal,
    })
  }

  // Optimistic update pattern:
  // 1. Snapshot current cart as prev
  // 2. Apply the updater immediately to the UI feels instant
  // 3. Return Prev so the caller can rollback if the API call fails
  const applyOptimistic = (updater: (cart: CartItem[]) => CartItem[]) => {
    const prev = get().cart
    setCartState(updater(prev))
    return prev
  }

  // Rollback: restores previous cart state and surfaces the error message
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
    selectedIds: [],
    selectedQty: 0,
    selectedSubtotal: 0,

    // ── Quantity Selector (product page) ──────────────────────────────────
    // Controls the qty input before adding to cart, floored at 1
    incrementQty: () => set((state) => ({ quantityInput: state.quantityInput + 1 })),
    decrementQty: () => set((state) => ({ quantityInput: Math.max(1, state.quantityInput - 1) })),

    // ── Fetch Cart ─────────────────────────────────────────────────────────
    // Loads the full cart from the server via cart_view which includes
    // pricing_tiers, applied_price, and applied_tier_label resolved in SQL.
    // This is the source of truth  always called after mutations settle.
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

    // ── Add Item ───────────────────────────────────────────────────────────
    // Optimistically adds a new row or increments quantity of an existing one.
    //
    // For NEW items: cast through unknown because the stub is intentionally
    // partial — pricing_tiers/applied_price are placeholders until fetchCart
    // backfills real data from the server. UI should guard with:
    //   applied_price || final_price || price
    //
    // For EXISTING items: tier is re-resolved client-side immediately using
    // the new combined quantity and the variant's base price so the displayed
    // price updates in the UI right away without a server round-trip.
    addItem: async (variantId, qty, selectedOption = null) => {
      const prev = applyOptimistic((cart) => {
        const exists = cart.find((i) => i.variant_id === variantId)

        if (!exists) {
          // New item stub  full data backfilled by fetchCart after API call
          return [
            ...cart,
            {
              variant_id: variantId,
              quantity: qty,
              selected_option: selectedOption,
              pricing_tiers: [],             // unknown until server responds
              applied_price: 0,              // placeholder
              applied_tier_label: "retail",  // safe default assumption
            } as unknown as CartItem,        // intentionally partial stub
          ]
        }

        // Existing item  bump quantity and re-resolve tier inside the map
        // i.price is the base retail price used for discount_percent calculation
        return cart.map((i) => {
          if (i.variant_id !== variantId) return i
          const newQty = i.quantity + qty
          return {
            ...i,
            quantity: newQty,
            applied_price:
              resolveAppliedPrice(i.pricing_tiers, i.price, newQty) ?? i.applied_price,
            applied_tier_label:
              resolveAppliedTierLabel(i.pricing_tiers, newQty) ?? i.applied_tier_label,
          }
        })
      })

      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          body: JSON.stringify({ variantId, quantity: qty, selectedOption }),
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) throw new Error("Failed to add item")
        // Refresh to get fully populated cart item with real pricing_tiers
        await get().fetchCart()
      } catch (err) {
        rollback(prev, err)
      }
    },

    // ── Update Item ────────────────────────────────────────────────────────
    // Optimistically sets a new quantity and re-resolves the pricing tier
    // so the price reflects wholesale/bulk thresholds immediately in the UI.
    // i.price is passed as basePrice since discount_percent is relative to it.
    updateItem: async (variantId, qty) => {
      const prev = applyOptimistic((cart) =>
        cart.map((i) => {
          if (i.variant_id !== variantId) return i
          return {
            ...i,
            quantity: qty,
            applied_price:
              resolveAppliedPrice(i.pricing_tiers, i.price, qty) ?? i.applied_price,
            applied_tier_label:
              resolveAppliedTierLabel(i.pricing_tiers, qty) ?? i.applied_tier_label,
          }
        })
      )

      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          body: JSON.stringify({ variantId, quantity: qty }),
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) throw new Error("Update failed")
          await get().fetchCart()
      } catch (err) {
        rollback(prev, err)
      }
    },

    // ── Remove Item ────────────────────────────────────────────────────────
    // Optimistically removes the item from the UI, rollback if API fails.
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

    // ── Selection ────────────────────────────────────────────────────────────
    // Toggle one row's checkbox and recompute the selected-only totals.
    toggleSelected: (variantId) =>
      set((state) => {
        const selectedIds = state.selectedIds.includes(variantId)
          ? state.selectedIds.filter((id) => id !== variantId)
          : [...state.selectedIds, variantId]
        const sel = recalc(state.cart.filter((i) => selectedIds.includes(i.variant_id)))
        return { selectedIds, selectedQty: sel.totalQty, selectedSubtotal: sel.subtotal }
      }),

    // Select or clear all rows at once.
    setAllSelected: (selected) =>
      set((state) => {
        const selectedIds = selected ? state.cart.map((i) => i.variant_id) : []
        const sel = recalc(selected ? state.cart : [])
        return { selectedIds, selectedQty: sel.totalQty, selectedSubtotal: sel.subtotal }
      }),

    // ── Utility ────────────────────────────────────────────────────────────
    // resetQuantity: resets the product page qty selector back to 1
    // clearCart: wipes all cart state used on logout or order completion
    resetQuantity: () => set({ quantityInput: 1 }),
    clearCart: () =>
      set({
        cart: [],
        error: null,
        totalQty: 0,
        subtotal: 0,
        quantityInput: 1,
        selectedIds: [],
        selectedQty: 0,
        selectedSubtotal: 0,
      }),
  }
})