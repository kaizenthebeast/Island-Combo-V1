'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, Heart, User } from 'lucide-react'

type Props = {
  isAuthenticated: boolean
}

export default function MobileBottomNav({ isAuthenticated }: Props) {
  const pathname = usePathname()
  const meHref = isAuthenticated ? '/user/details' : '/auth/login'

  // The checkout flow has its own fixed bottom bar (Total + Checkout/Place Order),
  // so the global tab bar would collide with it.
  if (pathname?.startsWith('/checkout')) return null

  const tabs = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'Cart', icon: ShoppingBag, href: '/checkout' },
    { label: 'Favorites', icon: Heart, href: '/product/favorites' },
    { label: 'Me', icon: User, href: meHref },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border grid grid-cols-4"
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href)
        const Icon = tab.icon
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
              active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
