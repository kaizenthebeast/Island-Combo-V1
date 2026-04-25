import { createClient } from "@/lib/supabase/server";


export const requireUser = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }

  return data.user ?? null;
}
