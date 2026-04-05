// /lib/user.ts

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

  public static async current(): Promise<UserProfile> {
    const supabase = await createClient();

    // ✅ FAST check
    const { data: authData, error } = await supabase.auth.getClaims();

    if (error || !authData?.claims?.sub) {
      User.clear();
      redirect("/auth/login");
    }

    const userId = authData.claims.sub;

    // ✅ validate cached user matches session
    if (User.profile && User.profile.user_id === userId) {
      return User.profile;
    }

    // Fetch profile
    const { data: userProfile, error: userProfileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (userProfileError) throw new Error(userProfileError.message);
    if (!userProfile) redirect("/protected/setup-profile");

    User.profile = userProfile as UserProfile;
    return User.profile;
  }

  public static clear() {
    User.profile = null;
  }
}
