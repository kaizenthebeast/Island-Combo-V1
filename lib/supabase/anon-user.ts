import { createClient } from "@/lib/supabase/client";


export async function ensureAnonymousUser() {
  const supabase = createClient();

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }
  // Already has a session - return existing user ID
  if (session?.user) {
    return session.user.id;
  }

  // No session — create an anonymous one
  const { data, error: anonError } = await supabase.auth.signInAnonymously();

  if (anonError || !data.user) {
    throw new Error(`Failed to create anonymous session: ${anonError?.message ?? "Unknown error"}`);
  }

  return data.user.id;
}