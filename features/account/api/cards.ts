'use server'
/** Saved payment cards — PCI-safe metadata only.
 *
 *  This layer NEVER receives or stores the full card number (PAN) or the CVV.
 *  The client form derives `brand` + `last4` and sends only display metadata.
 *  Ownership is enforced by RLS on public.payment_cards (user_id = auth.uid()).
 */
import { createClient } from '@/shared/lib/db/server'
import { requireUser } from '@/features/auth/api'
import { revalidatePath } from 'next/cache'

export type SavedCard = {
  id: number
  cardholder_name: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  is_active: boolean
  created_at: string
}

export type NewCardInput = {
  cardholder_name: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

type Result = { success: true } | { success: false; message: string }

const COLS = 'id, cardholder_name, brand, last4, exp_month, exp_year, is_active, created_at'

export async function getMyCards(): Promise<SavedCard[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payment_cards')
    .select(COLS)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as SavedCard[]
}

export async function addCard(input: NewCardInput): Promise<Result> {
  const user = await requireUser()
  if (!user) return { success: false, message: 'Not authenticated' }

  // Hard guard: refuse anything that isn't safe metadata, so a full PAN/CVV can
  // never slip into the table even if a caller misbehaves.
  if (!/^[0-9]{4}$/.test(input.last4)) return { success: false, message: 'Invalid card details.' }
  if (!input.cardholder_name?.trim()) return { success: false, message: 'Name on card is required.' }
  if (input.exp_month < 1 || input.exp_month > 12) return { success: false, message: 'Invalid expiry.' }

  const supabase = await createClient()

  // First card a user saves becomes the active (default) one.
  const { count } = await supabase
    .from('payment_cards')
    .select('id', { count: 'exact', head: true })

  const { error } = await supabase.from('payment_cards').insert({
    cardholder_name: input.cardholder_name.trim().slice(0, 80),
    brand: input.brand,
    last4: input.last4,
    exp_month: input.exp_month,
    exp_year: input.exp_year,
    is_active: (count ?? 0) === 0,
  })
  if (error) return { success: false, message: error.message }

  revalidatePath('/account')
  return { success: true }
}

export async function setActiveCard(cardId: number): Promise<Result> {
  const user = await requireUser()
  if (!user) return { success: false, message: 'Not authenticated' }

  const supabase = await createClient()
  // Clear the current active card first (RLS scopes both updates to this user),
  // then activate the chosen one — false→true order avoids the unique-index clash.
  await supabase.from('payment_cards').update({ is_active: false }).eq('is_active', true)
  const { error } = await supabase.from('payment_cards').update({ is_active: true }).eq('id', cardId)
  if (error) return { success: false, message: error.message }

  revalidatePath('/account')
  return { success: true }
}

export async function removeCard(cardId: number): Promise<Result> {
  const user = await requireUser()
  if (!user) return { success: false, message: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase.from('payment_cards').delete().eq('id', cardId)
  if (error) return { success: false, message: error.message }

  revalidatePath('/account')
  return { success: true }
}
