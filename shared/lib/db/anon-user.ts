import { createClient } from "@/shared/lib/db/client";

export async function ensureAnonymousUser() {
  const supabase = createClient();

  // Check if there's already a valid session (authenticated or anonymous)
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    return session.user.id;
  }

  // No session exists — safe to create anonymous one
  const { data, error: anonError } = await supabase.auth.signInAnonymously();

  if (anonError || !data.user) {
    throw new Error(`Failed to get anonymous session: ${anonError?.message ?? "Unknown error"}`);
  }

  return data.user.id;
}