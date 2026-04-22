// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login`);
  }

  const supabase = await createClient();

  // Capture the anon user ID BEFORE the OAuth exchange overwrites the session
  const { data: { user: anonUser }, error: anonError } = await supabase.auth.getUser();
  if (anonError) {
    throw new Error(`Failed to get anonymouse session: ${anonError.message}`);
  }

  const guestUserId = anonUser?.is_anonymous ? anonUser.id : null;

  // Exchange OAuth code for session
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError || !authData.session) {
    console.error("OAuth error:", authError?.message);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
  }

  const authUserId = authData.session.user.id;

  // Merge anonymous cart into the authenticated account
  if (guestUserId && guestUserId !== authUserId) {
    const { error: mergeError } = await supabase.rpc("merge_cart", {
      p_guest_user_id: guestUserId,
      p_auth_user_id: authUserId,
    });

    if (mergeError) {
      throw new Error(`Failed to merge cart: ${mergeError.message}`);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/`);
}