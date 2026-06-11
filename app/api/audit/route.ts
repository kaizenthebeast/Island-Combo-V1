import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/features/auth/api'
import { apiError, toApiError } from '@/shared/lib/http/respond'
import { getAuditLogs } from '@/features/audit/api/audit'
import { isAuditCategory } from '@/features/audit/api/audit-config'

// GET /api/audit — paginated audit logs across every entity type.
// Layer 2 self-protection: re-validates the admin role with the SAME guard used
// across app/api/admin routes, so the endpoint is safe even if hit directly.
// Query params: type (optional category filter), page, limit, from, to, action,
// actor_email.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const sp = req.nextUrl.searchParams
    const type  = sp.get('type')
    const page  = Math.max(1, Number(sp.get('page'))  || 1)
    // Lib caps at 100; mirror it here so the contract is honest.
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 20))

    const result = await getAuditLogs({
      category:   type && isAuditCategory(type) ? type : undefined,
      page,
      limit,
      from:       sp.get('from')         || undefined,
      to:         sp.get('to')           || undefined,
      action:     sp.get('action')       || undefined,
      actorEmail: sp.get('actor_email')  || undefined,
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
