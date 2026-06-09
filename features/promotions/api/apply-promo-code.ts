'use server'
/** Customer-facing promo-code validation at checkout. */

import { createClient } from '@/shared/lib/db/server'

// APPLY (lookup by code)
// Customer-facing: validates a code at checkout. Admin CRUD lives in
// lib/admin/promotional-codes/promo-code.ts.

export const applyPromoCode = async (
  code: string,
  totalQty: number,
): Promise<{ success: boolean; promoCode?: { code: string; value: number }; message?: string }> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promo')
    .select('code, value, status, expires_at, min_quantity')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data)
    return { success: false, message: 'Promo code not found.' }

  if (data.status === 'ARCHIVED' || data.status === 'DRAFT')
    return { success: false, message: 'This promo code is not active.' }

  if (data.expires_at && new Date(data.expires_at) < new Date())
    return { success: false, message: 'This promo code has expired.' }

  if (data.min_quantity != null && totalQty < data.min_quantity)
    return { success: false, message: `This promo code requires a minimum of ${data.min_quantity} items.` }

  return { success: true, promoCode: { code: data.code, value: data.value } }
}
