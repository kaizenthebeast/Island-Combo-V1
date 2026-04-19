// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getGuestIdFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split("; ")
    .find((row) => row.startsWith("guest_id="));

  return match ? match.split("=")[1] : null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login`);
  }

  const supabase = await createClient();

  // 🔥 CRITICAL: read guest_id from cookies (not session)
  const cookieHeader = request.headers.get("cookie");
  const guestId = getGuestIdFromCookies(cookieHeader);

  // Exchange OAuth code for session
  const { data: authData, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error || !authData?.session) {
    console.error("OAuth error:", error?.message);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=auth_failed`
    );
  }

  const authUserId = authData.session.user.id;

  // Merge cart
  if (guestId && authUserId && guestId !== authUserId) {
    try {
      await supabase.rpc("merge_cart", {
        p_old_user_id: guestId,
        p_new_user_id: authUserId,
      });
    } catch (mergeError) {
      console.error("Cart merge error:", mergeError);
    }
  }

  // 🔥 cleanup cookie
  const response = NextResponse.redirect(`${requestUrl.origin}/`);
  response.cookies.set("guest_id", "", { maxAge: 0 });

  return response;
}