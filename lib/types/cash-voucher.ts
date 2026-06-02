/** Shared cash-voucher types. */
export type CashVoucherStatus = 'pending' | 'claimed' | 'cancelled' | 'expired'

// Mirrors a row of public.cash_voucher. The `code` is generated server-side and
// is what the QR encodes; no card data is ever stored here.
export type CashVoucher = {
  id: string
  code: string
  amount: number
  status: CashVoucherStatus
  recipient_name: string
  recipient_email: string | null
  purchaser_id: string
  purchaser_email: string | null
  payment_method: string | null
  payment_reference: string | null
  claimed_at: string | null
  claimed_by: string | null
  created_at: string
  updated_at: string
}

export type CreateCashVoucherInput = {
  amount: number
  recipientName: string
  recipientEmail?: string | null
  paymentMethod?: string | null
  // The payment processor's charge/transaction id — NEVER a card number.
  paymentReference?: string | null
}
