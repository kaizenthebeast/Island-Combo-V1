/** Auth guards: requireUser / requireAdmin / requireStaff. */
import { cache } from "react";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/shared/lib/db/server";
import { AppError } from "@/shared/lib/http/respond";

// The authenticated identity, read straight from the verified JWT claims.
export type AuthUser = {
  id: string;
  email: string | null;
  role: string;          // app role from the `user_role` claim: 'admin' | 'customer' | ...
  isAnonymous: boolean;
};

// Reads & verifies the caller's JWT claims from EITHER source, transparently:
//   • `Authorization: Bearer <jwt>` — the standard token API (Postman/mobile/3rd-party)
//   • the cookie session            — the browser / SSR
// In both cases `getClaims(token?)` verifies the JWT's ES256 signature + expiry
// LOCALLY against the project JWKS (no Auth-server round-trip), so a forged,
// tampered, or expired token yields null (→ a clean 401) rather than access.
async function readVerifiedClaims(
  supabase: SupabaseClient,
): Promise<Record<string, unknown> | null> {
  const authHeader = (await headers()).get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  const { data, error } = bearer
    ? await supabase.auth.getClaims(bearer)
    : await supabase.auth.getClaims();

  // Any verification failure (bad signature, expired, malformed) = not authenticated.
  if (error || !data?.claims) return null;
  return data.claims as Record<string, unknown>;
}

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
  const claims = await readVerifiedClaims(supabase);
  if (!claims?.sub) return null;

  return {
    id: claims.sub as string,
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

  const claims = await readVerifiedClaims(supabase);
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

// Verifies the caller is staff OR admin (admin inherits staff authority, mirroring
// the DB's is_staff()). Same JWT-claim-then-profile-fallback strategy as
// requireAdmin, so a legitimate staff/admin whose `user_role` claim is missing or
// stale is still authorized off their DB role.
export const requireStaff = async (): Promise<AdminCheck> => {
  const supabase = await createClient();

  const claims = await readVerifiedClaims(supabase);
  if (!claims) return { ok: false, status: 401, message: "Unauthorized" };

  const userId = claims.sub as string;
  const claimRole = (claims as { user_role?: string }).user_role;

  if (claimRole === "admin" || claimRole === "staff") return { ok: true, userId };
  if (claimRole) return { ok: false, status: 403, message: "Forbidden: staff access required" };

  // Fallback (claim missing): query the profile.
  const { data: profile } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "staff") {
    return { ok: false, status: 403, message: "Forbidden: staff access required" };
  }
  return { ok: true, userId };
};

// Throwing variants for server actions (which return varied shapes, not a
// NextResponse). They raise an AppError carrying the right status so the caller's
// toApiError / error boundary surfaces a clean 401/403. Returns the user id.
export const assertAdmin = async (): Promise<string> => {
  const auth = await requireAdmin();
  if (!auth.ok) throw new AppError(auth.message, auth.status);
  return auth.userId;
};

export const assertStaff = async (): Promise<string> => {
  const auth = await requireStaff();
  if (!auth.ok) throw new AppError(auth.message, auth.status);
  return auth.userId;
};
