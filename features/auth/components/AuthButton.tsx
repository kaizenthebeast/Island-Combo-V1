import { createClient } from "@/shared/lib/db/server";
import { AuthButtonClient } from "./AuthButtonClient";

export async function AuthButton() {
  const supabase = await createClient();

  // Use getUser() instead of getClaims() — it's safer and won't throw on missing session
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user?.email;

  return <AuthButtonClient isAuthenticated={isAuthenticated} />;
}