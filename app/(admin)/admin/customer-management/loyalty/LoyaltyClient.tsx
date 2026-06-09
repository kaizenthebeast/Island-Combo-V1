'use client'

import { useState } from 'react'
import { Star, Users } from 'lucide-react'
import { PageHeader } from '@/shared/components/admin/PageHeader'
import MembersPanel from './MembersPanel'
import CardsPanel from './CardsPanel'
import type { LoyverseCardRow } from '@/features/loyalty/api/admin'

type Tab = 'members' | 'cards'

// Combined Loyalty back office: member points/profile + loyalty cards, in one
// page with two tabs (replaces the former separate "Customers" + "Customer
// Loyalty" entries — "Customers" clashed with the Users → Customer list).
export default function LoyaltyClient({ initialCards }: { initialCards: LoyverseCardRow[] }) {
  const [tab, setTab] = useState<Tab>('members')

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Customer Management"
        title="Loyalty"
        subtitle="Adjust member points, review profiles, and manage loyalty cards."
      />

      <div className="mb-6 inline-flex rounded-xl border border-border bg-white p-1">
        <TabButton active={tab === 'members'} onClick={() => setTab('members')} icon={<Users size={15} />} label="Members" />
        <TabButton active={tab === 'cards'} onClick={() => setTab('cards')} icon={<Star size={15} />} label="Cards" />
      </div>

      {tab === 'members' ? <MembersPanel /> : <CardsPanel initialRows={initialCards} />}
    </section>
  )
}

function TabButton({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
