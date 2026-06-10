import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { requireEnv } from "@/shared/config/env";

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Per-request Supabase client.
 *
 * Two authentication modes, chosen by the incoming request:
 *
 *  1. Bearer (standard token API) — if the request carries
 *     `Authorization: Bearer <jwt>`, the client authenticates statelessly with
 *     that token: PostgREST receives the JWT so RLS `auth.uid()` resolves to the
 *     token's user, and no cookies are read or written. The token's signature
 *     and expiry are verified in the auth guards via `getClaims(token)`.
 *
 *  2. Cookie (browser / SSR) — the default. The session lives in the
 *     `@supabase/ssr` cookies, marked Secure in production.
 *
 * Because every lib DB call goes through this one factory, the whole data layer
 * works under either mode without per-route changes.
 */
export async function createClient() {
  const url = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  const authHeader = (await headers()).get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return createServerClient(url, key, {
      // Stateless: never touch cookies for a Bearer request.
      cookies: { getAll: () => [], setAll: () => {} },
      // Authorize PostgREST/RLS as the token's user.
      global: { headers: { Authorization: authHeader } },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    // Mark the auth cookies Secure in production so the browser never sends
    // them over plain HTTP. Off in dev because localhost is served over http
    // (a Secure cookie there would simply be dropped). sameSite stays 'lax'
    // (the @supabase/ssr default), which is our CSRF defense.
    cookieOptions: {
      secure: IS_PROD,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have proxy refreshing
          // user sessions.
        }
      },
    },
  });
}
