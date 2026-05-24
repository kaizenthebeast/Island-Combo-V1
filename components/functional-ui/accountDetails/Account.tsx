import { User, MapPin } from 'lucide-react'
import { Address } from '@/types/users'

type AccountProps = {
  email: string
  profile: { first_name: string | null; last_name: string | null } | null
  addresses: Address[]
}

const Account = ({ email, profile, addresses }: AccountProps) => {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

  return (
    <>
      {/* Personal details card */}
      <div className='bg-white border rounded-xl p-5 shadow-sm'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-base font-bold text-gray-800 flex items-center gap-2'>
            <User className='w-4 h-4' />
            Personal details
          </h3>
          <button type='button' className='text-sm text-[#900036] font-medium hover:underline'>
            Edit
          </button>
        </div>

        <div className='flex flex-col gap-3 text-sm'>
          <div>
            <p className='font-semibold text-gray-800'>Email address</p>
            <p className='text-gray-600'>{email || '—'}</p>
          </div>
          <div>
            <p className='font-semibold text-gray-800'>Name</p>
            <p className='text-gray-600'>{fullName || '—'}</p>
          </div>
          <div>
            <p className='font-semibold text-gray-800'>Password</p>
            <p className='text-gray-600 tracking-widest'>••••••••••••</p>
          </div>
        </div>
      </div>

      {/* Saved address card */}
      <div className='bg-white border rounded-xl p-5 shadow-sm'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-base font-bold text-gray-800 flex items-center gap-2'>
            <MapPin className='w-4 h-4' />
            Saved address
          </h3>
          <button type='button' className='text-sm text-[#900036] font-medium hover:underline'>
            Add
          </button>
        </div>

        <div className='flex flex-col gap-4'>
          {addresses.length === 0 && (
            <p className='text-sm text-gray-400'>No saved addresses yet</p>
          )}

          {addresses.map((address) => {
            const name = [address.profile?.first_name, address.profile?.last_name]
              .filter(Boolean)
              .join(' ')
            return (
              <div key={address.id} className='flex items-start justify-between gap-3'>
                <div className='flex flex-col gap-0.5 text-sm'>
                  <p className='font-semibold text-gray-800 flex items-center gap-2'>
                    {name}
                    {address.make_default && (
                      <span className='text-[10px] font-semibold uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded'>
                        Default
                      </span>
                    )}
                  </p>
                  <p className='text-gray-600'>
                    {address.address}, {address.locality}, {address.country} {address.postal_code}
                  </p>
                  {address.profile?.phone_text && (
                    <p className='text-gray-600'>{address.profile.phone_text}</p>
                  )}
                </div>
                <button type='button' className='text-sm text-[#900036] font-medium hover:underline shrink-0'>
                  Edit
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default Account
