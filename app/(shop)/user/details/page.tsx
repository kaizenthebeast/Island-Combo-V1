import { redirect } from 'next/navigation'
import AccountContainer from '@/components/private/layout/AccountContainer'
import { requireUser } from '@/lib/auth'
import { getUserProfile } from '@/lib/account/profile'
import { getUserAddress } from '@/lib/account/address'

const UserDetailsPage = async () => {
  // The page is the trusted server-side boundary: verify the JWT here and pass
  // the derived id down to the (pure) data-access helpers.
  const user = await requireUser()
  if (!user) redirect('/auth/login')

  const [profile, addresses] = await Promise.all([
    getUserProfile(user.id).catch(() => null),
    getUserAddress(user.id).catch(() => []),
  ])

  return (
    <main className='max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6'>
      <AccountContainer
        email={user.email ?? ''}
        profile={profile}
        addresses={addresses ?? []}
      />
    </main>
  )
}

export default UserDetailsPage
