import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/features/auth/api'
import { apiError, toApiError } from '@/shared/lib/http/respond'
import { getSecurityAuditLogs } from '@/features/audit/api/security'
import { isSecurityEventType } from '@/features/audit/api/audit-config'

// GET /api/audit/security — paginated security events (failed logins,
// rate-limit hits). Layer 2 self-protection: re-validates the admin role with
// the SAME guard as the rest of the admin API, so the endpoint is safe even if
// hit directly. Query params: event, page, limit, from, to, search.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const sp = req.nextUrl.searchParams
    const event = sp.get('event')
    const page  = Math.max(1, Number(sp.get('page'))  || 1)
    // Lib caps at 100; mirror it here so the contract is honest.
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 20))

    const result = await getSecurityAuditLogs({
      eventType: event && isSecurityEventType(event) ? event : undefined,
      page,
      limit,
      from:   sp.get('from')   || undefined,
      to:     sp.get('to')     || undefined,
      search: sp.get('search') || undefined,
    })
    if (!result.success) return apiError(result.message, result.status)

    // Consistent JSON contract for the client export.
    return NextResponse.json({
      data:       result.data,
      count:      result.count,
      page:       result.page,
      totalPages: result.totalPages,
    })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
