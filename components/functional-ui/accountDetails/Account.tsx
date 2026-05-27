'use client'

import { User, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Address } from '@/types/users'
import { deleteAddress } from '@/lib/users'
import CheckoutAddress from '@/components/forms/CheckoutAddressForm'
import PersonalDetailsForm from '@/components/forms/PersonalDetailsForm'
import DeleteModal from '@/components/popup/DeleteModal'
import { customToast } from '@/components/popup/ToastCustom'

type AccountProps = {
  email: string
  profile: { first_name: string | null; last_name: string | null; phone_text: string | null } | null
  addresses: Address[]
}

const Account = ({ email, profile, addresses }: AccountProps) => {
  const router = useRouter()
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  const atAddressLimit = addresses.length >= 3

  const handleDeleteAddress = async (id: number) => {
    await deleteAddress(id)
    customToast.success({
      title: 'Address successfully deleted!',
      description: 'The address has been removed from your account.',
    })
    router.refresh()
  }

  return (
    <>
      {/* Personal details card */}
      <div className='bg-white border rounded-xl p-5 shadow-xs'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-base font-bold text-foreground flex items-center gap-2'>
            <User className='w-4 h-4' />
            Personal details
          </h3>
          <PersonalDetailsForm
            firstName={profile?.first_name}
            lastName={profile?.last_name}
            phone={profile?.phone_text}
            email={email}
            onSuccess={() => router.refresh()}
          >
            <button type='button' className='text-sm text-brand font-medium hover:underline'>
              Edit
            </button>
          </PersonalDetailsForm>
        </div>

        <div className='flex flex-col gap-3 text-sm'>
          <div>
            <p className='font-semibold text-foreground'>Email address</p>
            <p className='text-muted-foreground'>{email || '—'}</p>
          </div>
          <div>
            <p className='font-semibold text-foreground'>Name</p>
            <p className='text-muted-foreground'>{fullName || '—'}</p>
          </div>
          {profile?.phone_text && (
            <div>
              <p className='font-semibold text-foreground'>Mobile number</p>
              <p className='text-muted-foreground'>{profile.phone_text}</p>
            </div>
          )}
          <div>
            <p className='font-semibold text-foreground'>Password</p>
            <p className='text-muted-foreground tracking-widest'>••••••••••••</p>
          </div>
        </div>
      </div>

      {/* Saved address card */}
      <div className='bg-white border rounded-xl p-5 shadow-xs'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-base font-bold text-foreground flex items-center gap-2'>
            <MapPin className='w-4 h-4' />
            Saved address
          </h3>
          {!atAddressLimit && (
            <CheckoutAddress
              title='Add New Address'
              action='add'
              firstName={profile?.first_name ?? undefined}
              lastName={profile?.last_name ?? undefined}
              phone={profile?.phone_text ?? undefined}
              onSuccess={() => router.refresh()}
            >
              <button type='button' className='text-sm text-brand font-medium hover:underline'>
                Add
              </button>
            </CheckoutAddress>
          )}
        </div>

        <div className='flex flex-col gap-4'>
          {addresses.length === 0 && (
            <p className='text-sm text-muted-foreground'>No saved addresses yet</p>
          )}

          {addresses.map((address) => {
            const name = [address.profile?.first_name, address.profile?.last_name]
              .filter(Boolean)
              .join(' ')
            return (
              <div key={address.id} className='flex items-start justify-between gap-3'>
                <div className='flex flex-col gap-0.5 text-sm'>
                  <p className='font-semibold text-foreground flex items-center gap-2'>
                    {name}
                    {address.make_default && (
                      <span className='text-[10px] font-semibold uppercase bg-warning-tint text-warning px-1.5 py-0.5 rounded'>
                        Default
                      </span>
                    )}
                  </p>
                  <p className='text-muted-foreground'>
                    {address.address}, {address.locality}, {address.country} {address.postal_code}
                  </p>
                  {address.profile?.phone_text && (
                    <p className='text-muted-foreground'>{address.profile.phone_text}</p>
                  )}
                </div>

                <div className='flex items-center gap-3 shrink-0'>
                  <CheckoutAddress
                    title='Edit Address'
                    action='edit'
                    addressId={address.id}
                    firstName={address.profile?.first_name}
                    lastName={address.profile?.last_name}
                    phone={address.profile?.phone_text}
                    address={address.address}
                    postalCode={address.postal_code}
                    locality={address.locality}
                    country={address.country}
                    makeDefault={address.make_default}
                    onSuccess={() => router.refresh()}
                  >
                    <button type='button' className='text-sm text-brand font-medium hover:underline'>
                      Edit
                    </button>
                  </CheckoutAddress>

                  <DeleteModal subtitle='address' onSuccess={() => handleDeleteAddress(address.id)}>
                    <button type='button' className='text-sm text-muted-foreground font-medium hover:underline'>
                      Remove
                    </button>
                  </DeleteModal>
                </div>
              </div>
            )
          })}

          {atAddressLimit && (
            <p className='text-xs text-warning bg-warning-tint border border-warning/30 rounded-md px-3 py-2'>
              You've reached the maximum of 3 saved addresses. Remove one to add a new one.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

export default Account
