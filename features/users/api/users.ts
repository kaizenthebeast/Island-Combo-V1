'use server'
/** Admin user & staff management. */
import { createClient } from '@/shared/lib/db/server'
import { requireAdmin } from '@/features/auth/api'
import { revalidatePath } from 'next/cache'
import { EditUserFormValues } from '@/features/account/validations/user'
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
// Admins can only edit / archive / restore existing accounts. New staff /
// admin accounts are provisioned directly in Supabase, not through the app.

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
