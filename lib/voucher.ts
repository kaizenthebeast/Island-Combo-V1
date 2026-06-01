'use server'

import { createClient } from '@/lib/supabase/server'

// APPLY (lookup by code)
// Customer-facing: validates a code at checkout. Admin CRUD lives in lib/admin/voucher.ts.

export const applyVoucher = async (
  code: string,
  totalQty: number,
): Promise<{ success: boolean; voucher?: { code: string; value: number }; message?: string }> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promo')
    .select('code, value, status, expires_at, min_quantity')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data)
    return { success: false, message: 'Voucher code not found.' }

  if (data.status === 'ARCHIVED' || data.status === 'DRAFT')
    return { success: false, message: 'This voucher is not active.' }

  if (data.expires_at && new Date(data.expires_at) < new Date())
    return { success: false, message: 'This voucher has expired.' }

  if (data.min_quantity != null && totalQty < data.min_quantity)
    return { success: false, message: `This voucher requires a minimum of ${data.min_quantity} items.` }

  return { success: true, voucher: { code: data.code, value: data.value } }
}
