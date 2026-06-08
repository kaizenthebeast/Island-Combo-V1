// Shared audit-log types. Import from here everywhere — never redefine inline.

// The audit categories surfaced as pages under /admin/audit/[category].
// Four map directly to an entity_type; 'admins' is special — it means "any action
// performed by an admin account" (filtered by actor role, not entity_type).
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

// Filters accepted by getAuditLogs / GET /api/audit/[category].
export interface AuditQuery {
  category: AuditCategory
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
