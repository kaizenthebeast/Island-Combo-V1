/** Hook for debounced cart-quantity updates. */
import { useEffect, useRef } from 'react'
import { useCartStore } from '@/stores/cart-store'

const DEBOUNCE_MS = 500

/**
 * Returns a `changeQty(variantId, qty)` handler for cart quantity steppers.
 * The UI (and totals/tier pricing) update instantly via the store, while the
 * persistence API call is debounced — so rapid +/- clicks fire only one PATCH
 * once the user stops, instead of one per click.
 */
export function useCartQuantity() {
  const setLocal = useCartStore((s) => s.setItemQuantityLocal)
  const sync = useCartStore((s) => s.updateItem)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [])

  return (variantId: number, qty: number) => {
    if (qty < 1) return

    setLocal(variantId, qty) // instant UI

    const existing = timers.current.get(variantId)
    if (existing) clearTimeout(existing)

    timers.current.set(
      variantId,
      setTimeout(() => {
        sync(variantId, qty) // single persisted update
        timers.current.delete(variantId)
      }, DEBOUNCE_MS)
    )
  }
}
