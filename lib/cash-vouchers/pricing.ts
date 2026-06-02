/** Shared cash-voucher pricing (fee + charge total + inverse). */
// Shared cash-voucher pricing. Plain module (no 'use client'/'server-only') so
// both the client UI and the server routes use the SAME fee — the buyer is
// charged (voucher value + fee), and the server derives the voucher value back
// out of the captured total.

export const CONVENIENCE_FEE = 5

const round2 = (n: number) => Math.round(n * 100) / 100

// Total the buyer is charged for a voucher of the given value.
export const chargeTotal = (voucherValue: number) => round2(voucherValue + CONVENIENCE_FEE)

// Voucher value implied by a captured total (inverse of chargeTotal).
export const voucherValueFromTotal = (total: number) => round2(total - CONVENIENCE_FEE)
