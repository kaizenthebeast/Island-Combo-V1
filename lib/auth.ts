import { createClient } from "@/lib/supabase/server";


export const requireUser = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }

  return data.user ?? null;
}

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
