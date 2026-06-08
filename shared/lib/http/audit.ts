// Typed connector for the audit API — mirrors GET /api/audit/[category] 1:1.
// Example of the lib/api/ connector pattern: one typed function per route,
// built on the shared client. New connectors (cart, orders, …) follow the same
// shape and can be adopted incrementally by client components.

import { apiFetch } from './client'
import type { AuditCategory, AuditPage } from '@/shared/types/audit'

export type AuditQueryParams = {
  page?: number
  limit?: number
  from?: string
  to?: string
  action?: string
  actorEmail?: string
}

export const getAuditLogs = (
  category: AuditCategory,
  params: AuditQueryParams = {},
): Promise<AuditPage> => {
  const sp = new URLSearchParams()
  if (params.page)       sp.set('page', String(params.page))
  if (params.limit)      sp.set('limit', String(params.limit))
  if (params.from)       sp.set('from', params.from)
  if (params.to)         sp.set('to', params.to)
  if (params.action)     sp.set('action', params.action)
  if (params.actorEmail) sp.set('actor_email', params.actorEmail)
  const qs = sp.toString()
  return apiFetch<AuditPage>(`/api/audit/${category}${qs ? `?${qs}` : ''}`)
}
