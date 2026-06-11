// Shared audit-log types. Import from here everywhere — never redefine inline.

// Audit "type" filters on the single /admin/audit page. Four map directly to an
// entity_type; 'admins' is special — it means "any action performed by an admin
// account" (filtered by actor role, not entity_type). Leaving the filter unset
// shows every entry across all types.
export type AuditCategory = 'users' | 'orders' | 'products' | 'payments' | 'admins'

export type AuditEntityType = 'user' | 'order' | 'product' | 'payment'

// One row of the public.audit_logs table.
export interface AuditLog {
  id: number
  created_at: string
  actor_id: string | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  metadata: Record<string, unknown> | null
}

// Filters accepted by getAuditLogs / GET /api/audit.
export interface AuditQuery {
  category?: AuditCategory  // omitted = all types
  page: number
  limit: number
  from?: string        // ISO date (inclusive lower bound on created_at)
  to?: string          // ISO date (inclusive upper bound on created_at)
  action?: string      // exact action match
  actorEmail?: string  // case-insensitive contains
}

// The paginated response shape returned by the API and the lib.
export interface AuditPage {
  data: AuditLog[]
  count: number
  page: number
  totalPages: number
}

// ── Security audit ────────────────────────────────────────────────────────────
// A separate, append-only log (public.security_audit_logs) for security events
// raised by unauthenticated/any callers — API rate-limit hits and failed logins.
export type SecurityEventType = 'rate_limit_exceeded' | 'login_failed'

// One row of public.security_audit_logs.
export interface SecurityAuditLog {
  id: number
  created_at: string
  event_type: SecurityEventType
  user_id: string | null      // resolved server-side; null when the account is unknown
  email: string | null        // attempted / known email
  ip_address: string | null
  user_agent: string | null
  route: string | null        // endpoint involved
  details: Record<string, unknown> | null
}

// Filters accepted by getSecurityAuditLogs / GET /api/audit/security.
export interface SecurityAuditQuery {
  eventType?: SecurityEventType  // omitted = all event types
  page: number
  limit: number
  from?: string                  // ISO date (inclusive lower bound)
  to?: string                    // ISO date (inclusive upper bound)
  search?: string                // case-insensitive contains on email OR ip_address
}
