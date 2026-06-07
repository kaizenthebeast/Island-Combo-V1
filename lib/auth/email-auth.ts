/**
 * Email/password auth operations (sign-in, sign-up, password reset) and the
 * guest-cart merge that goes with them. All Supabase/session work lives here so
 * the API routes stay thin (validate input + shape the HTTP response).
 *
 * Not a 'use server' module: these are called only from the auth route handlers,
 * never directly from the client, so they are not exposed as server actions.
 */
import { createClient } from '@/lib/supabase/server'

type Fail = { success: false; status: number; message: string }

export type LoginResult = { success: true; role: string; redirectTo: string } | Fail

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
  return { success: true, role, redirectTo: isBackOffice ? '/admin/dashboard' : '/' }
}

export type SignUpResult =
  | { success: true; sessionCreated: boolean; redirectTo: string }
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

  return { success: true, sessionCreated, redirectTo: '/auth/sign-up-success' }
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
