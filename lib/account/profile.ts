/** Customer profile & notification-preference access. Pure data-access: callers
 *  pass the authenticated userId (derived from the JWT at the API-route
 *  boundary); RLS on `profile`/`profile_pts` enforces the boundary. */
import { createClient } from "@/lib/supabase/server";
import type { Address } from '@/shared/types/users';
import { revalidatePath } from "next/cache";

// Shared types

export type MyAccount = {
  user_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone_text: string | null
  sex: 'Male' | 'Female' | null
  age: number | null
  role: 'customer' | 'staff' | 'admin'
  is_active: boolean
  loyalty: { total_pts: number; has_perks: boolean }
  notifications: { order_updates: boolean; promotions: boolean }
  default_address: Address | null
}

export type NotificationPrefs = { order_updates: boolean; promotions: boolean }

// CUSTOMER — PROFILE (self)
// Aggregated read + scoped self-update + notification prefs. Email and role
// are intentionally excluded — they have separate flows.

export const getMyAccount = async (userId: string, email: string | null): Promise<MyAccount> => {
  const supabase = await createClient()

  const { data: profile, error: profileErr } = await supabase
    .from('profile')
    .select('first_name, last_name, phone_text, sex, age, role, is_active, email, email_order_updates, email_promotions, loyalty_card_linked_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (profileErr) throw new Error(profileErr.message)

  const { data: pts } = await supabase
    .from('profile_pts')
    .select('total_pts')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: addr } = await supabase
    .from('addresses')
    .select('id, address, postal_code, locality, country, make_default, profile(first_name, last_name, phone_text)')
    .eq('user_id', userId)
    .eq('make_default', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const defaultAddress = addr
    ? ({
        ...addr,
        profile: Array.isArray(addr.profile) ? addr.profile[0] ?? null : addr.profile,
      } as Address)
    : null

  return {
    user_id: userId,
    email: profile?.email ?? email ?? null,
    first_name: profile?.first_name ?? null,
    last_name: profile?.last_name ?? null,
    phone_text: profile?.phone_text ?? null,
    sex: (profile?.sex as 'Male' | 'Female' | null) ?? null,
    age: profile?.age ?? null,
    role: (profile?.role as MyAccount['role']) ?? 'customer',
    is_active: profile?.is_active ?? true,
    loyalty: { total_pts: pts?.total_pts ?? 0, has_perks: !!profile?.loyalty_card_linked_at },
    notifications: {
      order_updates: profile?.email_order_updates ?? true,
      promotions: profile?.email_promotions ?? false,
    },
    default_address: defaultAddress,
  }
}

export const getMyNotificationPrefs = async (userId: string): Promise<NotificationPrefs> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profile')
    .select('email_order_updates, email_promotions')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)

  return {
    order_updates: data?.email_order_updates ?? true,
    promotions: data?.email_promotions ?? false,
  }
}

export const updateMyNotificationPrefs = async (userId: string, prefs: Partial<NotificationPrefs>) => {
  const supabase = await createClient()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (prefs.order_updates !== undefined) patch.email_order_updates = prefs.order_updates
  if (prefs.promotions    !== undefined) patch.email_promotions    = prefs.promotions

  const { error } = await supabase
    .from('profile')
    .update(patch)
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/account')
  return { success: true, status: 200, message: 'Notification preferences updated' }
}

// Self-update for the authenticated user — non-address, non-role, non-email.
export const updateMyAccount = async (userId: string, data: {
  first_name?: string | null
  last_name?: string | null
  phone_text?: string | null
  sex?: 'Male' | 'Female' | null
  age?: number | null
}) => {
  const supabase = await createClient()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.first_name !== undefined) patch.first_name = data.first_name
  if (data.last_name  !== undefined) patch.last_name  = data.last_name
  if (data.phone_text !== undefined) patch.phone_text = data.phone_text
  if (data.sex        !== undefined) patch.sex        = data.sex
  if (data.age        !== undefined) patch.age        = data.age

  const { error } = await supabase
    .from('profile')
    .update(patch)
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/account')
  return { success: true, status: 200, message: 'Profile successfully updated' }
}

// Thin slice used by forms that only need first/last/phone to prefill.
// Prefer getMyAccount() when you need the full snapshot.
export const getUserProfile = async (userId: string): Promise<{ first_name: string | null; last_name: string | null; phone_text: string | null } | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profile")
    .select("first_name, last_name, phone_text")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ?? null;
};

