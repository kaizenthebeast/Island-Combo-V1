// lib/supabase/anon-user.ts
import { createClient } from "@/lib/supabase/client";

export async function ensureAnonymousUser() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (user && user.is_anonymous) {
    localStorage.setItem("guest_id", user.id);
    return user;
  }

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) throw error;

    const anonId = data.user?.id;
    if (anonId) localStorage.setItem("guest_id", anonId);

    return data.user;
  }

  return user;
}