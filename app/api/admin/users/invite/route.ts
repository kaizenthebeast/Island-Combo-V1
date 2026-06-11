import { NextRequest } from 'next/server'
import { inviteUser } from '@/features/users/api/users'
import { inviteUserSchema } from '@/features/account/validations/user'
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond'

// Admin-only staff/admin provisioning. Sends a Supabase invite email (the
// invitee sets their own password) and tags the new account's profile with the
// chosen role. Auth is enforced in the lib (requireAdmin).

// POST /api/admin/users/invite — body: InviteUserFormValues
export async function POST(req: NextRequest) {
  try {
    const parsed = inviteUserSchema.safeParse(await req.json())
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid invitation.', HTTP.BAD_REQUEST)
    }

    return apiResult(await inviteUser(parsed.data))
  } catch (error: unknown) {
    return toApiError(error)
  }
}
