import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import {
  getCategories,
  createCategory,
  updateCategory,
  softDeleteCategory, 
  restoreCategory,    
} from '@/lib/category'
import type { AddCategoryFormValues, EditCategoryFormValues } from '@/form-schema/categorySchema'

function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status })
}

// ─── GET /api/category ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const data = await getCategories()
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, 500)
  }
}

// ─── POST /api/category ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: AddCategoryFormValues = await req.json()
    if (!body.name?.trim()) return apiError('Category name is required', 400)

    const result = await createCategory(body)
    if (!result.success) return apiError(result.message, result.status)

    return NextResponse.json({ success: true, message: result.message }, { status: result.status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, 500)
  }
}

// ─── PATCH /api/category ──────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: EditCategoryFormValues & { id: number } = await req.json()
    if (!body.id)           return apiError('Category id is required', 400)
    if (!body.name?.trim()) return apiError('Category name is required', 400)

    const { id, ...rest } = body
    const result = await updateCategory(id, rest)
    if (!result.success) return apiError(result.message, result.status)

    return NextResponse.json({ success: true, message: result.message }, { status: result.status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, 500)
  }
}

// ─── PUT /api/category — Restore an archived category (admin) ────────────────

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: { id: number } = await req.json()
    if (!body.id) return apiError('Category id is required', 400)

    await restoreCategory(body.id)

    return NextResponse.json({ success: true, message: 'Category restored' }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, 500)
  }
}

// ─── DELETE /api/category — Soft delete a category (admin) ───────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: { id: number } = await req.json()
    if (!body.id) return apiError('Category id is required', 400)

    await softDeleteCategory(body.id) // throws on error, returns id on success

    return NextResponse.json({ success: true, message: 'Category archived' }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, 500)
  }
}