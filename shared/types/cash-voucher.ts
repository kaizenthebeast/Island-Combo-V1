/** Shared cash-voucher types. */
// Matches the Digital Product spec vocabulary (see migration 0010).
export type CashVoucherStatus = 'ACTIVE' | 'REDEEMED' | 'CANCELLED' | 'EXPIRED'

// Mirrors a row of public.cash_voucher. The `code` is generated server-side and
// is what the QR encodes; no card data is ever stored here.
export type CashVoucher = {
  id: string
  code: string
  amount: number
  status: CashVoucherStatus
  // The buyer's intended recipient, captured at purchase.
  recipient_name: string
  recipient_email: string | null
  // The person who actually exchanged the voucher for cash, captured at
  // redemption by the back-office staff (audit trail).
  redeemed_recipient_name: string | null
  // Optional link to an order (Digital Product Table); NULL for standalone buys.
  order_id: number | null
  // Cryptographically-unique redemption identifier, minted on demand by the
  // Generate Id API. NULL until generated. Distinct from the display `code`.
  redemption_uuid: string | null
  // NULL after the purchaser's account is deleted (FK is ON DELETE SET NULL);
  // purchaser_email is retained for post-deletion lookup.
  purchaser_id: string | null
  purchaser_email: string | null
  payment_method: string | null
  payment_reference: string | null
  // claimed_at / claimed_by are the redemption timestamp and the back-office
  // user who released the cash. Immutable once status is REDEEMED.
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
