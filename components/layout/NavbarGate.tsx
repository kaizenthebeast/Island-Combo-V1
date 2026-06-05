'use client'

import { usePathname } from 'next/navigation'

// The mobile cart (/checkout) has its own "Cart (N)" header, so the site navbar
// is redundant there on small screens. Hide it on mobile for that route only;
// desktop keeps the navbar.
export default function NavbarGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideOnMobile = pathname === '/checkout'

  return <div className={hideOnMobile ? 'hidden md:block' : undefined}>{children}</div>
}
