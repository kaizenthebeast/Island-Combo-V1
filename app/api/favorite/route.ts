import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getFavorite, addFavorite, removeFavorite } from '@/lib/favorite'
import type { AddFavoritePayload } from '@/types/favorite'

// ─── Helper ───────────────────────────────────────────────────────────────────

function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status })
}

// ─── GET /api/favorite — Fetch the current user's favorites ──────────────────
// Auth required — favorites are user-scoped.
// Returns FavoriteView[] with full product + variant detail.

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const data = await getFavorite(user.id)
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message === 'Unauthorized') return apiError('Unauthorized', 401)
    return apiError(message, 500)
  }
}

// ─── POST /api/favorite — Add a product to favorites ─────────────────────────
// Body: { product_id: number }

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: AddFavoritePayload = await req.json()
    if (!body.product_id) return apiError('product_id is required', 400)

    const result = await addFavorite(user.id, body.product_id)

    if (!result.success)
      return apiError(result.message, result.status)

    return NextResponse.json(
      { success: true, message: result.message },
      { status: result.status }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, 500)
  }
}

// ─── DELETE /api/favorite — Remove a product from favorites ──────────────────
// Body: { product_id: number }

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: { product_id: number } = await req.json()
    if (!body.product_id) return apiError('product_id is required', 400)

    const result = await removeFavorite(user.id, body.product_id)

    if (!result.success)
      return apiError(result.message, result.status)

    return NextResponse.json(
      { success: true, message: result.message },
      { status: result.status }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, 500)
  }
}