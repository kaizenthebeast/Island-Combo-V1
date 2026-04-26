import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const guestUserId = requestUrl.searchParams.get("guest_id");
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError || !authData.session) {
    console.error("OAuth error:", authError?.message);
    return NextResponse.redirect(`${siteUrl}/login?error=auth_failed`);
  }

  const authUserId = authData.session.user.id;

  if (guestUserId && guestUserId !== authUserId) {
    const { error: mergeError } = await supabase.rpc("merge_cart", {
      p_guest_user_id: guestUserId,
      p_auth_user_id: authUserId,
    });

    if (mergeError) {
      console.error("Failed to merge cart:", mergeError.message);
    }
  }

  const { data: profile } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", authUserId)
    .single();

  const redirectTo = profile?.role === "admin" ? "/admin/products" : "/";
  return NextResponse.redirect(`${siteUrl}${redirectTo}`);
}