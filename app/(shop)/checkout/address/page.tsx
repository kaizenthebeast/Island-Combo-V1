import React from 'react'
import AddressContainer from '@/components/private/layout/AddressContainer'
import { getUserAddress } from '@/lib/account/address'
import { getUserProfile } from '@/lib/account/profile'

// Per-user, session-derived data: render on the server on every request so the
// address list is present on first paint (no client-side loading flash). The
// address mutations call revalidatePath('/checkout/address'), so this page's
// data is re-fetched whenever an address is added/edited/removed.
export const dynamic = 'force-dynamic'

const AddressPage = async () => {
  // Fetched server-side (SSR). Fall back to empty/null so a transient read error
  // still renders the page; the client can retry via /api/address.
  const [addresses, profile] = await Promise.all([
    getUserAddress().catch(() => []),
    getUserProfile().catch(() => null),
  ])

  return (
    <section className="section-container">
      <AddressContainer initialAddresses={addresses} initialProfile={profile} />
    </section>
  )
}

export default AddressPage
