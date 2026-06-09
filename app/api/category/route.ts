import { NextRequest } from 'next/server'
import { requireAdmin } from '@/features/auth/api'
import { getCategories } from '@/features/categories/api/category'
import {
  createCategory,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
} from '@/features/categories/api/admin/category'
import type { AddCategoryFormValues, EditCategoryFormValues } from '@/features/categories/validations/category'
import { HTTP, apiOk, apiError, apiResult, toApiError } from '@/shared/lib/http/respond'

// GET /api/category

export async function GET() {
  try {
    const data = await getCategories()
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// POST /api/category

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body: AddCategoryFormValues = await req.json()
    if (!body.name?.trim()) return apiError('Category name is required', HTTP.BAD_REQUEST)

    return apiResult(await createCategory(body))
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PATCH /api/category

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body: EditCategoryFormValues & { id: number } = await req.json()
    if (!body.id)           return apiError('Category id is required',   HTTP.BAD_REQUEST)
    if (!body.name?.trim()) return apiError('Category name is required', HTTP.BAD_REQUEST)

    const { id, ...rest } = body
    return apiResult(await updateCategory(id, rest))
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PUT /api/category — Restore an archived category (admin)

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body: { id: number } = await req.json()
    if (!body.id) return apiError('Category id is required', HTTP.BAD_REQUEST)

    await restoreCategory(body.id)
    return apiOk({ message: 'Category restored' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/category — Soft delete a category (admin)

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body: { id: number } = await req.json()
    if (!body.id) return apiError('Category id is required', HTTP.BAD_REQUEST)

    await softDeleteCategory(body.id)
    return apiOk({ message: 'Category archived' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
