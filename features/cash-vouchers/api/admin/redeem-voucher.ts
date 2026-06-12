'use server'

/**
 * Back-Office Digital Voucher tools.
 *
 *   • findCashVoucherByCode — the Search API: looks up a voucher by its unique
 *     server-generated code (what the QR encodes). RLS on cash_voucher already
 *     restricts visibility to staff/admin (or the buyer themselves).
 *   • validateCashVoucher  — the Validate API: a read-only verdict for a scanned
 *     QR code — does this voucher exist and is it currently redeemable? Never
 *     mutates, so a scanner app can call it freely before redeeming.
 *   • redeemCashVoucher — the Redeem API: flips an ACTIVE voucher to REDEEMED and
 *     records the back-office user, timestamp and the person who exchanged it.
 *     The DB enforces the staff/admin check, the single-redeem guard and the
 *     immutability of the audit fields, so this server action stays thin.
 */

import { createClient } from '@/shared/lib/db/server'
import { requireStaff } from '@/features/auth/api'
import type { CashVoucher, CashVoucherStatus } from '@/shared/types/cash-voucher'

type VoucherResult = { success: boolean; voucher?: CashVoucher; message?: string; status?: number }

// Normalize a scanned/typed code: trim and upper-case (codes are stored upper-case).
const normalizeCode = (code: string) => code.trim().toUpperCase()

// A scanned value is either the display code (CV-YYYY-…) or the dedicated
// redemption id (canonical UUID, what new QRs encode). The shapes are disjoint.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Map the redeem RPC's SQLSTATE (raised via `USING errcode = …`) to an HTTP status
// so the API route returns a meaningful code instead of a blanket 400/500.
const statusForPgError = (code: string | undefined): number => {
  switch (code) {
    case '42501': return 403 // insufficient_privilege — not staff/admin
    case 'P0002': return 404 // no_data_found — voucher code not found
    case '22023': return 409 // invalid_parameter_value — voucher not ACTIVE
    case '40001': return 409 // serialization_failure — lost the single-redeem race
    default:      return 400
  }
}

// SEARCH (Digital Good Search API)
export const findCashVoucherByCode = async (code: string): Promise<VoucherResult> => {
  const trimmed = normalizeCode(code)
  if (!trimmed) return { success: false, message: 'Enter a voucher code to search.' }

  const auth = await requireStaff()
  if (!auth.ok) return { success: false, message: auth.message }
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cash_voucher')
    .select('*')
    .eq('code', trimmed)
    .maybeSingle<CashVoucher>()

  if (error) return { success: false, message: error.message }
  if (!data) return { success: false, message: `No voucher found for ${trimmed}.` }

  return { success: true, voucher: data }
}

// VALIDATE (Digital Good Validate API) — staff/admin only.
// Read-only: never mutates. Returns a clear verdict for a scanned value — either
// the redemption UUID (what QRs encode) or the display code — so a scanner app
// can decide whether to proceed to redeem.
//   reason: OK (redeemable) | NOT_FOUND | ALREADY_REDEEMED | EXPIRED | CANCELLED
export type VoucherValidation = {
  valid: boolean
  status: CashVoucherStatus | 'NOT_FOUND'
  reason: 'OK' | 'NOT_FOUND' | 'ALREADY_REDEEMED' | 'EXPIRED' | 'CANCELLED'
  voucher?: Pick<
    CashVoucher,
    'code' | 'amount' | 'recipient_name' | 'recipient_email' | 'status' | 'claimed_at' | 'redeemed_recipient_name'
  >
}

const REASON_BY_STATUS: Record<CashVoucherStatus, VoucherValidation['reason']> = {
  ACTIVE: 'OK',
  REDEEMED: 'ALREADY_REDEEMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
}

export const validateCashVoucher = async (
  code: string,
): Promise<{ success: true; data: VoucherValidation } | { success: false; status: number; message: string }> => {
  const trimmed = normalizeCode(code)
  if (!trimmed) return { success: false, status: 400, message: 'Enter a voucher code to validate.' }

  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  // QR scans carry the redemption UUID; typed/legacy inputs carry the code.
  const lookup = UUID_RE.test(trimmed)
    ? { column: 'redemption_uuid', value: trimmed.toLowerCase() }
    : { column: 'code', value: trimmed }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_voucher')
    .select('code, amount, recipient_name, recipient_email, status, claimed_at, redeemed_recipient_name')
    .eq(lookup.column, lookup.value)
    .maybeSingle<VoucherValidation['voucher']>()

  if (error) return { success: false, status: 500, message: error.message }

  // Unknown code → a definitive "invalid" verdict (200), not an error.
  if (!data) return { success: true, data: { valid: false, status: 'NOT_FOUND', reason: 'NOT_FOUND' } }

  return {
    success: true,
    data: {
      valid: data.status === 'ACTIVE',
      status: data.status,
      reason: REASON_BY_STATUS[data.status],
      voucher: data,
    },
  }
}

// REDEEM (Digital Product Redeem API) — staff/admin only (enforced in SQL).
// `code` may be the display code or the redemption UUID; the RPC resolves both.
export const redeemCashVoucher = async (
  code: string,
  redeemerName: string,
): Promise<VoucherResult> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('redeem_cash_voucher', {
      p_code: code.trim(),
      p_redeemer_name: redeemerName,
    })
    .single<CashVoucher>()

  if (error || !data) {
    return {
      success: false,
      status: statusForPgError(error?.code),
      message: error?.message ?? 'Could not redeem the voucher.',
    }
  }

  return { success: true, voucher: data }
}
