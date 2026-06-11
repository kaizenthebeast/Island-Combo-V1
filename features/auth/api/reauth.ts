'use server'
/** Step-up re-authentication: confirm the CURRENT user's password before a
 *  sensitive action (e.g. an order status change). */

import { createServerClient } from '@supabase/ssr'
import { headers } from 'next/headers'
import { requireUser } from '@/features/auth/api/guards'
import { logSecurityEvent } from '@/features/audit/api/security'
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

  // Security audit: failing a step-up password check on a LIVE session is a
  // strong signal (e.g. a hijacked session probing a sensitive action). Awaited
  // (never throws) because server actions have no waitUntil context.
  if (error) {
    const h = await headers()
    await logSecurityEvent({
      eventType: 'login_failed',
      email: user.email,
      ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: h.get('user-agent'),
      route: 'reauth',
      details: { reason: error.message, context: 'step-up reauthentication' },
    })
  }

  return !error
}
