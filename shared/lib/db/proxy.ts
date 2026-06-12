import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "@/shared/config/env";
import { canAccessAdminPath } from "@/shared/config/admin-rbac";


// These routes require a real account: their SSR libs throw 'Unauthorized' for
// sessionless visitors (crawlers, first hit before the anonymous session
// exists) — redirect them to login instead of erroring the page.
const PROTECTED_ROUTES = ["/protected", "/checkout/address"];
const ADMIN_ROUTES = ["/admin"];

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Strict, nonce-based Content-Security-Policy — our actual XSS hardening.
 *
 * `'strict-dynamic'` + a fresh per-request nonce means modern (CSP3) browsers
 * ignore the script host-allowlist / 'unsafe-inline' and trust ONLY our nonce'd
 * bootstrap plus whatever that trusted code loads — Next's bundles, and the
 * PayPal SDK + Sentry which our own bundle injects. The trailing `https:` and
 * `'unsafe-inline'` are graceful fallbacks: pre-CSP3 browsers honour them (so
 * PayPal's https-hosted scripts still load) while CSP3 browsers ignore them.
 *
 * strict-dynamic only covers scripts, so frames / connections / images / styles
 * get explicit allowlists for the third parties this app talks to.
 */
function buildCsp(nonce: string, supabaseOrigin: string): string {
  const supabaseWs = supabaseOrigin.replace(/^https/, "wss");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https:",
      "'unsafe-inline'",
      // Next.js Fast Refresh / HMR compiles with eval() — dev only.
      ...(IS_PROD ? [] : ["'unsafe-eval'"]),
    ],
    // Next and UI libs inject inline <style>; nonces don't reliably apply to
    // styles, and inline-style injection is a far weaker XSS vector than script.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "blob:",
      "data:",
      supabaseOrigin,                    // product / review media in storage
      "https://developers.google.com",   // remotePattern in next.config
      "https://*.googleusercontent.com", // Google account avatars
      "https://*.paypalobjects.com",     // PayPal button/card art
      "https://*.paypal.com",
    ],
    "font-src": ["'self'", "data:"],     // next/font self-hosts Lato
    "connect-src": [
      "'self'",
      supabaseOrigin,                    // REST + auth
      supabaseWs,                        // realtime websocket
      "https://*.ingest.us.sentry.io",   // Sentry browser events
      "https://*.paypal.com",
      "https://*.paypalobjects.com",
      // HMR websocket — dev only.
      ...(IS_PROD ? [] : ["ws:"]),
    ],
    "frame-src": [
      "'self'",
      "https://*.paypal.com",            // hosted card-field iframes
      "https://*.paypalobjects.com",
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],       // clickjacking: refuse to be iframed
  };

  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // Upgrade any stray http subresource to https in prod. Skipped in dev so
  // http://localhost and the HMR socket keep working.
  return IS_PROD ? `${policy}; upgrade-insecure-requests` : policy;
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  // Fresh nonce per request. Putting the CSP on the *request* headers is what
  // makes Next stamp this same nonce onto its own inline bootstrap <script>s.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, new URL(supabaseUrl).origin);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    // Match server.ts: Secure cookies in production only.
    cookieOptions: { secure: IS_PROD },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

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

  // Back-office RBAC: staff and admin share the /admin surface; the section
  // policy in shared/config/admin-rbac.ts decides which subtrees staff may
  // open (the same policy drives the sidebar, so nav and access can't drift).
  // Deactivated accounts are stopped at the door — is_staff()/is_admin() in
  // RLS would block their data access anyway, but don't let them browse.
  if (isAdminRoute) {
    if (!user || user.is_anonymous) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    // Validate thru query
    const { data: profile, error } = await supabase
      .from('profile')
      .select('role, is_active')
      .eq('user_id', user.id)
      .single()
    const role = !error && profile?.is_active ? profile.role : null

    if (!canAccessAdminPath(role, path)) {
      const url = request.nextUrl.clone();
      // A staff member poking an admin-only section is authenticated — send
      // them home to their dashboard, not the login page.
      url.pathname = role === 'staff' ? '/admin/dashboard' : '/auth/login';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
