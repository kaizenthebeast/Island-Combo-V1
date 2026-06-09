'use server'

/**
 * Back-Office Digital Voucher tools.
 *
 *   • findCashVoucherByCode — the Search API: looks up a voucher by its unique
 *     server-generated code (what the QR encodes). RLS on cash_voucher already
 *     restricts visibility to staff/admin (or the buyer themselves).
 *   • redeemCashVoucher — the Redeem API: flips an ACTIVE voucher to REDEEMED and
 *     records the back-office user, timestamp and the person who exchanged it.
 *     The DB enforces the staff/admin check, the single-redeem guard and the
 *     immutability of the audit fields, so this server action stays thin.
 */

import { createClient } from '@/shared/lib/db/server'
import { requireStaff } from '@/features/auth/api'
import type { CashVoucher } from '@/shared/types/cash-voucher'

type VoucherResult = { success: boolean; voucher?: CashVoucher; message?: string }

// Normalize a scanned/typed code: trim and upper-case (codes are stored upper-case).
const normalizeCode = (code: string) => code.trim().toUpperCase()

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

// REDEEM (Digital Product Redeem API) — staff/admin only (enforced in SQL).
export const redeemCashVoucher = async (
  code: string,
  redeemerName: string,
): Promise<VoucherResult> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, message: auth.message }
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('redeem_cash_voucher', {
      p_code: normalizeCode(code),
      p_redeemer_name: redeemerName,
    })
    .single<CashVoucher>()

  if (error || !data) {
    return { success: false, message: error?.message ?? 'Could not redeem the voucher.' }
  }

  return { success: true, voucher: data }
}
