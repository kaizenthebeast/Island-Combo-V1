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

// ── §2.5 Admin Customer Search (email · name · Loyalty Card Number) ───────────
// Generalizes findCustomerByEmail: matches any of email, full name, or card
// number, returning up to 20 candidates for the support/loyalty tools.
export const searchCustomers = async (
  query: string,
): Promise<{ success: true; customers: AdminCustomer[] } | { success: false; status: number; message: string }> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const q = (query ?? '').trim()
  if (!q) return { success: true, customers: [] }

  const safe = q.replace(/[\\%_,()]/g, (c) => `\\${c}`)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profile')
    .select('user_id, email, first_name, last_name, loyalty_card_number, loyalty_card_linked_at')
    .or(`email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,loyalty_card_number.ilike.%${safe}%`)
    .limit(20)

  if (error) return { success: false, status: 400, message: error.message }

  const customers: AdminCustomer[] = (data ?? []).map((d) => ({
    user_id: d.user_id,
    email: d.email,
    name: [d.first_name, d.last_name].filter(Boolean).join(' ') || '—',
    cardNumber: d.loyalty_card_number,
    verified: !!d.loyalty_card_linked_at,
  }))
  return { success: true, customers }
}

// ── §2.5 Admin Fetch Customer Profile (consolidated for support/auditing) ─────
export type CustomerOrderSummary = {
  order_id: number
  public_ref: string
  order_status: string
  total_amount: number | null
  created_at: string
}
export type CustomerVoucherSummary = {
  id: string
  code: string
  amount: number
  status: string
  created_at: string
}
export type AdminCustomerProfile = {
  user_id: string
  email: string | null
  name: string
  phone: string | null
  cardNumber: string | null
  verified: boolean
  memberSince: string | null
  pointsBalance: number
  orders: CustomerOrderSummary[]
  vouchers: CustomerVoucherSummary[]
}

export const getCustomerProfile = async (
  userId: string,
): Promise<{ success: true; profile: AdminCustomerProfile } | { success: false; status: number; message: string }> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }
  if (!userId) return { success: false, status: 400, message: 'A customer is required.' }

  const supabase = await createClient()

  // Profile, balance, recent orders and purchased vouchers — admin RLS lets these
  // through (is_admin/is_staff policies); fetched together for the audit view.
  const [profileRes, ptsRes, ordersRes, vouchersRes] = await Promise.all([
    supabase.from('profile')
      .select('user_id, email, first_name, last_name, phone_text, loyalty_card_number, loyalty_card_linked_at, created_at')
      .eq('user_id', userId).maybeSingle(),
    supabase.from('profile_pts').select('total_pts').eq('user_id', userId).maybeSingle(),
    supabase.from('orders')
      .select('order_id, public_ref, order_status, total_amount, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('cash_voucher')
      .select('id, code, amount, status, created_at')
      .eq('purchaser_id', userId).order('created_at', { ascending: false }).limit(50),
  ])

  if (profileRes.error) return { success: false, status: 400, message: profileRes.error.message }
  if (!profileRes.data)  return { success: false, status: 404, message: 'Customer not found.' }

  const p = profileRes.data
  return {
    success: true,
    profile: {
      user_id: p.user_id,
      email: p.email,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || '—',
      phone: p.phone_text ?? null,
      cardNumber: p.loyalty_card_number,
      verified: !!p.loyalty_card_linked_at,
      memberSince: p.created_at ?? null,
      pointsBalance: Number(ptsRes.data?.total_pts ?? 0),
      orders: (ordersRes.data ?? []).map((o) => ({
        order_id: Number(o.order_id),
        public_ref: o.public_ref,
        order_status: o.order_status,
        total_amount: o.total_amount,
        created_at: o.created_at,
      })),
      vouchers: (vouchersRes.data ?? []).map((v) => ({
        id: v.id,
        code: v.code,
        amount: Number(v.amount),
        status: v.status,
        created_at: v.created_at,
      })),
    },
  }
}

// ── §2.5 Admin Adjust Loyalty Points (manual +/- → auditable ledger) ─────────
// Thin wrapper over admin_adjust_points: the RPC enforces is_admin, the non-zero
// delta, the required reason, the balance lock and records the admin as `actor`.
export const adjustLoyaltyPoints = async (
  userId: string,
  delta: number,
  reason: string,
): Promise<Result> => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const d = Math.trunc(Number(delta))
  if (!userId) return { success: false, status: 400, message: 'A customer is required.' }
  if (!Number.isFinite(d) || d === 0) return { success: false, status: 400, message: 'Enter a non-zero whole number of points.' }
  if (!reason?.trim()) return { success: false, status: 400, message: 'A reason is required.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('admin_adjust_points', { p_user_id: userId, p_delta: d, p_reason: reason.trim() })
    .single<{ total_pts: number }>()

  if (error) return { success: false, status: 400, message: error.message }

  revalidatePath('/admin/customer-management/loyalty')
  return {
    success: true,
    status: 200,
    message: `Points ${d > 0 ? 'added' : 'deducted'}. New balance: ${data?.total_pts ?? '—'}.`,
    data,
  }
}
