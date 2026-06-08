import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { updateUser, restoreUser, softDeleteUser, deleteUser } from '@/lib/admin/users/users'
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond'

// PATCH /api/users — update a user (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const { userId, ...data } = (await req.json()) ?? {}
    if (!userId) return apiError('userId is required', HTTP.BAD_REQUEST)

    const result = await updateUser(userId, data)
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PUT /api/users — restore (reactivate) a user (admin only)
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const { userId } = (await req.json()) ?? {}
    if (!userId) return apiError('userId is required', HTTP.BAD_REQUEST)

    const result = await restoreUser(userId)
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/users — soft (default) or hard (mode:"hard") delete
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const { userId, mode } = (await req.json()) ?? {}
    if (!userId) return apiError('userId is required', HTTP.BAD_REQUEST)

    const result = mode === 'hard' ? await deleteUser(userId) : await softDeleteUser(userId)
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}
