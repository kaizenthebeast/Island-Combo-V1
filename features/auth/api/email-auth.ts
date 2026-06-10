/**
 * Email/password auth operations (sign-in, sign-up, password reset) and the
 * guest-cart merge that goes with them. All Supabase/session work lives here so
 * the API routes stay thin (validate input + shape the HTTP response).
 *
 * Not a 'use server' module: these are called only from the auth route handlers,
 * never directly from the client, so they are not exposed as server actions.
 */
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/shared/lib/db/server'
import { requireEnv } from '@/shared/config/env'

type Fail = { success: false; status: number; message: string }

// The signed JWT bundle returned to API (Bearer) clients. `accessToken` is the
// ES256 access token (carries sub/email/user_role); send it as
// `Authorization: Bearer <accessToken>`. `refreshToken` exchanges for a new
// access token at /api/auth/refresh once the access token expires.
export type TokenBundle = {
  accessToken: string
  refreshToken: string
  expiresAt: number | undefined // unix seconds when accessToken expires
  tokenType: string             // 'bearer'
}

export type LoginResult = ({ success: true; role: string; redirectTo: string } & TokenBundle) | Fail

export const loginWithEmail = async ({
  email,
  password,
  guestUserId,
}: {
  email: string
  password: string
  guestUserId?: string | null
}): Promise<LoginResult> => {
  const supabase = await createClient()

  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !signInData.session) {
    return { success: false, status: 400, message: error?.message ?? 'Login failed' }
  }

  const authUserId = signInData.session.user.id

  // Merge the guest (anonymous-session) cart into this account using THIS
  // just-authenticated client, so merge_cart's auth.uid() = the user.
  if (guestUserId && guestUserId !== authUserId) {
    const { error: mergeError } = await supabase.rpc('merge_cart', {
      p_guest_user_id: guestUserId,
      p_auth_user_id: authUserId,
    })
    if (mergeError) throw new Error(`Failed to merge cart: ${mergeError.message}`)
  }

  const { data: profile } = await supabase
    .from('profile')
    .select('role')
    .eq('user_id', authUserId)
    .single()

  const role = profile?.role ?? 'user'
  const isBackOffice = role === 'admin' || role === 'staff'
  const { session } = signInData
  return {
    success: true,
    role,
    redirectTo: isBackOffice ? '/admin/dashboard' : '/',
    // Also hand back the JWT so non-browser clients can use the Bearer API.
    // The browser ignores these and rides the cookie session set above.
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    tokenType: session.token_type,
  }
}

export type SignUpResult =
  | ({ success: true; sessionCreated: boolean; redirectTo: string } & Partial<TokenBundle>)
  | Fail

export const signUpWithEmail = async ({
  email,
  password,
  guestUserId,
}: {
  email: string
  password: string
  guestUserId?: string | null
}): Promise<SignUpResult> => {
  const supabase = await createClient()

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/sign-up-success` },
  })
  if (error) return { success: false, status: 400, message: error.message }

  const newUserId = signUpData.user?.id
  const sessionCreated = !!signUpData.session

  // With email confirmation disabled, signUp returns a session immediately, so we
  // merge in-place now (mirrors login). Non-fatal: a merge failure must not block
  // account creation. When there is no session (confirmation enabled), the route
  // defers the merge to CartMerger via a cookie.
  if (sessionCreated && guestUserId && newUserId && guestUserId !== newUserId) {
    const { error: mergeError } = await supabase.rpc('merge_cart', {
      p_guest_user_id: guestUserId,
      p_auth_user_id: newUserId,
    })
    if (mergeError) console.error('Failed to merge guest cart on signup:', mergeError.message)
  }

  // When a session exists (email confirmation disabled), return the JWT bundle
  // too so a Bearer client is logged in immediately. When confirmation is on,
  // there is no session yet — the client signs in after confirming.
  const session = signUpData.session
  return {
    success: true,
    sessionCreated,
    redirectTo: '/auth/sign-up-success',
    ...(session && {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      tokenType: session.token_type,
    }),
  }
}

// Exchanges a refresh token for a fresh access token — the renewal half of the
// Bearer API (access tokens are short-lived). Stateless: a throwaway client with
// no-op cookies, so nothing is persisted server-side. Mirrors reauth.ts's pattern.
export type RefreshResult = ({ success: true } & TokenBundle) | Fail

export const refreshAccessToken = async (refreshToken: string): Promise<RefreshResult> => {
  const supabase = createServerClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { cookies: { getAll: () => [], setAll: () => {} } },
  )

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.session) {
    return { success: false, status: 401, message: error?.message ?? 'Could not refresh session' }
  }

  const { session } = data
  return {
    success: true,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    tokenType: session.token_type,
  }
}

export const requestPasswordReset = async (
  email: string,
): Promise<{ success: true } | Fail> => {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/update-password`,
  })
  if (error) return { success: false, status: 500, message: error.message }
  return { success: true }
}
