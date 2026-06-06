'use server'
/** Back-office loyalty admin: link/unlink a physical loyalty card (§3.8 perks)
 *  and the idempotent Loyverse points importer (§3.8 migration). All writes are
 *  authorized by is_admin RLS on profile / profile_pts / the points ledger; the
 *  requireAdmin guard gives a clean 403 (these are 'use server' entry points). */
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type Result =
  | { success: true; status: number; message: string; data?: unknown }
  | { success: false; status: number; message: string }

// LINK — attach a physical loyalty card to a customer; flips has_perks on.
export const linkLoyaltyCard = async (userId: string, cardNumber: string): Promise<Result> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const card = (cardNumber ?? '').trim()
  if (!userId || !card) {
    return { success: false, status: 400, message: 'A customer and a card number are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profile')
    .update({ loyalty_card_number: card, loyalty_card_linked_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    if (error.code === '23505') {
      return { success: false, status: 409, message: 'That loyalty card is already linked to another customer.' }
    }
    return { success: false, status: 400, message: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'Loyalty card linked.' }
}

// UNLINK — detach the card; has_perks goes back off.
export const unlinkLoyaltyCard = async (userId: string): Promise<Result> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }
  if (!userId) return { success: false, status: 400, message: 'A customer is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profile')
    .update({ loyalty_card_number: null, loyalty_card_linked_at: null })
    .eq('user_id', userId)

  if (error) return { success: false, status: 400, message: error.message }

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'Loyalty card unlinked.' }
}

// LOYVERSE IMPORT — credit legacy POS balances exactly once per customer.
// Matches each entry to a profile by loyalty card number (preferred) or email,
// and skips anyone who already has a 'loyverse_import' ledger row, so re-running
// is safe (idempotent). All accrued points are preserved with no expiry (§3.8).
export type LoyverseImportEntry = { cardNumber?: string | null; email?: string | null; points: number }

export const importLoyaltyPoints = async (entries: LoyverseImportEntry[]): Promise<Result> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }
  if (!Array.isArray(entries) || entries.length === 0) {
    return { success: false, status: 400, message: 'No entries to import.' }
  }

  const supabase = await createClient()
  let imported = 0
  let skipped = 0
  let unmatched = 0

  for (const entry of entries) {
    const points = Math.floor(Number(entry.points))
    if (!Number.isFinite(points) || points <= 0) { skipped++; continue }

    // Resolve the customer: card number first, then email.
    let userId: string | null = null
    const card = entry.cardNumber?.trim()
    if (card) {
      const { data } = await supabase.from('profile').select('user_id').eq('loyalty_card_number', card).maybeSingle()
      userId = data?.user_id ?? null
    }
    const email = entry.email?.trim().toLowerCase()
    if (!userId && email) {
      const { data } = await supabase.from('profile').select('user_id').eq('email', email).maybeSingle()
      userId = data?.user_id ?? null
    }
    if (!userId) { unmatched++; continue }

    // Idempotency: one import credit per customer.
    const { data: existing } = await supabase
      .from('profile_pts_transaction_records')
      .select('id')
      .eq('user_id', userId)
      .eq('reason', 'loyverse_import')
      .limit(1)
      .maybeSingle()
    if (existing) { skipped++; continue }

    const { error: ledgerErr } = await supabase
      .from('profile_pts_transaction_records')
      .insert({ user_id: userId, points, reason: 'loyverse_import' })
    if (ledgerErr) { skipped++; continue }

    const { data: bal } = await supabase.from('profile_pts').select('total_pts').eq('user_id', userId).maybeSingle()
    if (bal) {
      await supabase.from('profile_pts').update({ total_pts: (bal.total_pts ?? 0) + points }).eq('user_id', userId)
    } else {
      await supabase.from('profile_pts').insert({ user_id: userId, total_pts: points })
    }
    imported++
  }

  return {
    success: true,
    status: 200,
    message: `Imported ${imported}, skipped ${skipped}, unmatched ${unmatched}.`,
    data: { imported, skipped, unmatched },
  }
}
