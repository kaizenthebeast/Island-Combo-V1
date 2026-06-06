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

// ADMIN CUSTOMER SEARCH (Flow D, step 1) — find a customer by exact email.
export type AdminCustomer = {
  user_id: string
  email: string | null
  name: string
  cardNumber: string | null
  verified: boolean
}

export const findCustomerByEmail = async (
  email: string,
): Promise<{ success: true; customer: AdminCustomer | null } | { success: false; status: number; message: string }> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const e = (email ?? '').trim().toLowerCase()
  if (!e) return { success: false, status: 400, message: 'Enter an email to search.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profile')
    .select('user_id, email, first_name, last_name, loyalty_card_number, loyalty_card_linked_at')
    .eq('email', e)
    .maybeSingle()

  if (error) return { success: false, status: 400, message: error.message }
  if (!data) return { success: true, customer: null }

  return {
    success: true,
    customer: {
      user_id: data.user_id,
      email: data.email,
      name: [data.first_name, data.last_name].filter(Boolean).join(' ') || '—',
      cardNumber: data.loyalty_card_number,
      verified: !!data.loyalty_card_linked_at,
    },
  }
}

// LINK (Flow D, steps 2–3) — set the physical card ID on the profile and mark the
// customer a Verified Cardholder (has_perks on). The entered physical card number
// becomes the member's loyalty_card_number.
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
      return { success: false, status: 409, message: 'That card number is already assigned to another customer.' }
    }
    return { success: false, status: 400, message: error.message }
  }

  revalidatePath('/admin/customer-management/loyalty')
  return { success: true, status: 200, message: 'Card linked — customer is now a Verified Cardholder.' }
}

// UNLINK — revoke Verified Cardholder status. The permanent loyalty_card_number
// stays (it's NOT NULL); only the linked timestamp is cleared.
export const unlinkLoyaltyCard = async (userId: string): Promise<Result> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }
  if (!userId) return { success: false, status: 400, message: 'A customer is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profile')
    .update({ loyalty_card_linked_at: null })
    .eq('user_id', userId)

  if (error) return { success: false, status: 400, message: error.message }

  revalidatePath('/admin/customer-management/loyalty')
  return { success: true, status: 200, message: 'Cardholder status revoked.' }
}

// LOYVERSE CARD MIGRATION — bulk-import the store's already-generated cards and
// their balances into the staging table. Customers later CLAIM a card from the
// web app (claim_loyverse_card), which credits the points exactly once. Safe to
// re-run: upserts by card_number and never touches a card's claimed state.
export type LoyverseCardEntry = { cardNumber: string; points: number; name?: string | null; email?: string | null }

export const importLoyverseCards = async (entries: LoyverseCardEntry[]): Promise<Result> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }
  if (!Array.isArray(entries) || entries.length === 0) {
    return { success: false, status: 400, message: 'No cards to import.' }
  }

  const seen = new Set<string>()
  const rows: { card_number: string; points: number; customer_name: string | null; email: string | null }[] = []
  let skipped = 0
  for (const e of entries) {
    const card = (e.cardNumber ?? '').trim()
    const points = Math.floor(Number(e.points))
    if (!card || !Number.isFinite(points) || points < 0 || seen.has(card)) { skipped++; continue }
    seen.add(card)
    rows.push({
      card_number: card,
      points,
      customer_name: e.name?.trim() || null,
      email: e.email?.trim().toLowerCase() || null,
    })
  }
  if (rows.length === 0) return { success: false, status: 400, message: 'No valid cards to import.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('loyverse_card')
    .upsert(rows, { onConflict: 'card_number' }) // updates points/name/email; preserves claimed_*
  if (error) return { success: false, status: 400, message: error.message }

  revalidatePath('/admin/customer-management/loyalty')
  return {
    success: true,
    status: 200,
    message: `Imported ${rows.length} card${rows.length === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.`,
    data: { imported: rows.length, skipped },
  }
}

// LIST — the migrated cards for the admin migration screen.
export type LoyverseCardRow = {
  id: number
  card_number: string
  points: number
  customer_name: string | null
  email: string | null
  claimed_by: string | null
  claimed_at: string | null
  created_at: string
}

export const getLoyverseCards = async (): Promise<
  { success: true; rows: LoyverseCardRow[] } | { success: false; status: number; message: string }
> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('loyverse_card')
    .select('id, card_number, points, customer_name, email, claimed_by, claimed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return { success: false, status: 400, message: error.message }
  return { success: true, rows: (data ?? []) as LoyverseCardRow[] }
}
