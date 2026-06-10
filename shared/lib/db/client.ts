import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/shared/config/env";

export function createClient() {
  return createBrowserClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      // Keep parity with the server client: a client-side token refresh must not
      // rewrite the auth cookie without Secure in production. Off in dev (http
      // localhost). sameSite stays 'lax' (the @supabase/ssr default).
      cookieOptions: { secure: process.env.NODE_ENV === 'production' },
    },
  );
}
