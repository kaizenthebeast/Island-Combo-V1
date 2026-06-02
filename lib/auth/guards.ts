/** Auth guards: requireUser / requireAdmin. */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// The authenticated identity, read straight from the verified JWT claims.
export type AuthUser = {
  id: string;
  email: string | null;
  role: string;          // app role from the `user_role` claim: 'admin' | 'customer' | ...
  isAnonymous: boolean;
};

// `getClaims()` verifies the JWT signature LOCALLY against the project's JWKS
// (asymmetric ES256) — no network round-trip — and, because it goes through
// `getSession()` first, it transparently refreshes the access token via the
// refresh token whenever it's expired (the SSR cookie adapter persists the new
// token). `getUser()`, by contrast, hits the Auth server on every call.
//
// Wrapped in React's per-request `cache()` so the (now-local) verification runs
// once per request even when nested helpers re-auth the same user. The cache is
// cleared between requests, so a refreshed/rotated token is always re-read.
export const requireUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    throw new Error(error.message);
  }

  const claims = data?.claims;
  if (!claims?.sub) return null;

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    role: (claims.user_role as string | undefined) ?? "customer",
    isAnonymous: (claims.is_anonymous as boolean | undefined) ?? false,
  };
})

// Verifies the caller is an authenticated admin.
// Reads `user_role` from the JWT (set by the Supabase custom-access-token hook)
// and falls back to a DB lookup against `profile.role` if the claim isn't
// present yet (e.g. the hook isn't configured, or the token was issued before
// it was enabled). Use to guard every admin-only API route handler.
export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: number; message: string };

export const requireAdmin = async (): Promise<AdminCheck> => {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { ok: false, status: 401, message: "Unauthorized" };

  const userId = claims.sub as string;
  const claimRole = (claims as { user_role?: string }).user_role;

  // Fast path: trust the signed JWT claim.
  if (claimRole === "admin") return { ok: true, userId };
  if (claimRole && claimRole !== "admin") {
    return { ok: false, status: 403, message: "Forbidden: admin access required" };
  }

  // Fallback (claim missing): query the profile.
  const { data: profile } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (profile?.role !== "admin") {
    return { ok: false, status: 403, message: "Forbidden: admin access required" };
  }
  return { ok: true, userId };
};
