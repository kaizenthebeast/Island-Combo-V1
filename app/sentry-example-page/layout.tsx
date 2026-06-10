// Route segment config (force-dynamic) is ignored in the "use client" page, so
// it lives in this server-component layout. Forcing per-request render lets the
// nonce-based CSP (proxy.ts) stamp its nonce onto this page's scripts; a static
// prerender would ship nonce-less scripts that strict-dynamic blocks.
export const dynamic = "force-dynamic";

export default function SentryExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
