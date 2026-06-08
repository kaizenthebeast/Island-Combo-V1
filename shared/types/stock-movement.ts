/** public.stock_movements — append-only inventory ledger (migration 0028). */

export type StockMovementReason =
  | 'opening'      // initial baseline per variant
  | 'order'        // sold via create_order
  | 'restock'      // new variant / replenishment
  | 'adjustment'   // admin edit of on-hand
  | 'cancellation' // order cancelled, stock returned
  | 'return'       // customer return

export type StockMovement = {
  id: number
  variant_id: number
  delta: number              // signed: -2 sold, +10 restocked
  balance_after: number | null
  reason: StockMovementReason
  order_id: number | null
  actor: string | null       // auth.uid() that caused it
  note: string | null
  created_at: string
}
