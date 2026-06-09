import React from 'react'
import { redirect } from 'next/navigation'
import AddressContainer from '@/features/account/components/address/AddressContainer'
import { requireUser } from '@/features/auth/api'
import { getUserAddress } from '@/features/account/api/address'
import { getUserProfile } from '@/features/account/api/profile'

// Per-user, session-derived data: render on the server on every request so the
// address list is present on first paint (no client-side loading flash). The
// address mutations call revalidatePath('/checkout/address'), so this page's
// data is re-fetched whenever an address is added/edited/removed.
export const dynamic = 'force-dynamic'

const AddressPage = async () => {
  // Trusted server-side boundary: verify the JWT here, then hand the derived id
  // to the (pure) data-access helpers.
  const user = await requireUser()
  if (!user) redirect('/auth/login')

  // Fetched server-side (SSR). Fall back to empty/null so a transient read error
  // still renders the page; the client can retry via /api/address.
  const [addresses, profile] = await Promise.all([
    getUserAddress(user.id).catch(() => []),
    getUserProfile(user.id).catch(() => null),
  ])

  return (
    <section className="section-container">
      <AddressContainer initialAddresses={addresses} initialProfile={profile} />
    </section>
  )
}

export default AddressPage
