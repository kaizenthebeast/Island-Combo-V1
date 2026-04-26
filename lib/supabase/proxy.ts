import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";


const PROTECTED_ROUTES = ["/protected", "/checkout/address"];
const ADMIN_ROUTES = ["/admin"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user }, } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => path.startsWith(route));

  // BLOCK BOTH: 1. NO USER 2. ANONYMOUS USER
  if (isProtectedRoute && (!user || user.is_anonymous)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  //  if the user access the admin route, check if the user is admin or not
  if (isAdminRoute) {
    if (!user || user.is_anonymous) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    // Validate thru query
    const { data: profile, error } = await supabase.from('profile').select('role').eq('user_id', user.id).single()
    if (error || profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return response;  
}