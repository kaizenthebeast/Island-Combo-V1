import { createClient } from "@/lib/supabase/client";

export async function ensureAnonymousUser() {
  const supabase = createClient();

  const {data: { user },} = await supabase.auth.getUser();

  if (user) return user;

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(`Anonymous sign-in failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Anonymous sign-in succeeded but no user was returned.");
  }

  return data.user;
}