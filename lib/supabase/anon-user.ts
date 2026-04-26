import { createClient } from "@/lib/supabase/client";


export async function ensureAnonymousUser() {
  const supabase = createClient();

  // Don't create anon session if we're in the middle of logging out
  if (sessionStorage.getItem("logging_out") === "true") return;

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  if (session?.user) {
    return session.user.id;
  }

  const { data, error: anonError } = await supabase.auth.signInAnonymously();

  if (anonError || !data.user) {
    throw new Error(`Failed to create anonymous session: ${anonError?.message ?? "Unknown error"}`);
  }

  return data.user.id;
}