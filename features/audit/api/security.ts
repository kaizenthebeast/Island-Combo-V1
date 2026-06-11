// Security-audit server helpers.
//
//  • logSecurityEvent() — record a security event (rate-limit hit, failed login)
//    via the SECURITY DEFINER `log_security_event` RPC, called with the normal
//    session client (no secret key in this app — privileged work lives in Edge
//    Functions). The RPC never accepts a caller-supplied user_id, so attribution
//    can't be forged: failed logins are resolved by email inside the RPC;
//    rate-limit hits use auth.uid() from the caller's verified JWT. NON-BLOCKING:
//    wrapped in try/catch and never throws, so a logging failure can't break the
//    request it is observing.
//
//  • getSecurityAuditLogs() — admin-gated, paginated read for the SSR page and
//    GET /api/audit/security.
//
// Server-only (imports the server Supabase client): use from route handlers /
// Server Components, never a client bundle.

import { createClient } from '@/shared/lib/db/server'
import { requireAdmin } from '@/features/auth/api'
import { escapeIlike } from '@/shared/lib/admin/shared'
import type {
  SecurityAuditLog,
  SecurityAuditQuery,
  SecurityEventType,
} from '@/shared/types/audit'

// Expand a bare YYYY-MM-DD into a full-day UTC bound so the `to` day is inclusive.
const dayStart = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00.000Z` : d)
const dayEnd   = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T23:59:59.999Z` : d)

type GetSecurityResult =
  | { success: true; data: SecurityAuditLog[]; count: number; page: number; totalPages: number }
  | { success: false; status: number; message: string }

export async function getSecurityAuditLogs(query: SecurityAuditQuery): Promise<GetSecurityResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const page  = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))

  const supabase = await createClient()
  let q = supabase.from('security_audit_logs').select('*', { count: 'exact' })

  if (query.eventType) q = q.eq('event_type', query.eventType)
  if (query.from)      q = q.gte('created_at', dayStart(query.from))
  if (query.to)        q = q.lte('created_at', dayEnd(query.to))

  const search = query.search?.trim()
  if (search) {
    const safe = escapeIlike(search)
    q = q.or(`email.ilike.%${safe}%,ip_address.ilike.%${safe}%`)
  }

  q = q.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1)

  const { data, count, error } = await q
  if (error) return { success: false, status: 400, message: error.message }

  const total = count ?? 0
  return {
    success: true,
    data: (data ?? []) as SecurityAuditLog[],
    count: total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

export type LogSecurityEventInput = {
  eventType: SecurityEventType
  email?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  route?: string | null
  details?: Record<string, unknown> | null
}

// Fire-and-forget friendly: callers may wrap in waitUntil() to avoid delaying the
// main response. Always resolves (never rejects). Call with the request's own
// auth context — for rate-limit events the RPC attributes auth.uid() from the
// session JWT; user_id is never accepted from the caller.
export async function logSecurityEvent(input: LogSecurityEventInput): Promise<void> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('log_security_event', {
      p_event_type: input.eventType,
      p_email:      input.email ?? null,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_route:      input.route ?? null,
      p_details:    (input.details ?? null) as never,
    })
    if (error) throw new Error(error.message)
  } catch (err) {
    // Non-blocking: security logging must never break the calling request.
    console.error('[security-audit] logSecurityEvent failed:', err)
  }
}
