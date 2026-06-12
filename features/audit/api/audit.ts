// Audit-log server helpers.
//
//  • insertAuditLog() — record an app-level audit entry (logins, manual admin
//    actions). NON-BLOCKING: wrapped in try/catch and never throws, so a failed
//    audit write can never break the calling request. There is no service-role
//    client in this app — privileged writes go through the SECURITY DEFINER
//    `log_audit_event` RPC (the same pattern as log_transaction_event), which is
//    the "service-role only" insert channel for the admin-only audit_logs table.
//
//  • getAuditLogs() — admin-gated, paginated read used by both the SSR page and
//    GET /api/audit. With no `category` it returns every entity type (the
//    unified view); pass a category to narrow.
//
// This module imports the server-only Supabase client, so it must only be used
// from Server Components / route handlers (never imported into a client bundle).

import { createClient } from '@/shared/lib/db/server'
import { requireAdmin } from '@/features/auth/api'
import { ENTITY_BY_CATEGORY } from '@/features/audit/api/audit-config'
import type { AuditLog, AuditQuery } from '@/shared/types/audit'

// Expand a bare YYYY-MM-DD into a full-day UTC bound so the `to` day is inclusive.
const dayStart = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00.000Z` : d)
const dayEnd   = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T23:59:59.999Z` : d)

type GetAuditResult =
  | { success: true; data: AuditLog[]; count: number; page: number; totalPages: number }
  | { success: false; status: number; message: string }

export async function getAuditLogs(query: AuditQuery): Promise<GetAuditResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const page  = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))

  const supabase = await createClient()
  let q = supabase.from('audit_logs').select('*', { count: 'exact' })

  // No category → the unified view: every entry across all entity types.
  if (query.category === 'admins') {
    // "Any action performed by an admin account" — filter by actor role.
    const { data: admins } = await supabase.from('profile').select('user_id').eq('role', 'admin')
    const ids = (admins ?? []).map((a) => a.user_id)
    if (ids.length === 0) return { success: true, data: [], count: 0, page, totalPages: 0 }
    q = q.in('actor_id', ids)
  } else if (query.category) {
    q = q.in('entity_type', ENTITY_BY_CATEGORY[query.category])
  }

  if (query.from)       q = q.gte('created_at', dayStart(query.from))
  if (query.to)         q = q.lte('created_at', dayEnd(query.to))
  if (query.action)     q = q.eq('action', query.action)
  if (query.actorEmail) q = q.ilike('actor_email', `%${query.actorEmail}%`)

  q = q.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1)

  const { data, count, error } = await q
  if (error) return { success: false, status: 400, message: error.message }

  const total = count ?? 0
  return {
    success: true,
    data: (data ?? []) as AuditLog[],
    count: total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

export type InsertAuditInput = {
  action: string
  entityType: string
  entityId?: string | null
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  ipAddress?: string | null
  metadata?: Record<string, unknown> | null
}

// Fire-and-forget friendly: callers may omit `await` to avoid delaying the main
// response. Always resolves (never rejects).
export async function insertAuditLog(input: InsertAuditInput): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.rpc('log_audit_event', {
      p_action:      input.action,
      p_entity_type: input.entityType,
      p_entity_id:   input.entityId ?? null,
      p_old_data:    (input.oldData ?? null) as never,
      p_new_data:    (input.newData ?? null) as never,
      p_ip_address:  input.ipAddress ?? null,
      p_metadata:    (input.metadata ?? null) as never,
    })
  } catch (err) {
    // Non-blocking: auditing must never break the calling request.
    console.error('[audit] insertAuditLog failed:', err)
  }
}
