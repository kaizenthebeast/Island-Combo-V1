import { createClient } from '@/lib/supabase/client'

/**
 * Starts the Google OAuth flow for both login and sign-up.
 *
 * If the visitor currently has an anonymous (guest) session, its id is passed
 * to /auth/callback as ?guest_id=... so the callback can merge the guest cart
 * into the authenticated account. Returns an error message on failure, else null.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const guestUserId = user?.is_anonymous ? user.id : null

  const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
  const redirectTo = guestUserId
    ? `${base}/auth/callback?guest_id=${guestUserId}`
    : `${base}/auth/callback`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  return error ? error.message : null
}
