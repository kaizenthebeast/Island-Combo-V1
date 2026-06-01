'use server'
import { createClient } from "@/lib/supabase/server";
import type { Address } from '@/types/users';
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

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
  loyalty: { total_pts: number }
  notifications: { order_updates: boolean; promotions: boolean }
  default_address: Address | null
}

export type NotificationPrefs = { order_updates: boolean; promotions: boolean }

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER — PROFILE (self)
// Aggregated read + scoped self-update + notification prefs. Email and role
// are intentionally excluded — they have separate flows.
// ─────────────────────────────────────────────────────────────────────────────

export const getMyAccount = async (): Promise<MyAccount> => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile, error: profileErr } = await supabase
    .from('profile')
    .select('first_name, last_name, phone_text, sex, age, role, is_active, email, email_order_updates, email_promotions')
    .eq('user_id', user.id)
    .maybeSingle()
  if (profileErr) throw new Error(profileErr.message)

  const { data: pts } = await supabase
    .from('profile_pts')
    .select('total_pts')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: addr } = await supabase
    .from('addresses')
    .select('id, address, postal_code, locality, country, make_default, profile(first_name, last_name, phone_text)')
    .eq('user_id', user.id)
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
    user_id: user.id,
    email: profile?.email ?? user.email ?? null,
    first_name: profile?.first_name ?? null,
    last_name: profile?.last_name ?? null,
    phone_text: profile?.phone_text ?? null,
    sex: (profile?.sex as 'Male' | 'Female' | null) ?? null,
    age: profile?.age ?? null,
    role: (profile?.role as MyAccount['role']) ?? 'customer',
    is_active: profile?.is_active ?? true,
    loyalty: { total_pts: pts?.total_pts ?? 0 },
    notifications: {
      order_updates: profile?.email_order_updates ?? true,
      promotions: profile?.email_promotions ?? false,
    },
    default_address: defaultAddress,
  }
}

export const getMyNotificationPrefs = async (): Promise<NotificationPrefs> => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('profile')
    .select('email_order_updates, email_promotions')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)

  return {
    order_updates: data?.email_order_updates ?? true,
    promotions: data?.email_promotions ?? false,
  }
}

export const updateMyNotificationPrefs = async (prefs: Partial<NotificationPrefs>) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (prefs.order_updates !== undefined) patch.email_order_updates = prefs.order_updates
  if (prefs.promotions    !== undefined) patch.email_promotions    = prefs.promotions

  const { error } = await supabase
    .from('profile')
    .update(patch)
    .eq('user_id', user.id)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/user/details')
  return { success: true, status: 200, message: 'Notification preferences updated' }
}

// Self-update for the authenticated user — non-address, non-role, non-email.
export const updateMyAccount = async (data: {
  first_name?: string | null
  last_name?: string | null
  phone_text?: string | null
  sex?: 'Male' | 'Female' | null
  age?: number | null
}) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.first_name !== undefined) patch.first_name = data.first_name
  if (data.last_name  !== undefined) patch.last_name  = data.last_name
  if (data.phone_text !== undefined) patch.phone_text = data.phone_text
  if (data.sex        !== undefined) patch.sex        = data.sex
  if (data.age        !== undefined) patch.age        = data.age

  const { error } = await supabase
    .from('profile')
    .update(patch)
    .eq('user_id', user.id)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/user/details')
  return { success: true, status: 200, message: 'Profile successfully updated' }
}

// Thin slice used by forms that only need first/last/phone to prefill.
// Prefer getMyAccount() when you need the full snapshot.
export const getUserProfile = async (): Promise<{ first_name: string | null; last_name: string | null; phone_text: string | null } | null> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from("profile")
    .select("first_name, last_name, phone_text")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ?? null;
};

