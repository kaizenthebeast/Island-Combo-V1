import { createClient } from "@/lib/supabase/server";
import { AuthButtonClient } from "./AuthButtonClient";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims?.email;

  return <AuthButtonClient isAuthenticated={isAuthenticated} />;
}