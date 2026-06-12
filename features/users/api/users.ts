'use server'
/** Admin user & staff management. */
import { createClient } from '@/shared/lib/db/server'
import { requireAdmin } from '@/features/auth/api'
import { revalidatePath } from 'next/cache'
import { getSiteUrl } from '@/shared/config/env'
import { EditUserFormValues, InviteUserFormValues } from '@/features/account/validations/user'
import { escapeIlike, type PaginatedInput, type PaginatedResult } from '@/shared/lib/admin/shared'

// PAGINATED READS (users + staff)

export type UsersSortKey = 'full_name' | 'email' | 'role' | 'total_points' | 'member_since'

export const getUsersPage = async (
  input: PaginatedInput<UsersSortKey>,
): Promise<PaginatedResult<unknown>> => {
  const supabase = await createClient()

  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const {
    page,
    pageSize,
    search,
    filter,
    sortKey = 'member_since',
    sortDir = 'desc',
  } = input

  let query = supabase
    .from('admin_user_mv')
    .select('*', { count: 'exact' })

  if (filter && filter !== 'All') {
    query = query.eq('role', filter)
  }

  const q = search?.trim()
  if (q) {
    const safe = escapeIlike(q)
    query = query.or(
      `full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone_text.ilike.%${safe}%`,
    )
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.order(sortKey, { ascending: sortDir === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 200, rows: data ?? [], total: count ?? 0 }
}

export type StaffSortKey = 'full_name' | 'email' | 'role' | 'member_since'

export const getStaffPage = async (
  input: PaginatedInput<StaffSortKey>,
): Promise<PaginatedResult<unknown>> => {
  const supabase = await createClient()

  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const {
    page,
    pageSize,
    search,
    filter,
    sortKey = 'member_since',
    sortDir = 'desc',
  } = input

  let query = supabase
    .from('admin_staff_mv')
    .select('*', { count: 'exact' })

  // The status filter maps to is_active.
  if (filter === 'ACTIVE')   query = query.eq('is_active', true)
  if (filter === 'INACTIVE') query = query.eq('is_active', false)

  const q = search?.trim()
  if (q) {
    const safe = escapeIlike(q)
    query = query.or(
      `full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone_text.ilike.%${safe}%`,
    )
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.order(sortKey, { ascending: sortDir === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 200, rows: data ?? [], total: count ?? 0 }
}

// MUTATIONS
// Admins can edit / archive / restore existing accounts and provision new
// staff/admin accounts via email invite (inviteUser below).

// Invite a new back-office account (role: staff | admin). Admin-only.
//
// Delegates to the `invite-user` Edge Function: the privileged work
// (inviteUserByEmail + profile-role insert + rollback) runs there with the
// platform-injected service key, so this app never holds a secret key. The
// session client forwards the calling admin's JWT; the function independently
// re-verifies the admin role before doing anything.
type InviteFnResult = { ok: boolean; error?: string; code?: string }

export const inviteUser = async (data: InviteUserFormValues) => {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const supabase = await createClient()
  const { data: result, error } = await supabase.functions.invoke<InviteFnResult>('invite-user', {
    body: {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      // The invite email's landing page (GoTrue enforces its redirect allow-list).
      redirect_to: `${getSiteUrl()}/auth/update-password`,
    },
  })

  // Non-2xx → FunctionsHttpError carrying the Response; surface its message.
  if (error) {
    const ctx = (error as { context?: Response }).context
    const body = ctx ? await ctx.json().catch(() => null) as InviteFnResult | null : null
    return {
      success: false,
      status: ctx?.status ?? 500,
      message: body?.error ?? 'Failed to send the invitation.',
    }
  }

  // 200 with ok:false = handled refusal (e.g. the email already has an account).
  if (!result?.ok) {
    return {
      success: false,
      status: result?.code === 'email_exists' ? 409 : 500,
      message: result?.error ?? 'Failed to send the invitation.',
    }
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/users/staff')
  return { success: true, status: 201, message: `Invitation sent to ${data.email}` }
}

export const updateUser = async (userId: string, data: EditUserFormValues) => {
  const supabase = await createClient()

  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const { error } = await supabase
    .from('profile')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone_text: data.phone_text ?? null,
      sex: data.sex ?? null,
      age: data.age ?? null,
      role: data.role,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'User successfully updated' }
}

export const deleteUser = async (userId: string) => {
  const supabase = await createClient()

  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  // Friendly pre-check only — the BEFORE DELETE trigger (migration 0055) is
  // the authoritative, race-safe gate and also covers NULL-status orders.
  const { count, error: openOrdersError } = await supabase
    .from('orders')
    .select('order_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('order_status', 'in', '(completed,cancelled)')

  if (openOrdersError) return { success: false, status: 403, message: openOrdersError.message }
  if ((count ?? 0) > 0) {
    return {
      success: false,
      status: 409,
      message: `Cannot delete: this user still has ${count} open order(s). Complete or cancel them first, or deactivate the account instead.`,
    }
  }

  const { error } = await supabase
    .from('profile')
    .delete()
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'User successfully deleted' }
}

export const softDeleteUser = async (userId: string) => {
  const supabase = await createClient()

  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const { error } = await supabase
    .from('profile')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'User successfully deactivated' }
}

export const restoreUser = async (userId: string) => {
  const supabase = await createClient()

  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const { error } = await supabase
    .from('profile')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'User successfully restored' }
}
