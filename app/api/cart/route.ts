import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/features/auth/api'
import { waitUntil } from '@vercel/functions'
import { ratelimit } from '@/shared/lib/http/rate-limiter'
import { logSecurityEvent } from '@/features/audit/api/security'
import {
  getCartWithTotals,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  removeAllItemFromCart
} from '@/features/cart/api'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// 429 is special-cased here so we can attach a Retry-After header. When the limit
// trips we also record it to the security audit (non-blocking); the RPC
// attributes the caller from the session JWT (the same user the limiter keyed on).
async function applyRateLimit(req: NextRequest, userId: string) {
  const { success, pending } = await ratelimit.limit(userId)
  waitUntil(pending)
  if (!success) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    waitUntil(logSecurityEvent({
      eventType: 'rate_limit_exceeded',
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
      route: req.nextUrl.pathname,
      details: { method: req.method },
    }))
    return NextResponse.json(
      { success: false, message: 'Too many requests' },
      { status: HTTP.TOO_MANY, headers: { 'Retry-After': '10' } },
    )
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const blocked = await applyRateLimit(req, user.id)
    if (blocked) return blocked

    // Fetch Cart (§3.3): items + server-side totals (promo + points reflected).
    const data = await getCartWithTotals(user.id)
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const blocked = await applyRateLimit(req, user.id)
    if (blocked) return blocked

    const { variantId, quantity, selectedOption } = await req.json()
    if (!variantId || !quantity) {
      return apiError('variantId and quantity are required', HTTP.BAD_REQUEST)
    }

    const data = await addToCart({
      userId: user.id,
      variantId,
      quantity,
      selectedOption: selectedOption ?? null,
    })
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const blocked = await applyRateLimit(req, user.id)
    if (blocked) return blocked

    const { variantId, quantity } = await req.json()
    if (!variantId) return apiError('variantId is required', HTTP.BAD_REQUEST)
    if (!quantity || quantity < 1) return apiError('Quantity must be at least 1', HTTP.BAD_REQUEST)

    const data = await updateCartQuantity({
      userId: user.id,
      variantId,
      quantity,
    })
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const blocked = await applyRateLimit(req, user.id)
    if (blocked) return blocked

    const body = await req.json()
    const {variantId, clearAll} = body

    if(clearAll === true){
      await removeAllItemFromCart({userId: user.id})
      return apiOk()
    }


    if (!variantId) return apiError('variantId is required', HTTP.BAD_REQUEST)

    await removeFromCart({ userId: user.id, variantId })
    return apiOk()
  } catch (error: unknown) {
    return toApiError(error)
  }
}
