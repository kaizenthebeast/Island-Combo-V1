import { NextRequest } from 'next/server'
import {
  createPromoCode,
  updatePromoCode,
  archivePromoCode,
  restorePromoCode,
} from '@/features/promotions/api/admin/promo-code'
import { addPromoCodeSchema, editPromoCodeSchema } from '@/features/promotions/validations/promo-code'
import { HTTP, apiOk, apiError, apiResult, toApiError } from '@/shared/lib/http/respond'

// Admin-only promo-code CRUD. Distinct from POST /api/promo, which APPLIES a code
// to the cart. Auth is enforced in the lib (assertAdmin). Reads (getPromoCodes /
// getPromoCodesPage) stay SSR — no GET here.

// POST /api/admin/promo-code — create. Body: AddPromoCodeFormValues
export async function POST(req: NextRequest) {
  try {
    const parsed = addPromoCodeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid promo code.', HTTP.BAD_REQUEST)
    }

    return apiResult(await createPromoCode(parsed.data))
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PATCH /api/admin/promo-code — update. Body: { id } & EditPromoCodeFormValues
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...rest } = (await req.json()) as { id?: unknown }
    if (typeof id !== 'number') return apiError('A numeric promo-code id is required.', HTTP.BAD_REQUEST)

    const parsed = editPromoCodeSchema.safeParse(rest)
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid promo code.', HTTP.BAD_REQUEST)
    }

    return apiResult(await updatePromoCode(id, parsed.data))
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/admin/promo-code — archive (soft). Body: { id }
export async function DELETE(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: unknown }
    if (typeof id !== 'number') return apiError('A numeric promo-code id is required.', HTTP.BAD_REQUEST)

    await archivePromoCode(id)
    return apiOk({ data: { id }, message: 'Promo code archived.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PUT /api/admin/promo-code — restore an archived code. Body: { id }
export async function PUT(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: unknown }
    if (typeof id !== 'number') return apiError('A numeric promo-code id is required.', HTTP.BAD_REQUEST)

    await restorePromoCode(id)
    return apiOk({ data: { id }, message: 'Promo code restored.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
