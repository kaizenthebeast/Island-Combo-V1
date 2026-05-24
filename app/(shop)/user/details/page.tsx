import AccountContainer from '@/components/private/layout/AccountContainer'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, getUserAddress } from '@/lib/users'

const UserDetailsPage = async () => {
  const supabase = await createClient()

  const [authResult, profile, addresses] = await Promise.all([
    supabase.auth.getUser(),
    getUserProfile().catch(() => null),
    getUserAddress().catch(() => []),
  ])

  return (
    <main className='max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6'>
      <AccountContainer
        email={authResult.data.user?.email ?? ''}
        profile={profile}
        addresses={addresses}
      />
    </main>
  )
}

export default UserDetailsPage
