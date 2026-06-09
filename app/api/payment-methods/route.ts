import { apiOk, toApiError } from '@/shared/lib/http/respond'
import { getAvailablePaymentMethods } from '@/features/payments/api/payment-methods'

// GET /api/payment-methods
// Fetch Available Payment Methods (§3.5). Open to both guests and signed-in
// users. Always returns Card (PayPal) + COD; COD is flagged unavailable when the
// caller's cart contains a digital product (§3.9).
export async function GET() {
  try {
    const result = await getAvailablePaymentMethods()
    return apiOk({ data: result })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
