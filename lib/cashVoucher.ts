'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import type { CashVoucher, CreateCashVoucherInput } from '@/types/cashVoucher'

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
