/** Refund-request types (public.refunds). */

export type RefundStatus = 'pending' | 'refunded' | 'rejected'

export type AdminRefundRow = {
  id: number
  order_id: number
  public_ref: string
  customer_name: string | null
  customer_email: string | null
  amount: number
  reason: string | null
  status: RefundStatus
  payment_method: string
  paypal_capture_id: string | null
  paypal_refund_id: string | null
  staff_note: string | null
  requested_at: string
  processed_at: string | null
  processed_by_name: string | null   // staff who approved/rejected (audit)
}
