import { createClient } from "@/lib/supabase/server";


export async function requireUser() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  console.log("AUTH ERROR:", error);
  console.log("AUTH DATA:", data);

  if (error) {
    throw new Error(error.message);
  }

  return data.user ?? null;
}
