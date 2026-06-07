'use server'
/** Admin analytics dashboard read. Staff-gated here (fast 403) and inside the
 *  admin_dashboard_stats RPC (is_staff). */

import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/auth'
import type { DashboardStats } from '@/lib/types/dashboard'

export const getDashboardStats = async (): Promise<
  { success: true; stats: DashboardStats } | { success: false; status: number; message: string }
> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_dashboard_stats')
  if (error) return { success: false, status: 400, message: error.message }
  return { success: true, stats: data as DashboardStats }
}
