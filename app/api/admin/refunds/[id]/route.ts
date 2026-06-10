import { NextRequest } from 'next/server'
import { processRefund } from '@/features/orders/api/refunds/refunds'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// POST /api/admin/refunds/:id   Body: { action: 'approve' | 'reject', note?, password? }
//
// Staff/admin only (enforced in the lib + the process_order_refund RPC).
// `approve` issues the real PayPal refund and requires the staff password as a
// step-up confirmation (mirrors the order-status route); `reject` just closes the
// request. Reads (the refund queue) stay SSR.
//
// 200 ok · 400 (bad action / missing password / already processed) · 401 (no token
// or wrong step-up password) · 403 (not staff) · 404 (refund not found) · 502 (PayPal).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const refundId = Number(id)
    if (!Number.isInteger(refundId) || refundId <= 0) {
      return apiError('A valid refund id is required.', HTTP.BAD_REQUEST)
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: unknown
      note?: unknown
      password?: unknown
    }
    if (body.action !== 'approve' && body.action !== 'reject') {
      return apiError("action must be 'approve' or 'reject'.", HTTP.BAD_REQUEST)
    }

    const result = await processRefund(refundId, body.action, {
      note: typeof body.note === 'string' ? body.note : undefined,
      password: typeof body.password === 'string' ? body.password : undefined,
    })
    if (!result.success) return apiError(result.message, result.status)

    return apiOk({ message: result.message })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
