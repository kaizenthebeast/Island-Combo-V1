'use server'

/** Customer cash-voucher purchase + retrieval. Staff claim lives in lib/admin/cash-vouchers. */

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import type { CashVoucher, CreateCashVoucherInput } from '@/types/cash-voucher'

// CREATE
// Creates a cash voucher after payment has succeeded. The code, status and
// purchaser are all set server-side by the create_cash_voucher() SQL function —
// the client never supplies them. Returns the voucher (including its code) so the
// caller can render the QR from it.
export const createCashVoucher = async (
  input: CreateCashVoucherInput,
): Promise<{ success: boolean; voucher?: CashVoucher; message?: string }> => {
  const user = await requireUser()
  if (!user) return { success: false, message: 'You must be signed in to buy a voucher.' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('create_cash_voucher', {
      p_amount: input.amount,
      p_recipient_name: input.recipientName,
      p_recipient_email: input.recipientEmail ?? null,
      p_payment_method: input.paymentMethod ?? null,
      p_payment_reference: input.paymentReference ?? null,
    })
    .single<CashVoucher>()

  if (error || !data) {
    return { success: false, message: error?.message ?? 'Could not create the voucher.' }
  }

  return { success: true, voucher: data }
}

// GENERATE REDEMPTION ID
// Mints a unique redemption UUID and stores it on the voucher. Ownership (caller
// owns the voucher, or is staff/admin) and the ACTIVE-only rule are enforced
// inside generate_cash_voucher_redemption_id(). Idempotent.
export const generateRedemptionId = async (
  voucherId: string,
): Promise<
  | { success: true; redemptionId: string | null; voucher: CashVoucher }
  | { success: false; status: number; message: string }
> => {
  const user = await requireUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('generate_cash_voucher_redemption_id', { p_voucher_id: voucherId })
    .single<CashVoucher>()

  if (error || !data) {
    return { success: false, status: 400, message: error?.message ?? 'Could not generate a redemption id.' }
  }
  return { success: true, redemptionId: data.redemption_uuid, voucher: data }
}

// READ (current user's vouchers)
export const getMyCashVouchers = async (): Promise<CashVoucher[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cash_voucher')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as CashVoucher[]
}
