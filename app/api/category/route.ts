import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/category'
import type { AddCategoryFormValues, EditCategoryFormValues } from '@/form-schema/categorySchema'

// ─── Helper ───────────────────────────────────────────────────────────────────

function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status })
}

// ─── GET /api/category — Fetch all categories (public) ───────────────────────
// Returns a flat list; parent_id = null means top-level category.
// No auth required — categories are public data.

export async function GET() {
  try {
    const data = await getCategories()
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, 500)
  }
}

// ─── POST /api/category — Create a category (admin) ──────────────────────────
// Body: AddCategoryFormValues — { name: string; subCategories?: { name: string }[] }

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: AddCategoryFormValues = await req.json()
    if (!body.name?.trim()) return apiError('Category name is required', 400)

    const result = await createCategory(body)

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

// ─── PATCH /api/category — Update a category (admin) ─────────────────────────
// Body: { id: number } & EditCategoryFormValues

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: EditCategoryFormValues & { id: number } = await req.json()

    if (!body.id)           return apiError('Category id is required', 400)
    if (!body.name?.trim()) return apiError('Category name is required', 400)

    const { id, ...rest } = body
    const result = await updateCategory(id, rest)

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

// ─── DELETE /api/category — Delete a category (admin) ────────────────────────
// Body: { id: number }

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: { id: number } = await req.json()
    if (!body.id) return apiError('Category id is required', 400)

    const result = await deleteCategory(body.id, 'category')

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