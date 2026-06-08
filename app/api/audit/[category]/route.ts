import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { HTTP, apiError, toApiError } from '@/lib/api/respond'
import { getAuditLogs } from '@/lib/audit'
import { isAuditCategory } from '@/lib/audit-config'

// GET /api/audit/:category — paginated audit logs for one category.
// Layer 2 self-protection: re-validates the admin role with the SAME guard used
// across app/api/admin routes, so the endpoint is safe even if hit directly.
// Query params: page, limit, from, to, action, actor_email.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const { category } = await params
    if (!isAuditCategory(category)) return apiError('Unknown audit category.', HTTP.BAD_REQUEST)

    const sp = req.nextUrl.searchParams
    const page  = Math.max(1, Number(sp.get('page'))  || 1)
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 20))

    const result = await getAuditLogs({
      category,
      page,
      limit,
      from:       sp.get('from')         || undefined,
      to:         sp.get('to')           || undefined,
      action:     sp.get('action')       || undefined,
      actorEmail: sp.get('actor_email')  || undefined,
    })
    if (!result.success) return apiError(result.message, result.status)

    // Consistent JSON contract for the client table/export.
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
