'use server'

/** Staff/admin: claim a pending cash voucher at point of sale. */

import { createClient } from '@/lib/supabase/server'
import type { CashVoucher } from '@/lib/types/cash-voucher'

// CLAIM (staff/admin only)
// Marks a pending voucher as claimed. The SQL function enforces the staff/admin
// check, so this is safe to expose to any signed-in caller.
export const claimCashVoucher = async (
  code: string,
): Promise<{ success: boolean; voucher?: CashVoucher; message?: string }> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('claim_cash_voucher', { p_code: code })
    .single<CashVoucher>()

  if (error || !data) {
    return { success: false, message: error?.message ?? 'Could not claim the voucher.' }
  }

  return { success: true, voucher: data }
}
