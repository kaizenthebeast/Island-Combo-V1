'use client'
import { useState } from 'react'
import { User, Star, PackageSearch, CreditCard } from 'lucide-react'
import Account from '@/components/functional-ui/accountDetails/Account'
import Loyalty from '@/components/functional-ui/accountDetails/Loyalty'
import OrderTracking from '@/components/functional-ui/accountDetails/OrderTracking'
import MyCards from '@/components/functional-ui/accountDetails/MyCards'
import { Address } from '@/lib/types/users'

const navLinks = [
    { name: 'Account Details', icon: User },
    { name: 'Loyalty Points', icon: Star },
    { name: 'Orders & Tracking', icon: PackageSearch },
    { name: 'My Cards', icon: CreditCard },
]

type AccountContainerProps = {
    email: string
    profile: { first_name: string | null; last_name: string | null; phone_text: string | null } | null
    addresses: Address[]
}

const AccountContainer = ({ email, profile, addresses }: AccountContainerProps) => {
    const [activeLink, setActiveLink] = useState('Account Details')

    const handleLinkClick = (linkName: string) => {
        setActiveLink(linkName)
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
                                onClick={() => handleLinkClick(link.name)}
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
                {activeLink === 'Orders & Tracking' && <OrderTracking />}
                {activeLink === 'My Cards' && <MyCards />}
            </section>
        </div>
    )
}

export default AccountContainer
