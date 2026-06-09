'use server'
/** Step-up re-authentication: confirm the CURRENT user's password before a
 *  sensitive action (e.g. an order status change). */

import { createServerClient } from '@supabase/ssr'
import { requireUser } from '@/features/auth/api/guards'
import { requireEnv } from '@/shared/config/env'

// Verifies the signed-in user's password WITHOUT touching their session: a
// throwaway client with no-op cookies signs in only to validate the credential,
// then the in-memory session is discarded (nothing is written to cookies). Returns
// true when the password is correct.
export const verifyCurrentUserPassword = async (password: string): Promise<boolean> => {
  const user = await requireUser()
  if (!user?.email || !password) return false

  const supabase = createServerClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { cookies: { getAll: () => [], setAll: () => {} } },
  )

  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password })
  return !error
}
