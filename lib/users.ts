import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  gender: string | null;
  age: number | null;
  email: string | null;
  role: string;
};

export async function getCurrentUser(): Promise<UserProfile> {
  const supabase = await createClient();

  //Auth check
  const { data: authData, error } = await supabase.auth.getClaims();

  if (error || !authData?.claims) {
    redirect("/auth/login");
  }

  const userId = authData.claims.sub;

  // Fetch profile
  const { data: userProfile, error: userProfileError } = await supabase
    .from("profiles")
    .select("*") // FIXED
    .eq("user_id", userId)
    .single();

  if (userProfileError || !userProfile) {
    throw new Error(userProfileError?.message || "Profile not found");
  }

  //  Return object 
  return userProfile as UserProfile;
}
