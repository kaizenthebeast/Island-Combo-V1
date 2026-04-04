import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login`);
  }

  const supabase = await createClient();

  //Get current session to check for anonymous user
  const { data: sessionData } = await supabase.auth.getSession();
  const guestId = sessionData?.session?.user?.id;


  // Exchange code for new OAuth session
  const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !authData?.session) {
    console.error("OAuth error:", error?.message);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
  }

  const authUserId = authData.session.user.id;

  //Merge cart if there was an anonymous session
  if (guestId && authUserId && guestId !== authUserId) {
    try {
      await supabase.rpc("merge_cart", {
        p_old_user_id: guestId,
        p_new_user_id: authUserId,
      })
    } catch (mergeError) {
      console.error("Cart merge error:", mergeError)
    }
  }


  return NextResponse.redirect(`${requestUrl.origin}/`);

}