import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'
import { insertAuditLog } from '@/lib/audit'

// POST /api/audit/log — internal endpoint to record an app-level audit entry
// (logins, manual admin actions). Server-side use only; admin-gated with the same
// guard as the rest of the admin API. The write itself goes through the SECURITY
// DEFINER log_audit_event RPC (this app has no service-role client).
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      entity_type?: string
      entity_id?: string
      old_data?: Record<string, unknown>
      new_data?: Record<string, unknown>
      metadata?: Record<string, unknown>
    }

    if (!body.action || typeof body.action !== 'string') {
      return apiError('action is required.', HTTP.BAD_REQUEST)
    }
    if (!body.entity_type || typeof body.entity_type !== 'string') {
      return apiError('entity_type is required.', HTTP.BAD_REQUEST)
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

    await insertAuditLog({
      action:    body.action,
      entityType: body.entity_type,
      entityId:  body.entity_id ?? null,
      oldData:   body.old_data ?? null,
      newData:   body.new_data ?? null,
      ipAddress: ip,
      metadata:  body.metadata ?? null,
    })

    return apiOk({ message: 'Audit entry recorded.' }, { status: HTTP.CREATED })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
