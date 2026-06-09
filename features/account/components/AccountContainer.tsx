'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Star, Ticket, PackageSearch, CreditCard } from 'lucide-react'
import Account from '@/features/account/components/Account'
import Loyalty from '@/features/account/components/Loyalty'
import OrderTracking from '@/features/account/components/OrderTracking'
import MyCards from '@/features/account/components/MyCards'
import { Address } from '@/shared/types/users'
import type { SavedCard } from '@/features/account/api/cards'

const navLinks: { name: string; icon: typeof User; href?: string }[] = [
    { name: 'Account Details', icon: User },
    { name: 'Loyalty Points', icon: Star },
    { name: 'Buy Cash Voucher', icon: Ticket, href: '/cashvoucher' },
    { name: 'Orders & Tracking', icon: PackageSearch },
    { name: 'My Cards', icon: CreditCard },
]

type AccountContainerProps = {
    email: string
    profile: { first_name: string | null; last_name: string | null; phone_text: string | null } | null
    addresses: Address[]
    cards: SavedCard[]
}

// Deep-link slugs (e.g. /account?tab=orders) → sidebar entry.
const TAB_BY_SLUG: Record<string, string> = {
    account: 'Account Details',
    loyalty: 'Loyalty Points',
    orders: 'Orders & Tracking',
    cards: 'My Cards',
}

const AccountContainer = ({ email, profile, addresses, cards }: AccountContainerProps) => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeLink, setActiveLink] = useState(
        TAB_BY_SLUG[searchParams.get('tab') ?? ''] ?? 'Account Details',
    )

    // Keep the active section in sync with the ?tab= deep-link (e.g. when the
    // header dropdown navigates here while already on /account).
    useEffect(() => {
        const slug = searchParams.get('tab') ?? ''
        if (TAB_BY_SLUG[slug]) setActiveLink(TAB_BY_SLUG[slug])
    }, [searchParams])

    const handleLinkClick = (link: { name: string; href?: string }) => {
        if (link.href) {
            router.push(link.href)
            return
        }
        setActiveLink(link.name)
    }

    return (
        <div className='grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mt-10'>
            <aside className='bg-white border rounded-xl p-4 h-fit shadow-xs md:sticky md:top-6'>
                <h2 className='text-lg font-semibold text-foreground mb-4 px-2'>My Account</h2>
                <div className='flex flex-col items-start gap-1'>
                    {navLinks.map((link) => {
                        const Icon = link.icon
                        const active = activeLink === link.name
                        return (
                            <button
                                key={link.name}
                                onClick={() => handleLinkClick(link)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-left text-sm font-medium transition-colors
                                    ${active
                                        ? 'text-brand bg-brand-tint'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${active ? 'text-brand' : 'text-muted-foreground'}`} />
                                {link.name}
                            </button>
                        )
                    })}
                </div>
            </aside>

            <section className='flex flex-col gap-5'>
                {activeLink === 'Account Details' && (
                    <Account email={email} profile={profile} addresses={addresses} />
                )}
                {activeLink === 'Loyalty Points' && <Loyalty />}
                {activeLink === 'Orders & Tracking' && (
                    <OrderTracking
                        customerName={[profile?.first_name, profile?.last_name].filter(Boolean).join(' ')}
                    />
                )}
                {activeLink === 'My Cards' && <MyCards cards={cards} />}
            </section>
        </div>
    )
}

export default AccountContainer
