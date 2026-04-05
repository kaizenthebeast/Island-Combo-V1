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

export class User {
  private static profile: UserProfile | null = null;

  // Fetch the current user and store internally
  public static async current(): Promise<UserProfile> {
    if (User.profile) return User.profile; // return cached profile

    const supabase = await createClient();

    // Auth check
    const { data: authData, error } = await supabase.auth.getClaims();
    if (error || !authData?.claims) redirect("/auth/login");

    const userId = authData.claims.sub;

    // Fetch profile
    const { data: userProfile, error: userProfileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(); // safer than .single()

    if (userProfileError) throw new Error(userProfileError.message);
    if (!userProfile) redirect("/protected/setup-profile");

    User.profile = userProfile as UserProfile; // cache internally
    return User.profile;
  }

  // Optional: clear cached profile (for logout)
  public static clear() {
    User.profile = null;
  }
}