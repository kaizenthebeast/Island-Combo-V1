'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { ArrowLeft, MapPin, ChevronRight, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { Address } from '@/lib/types/users'
import AddressFormBody from '@/components/forms/AddressFormBody'
import DeleteModal from '@/components/popup/DeleteModal'
import { customToast } from '@/components/popup/ToastCustom'

type Profile = { first_name: string | null; last_name: string | null; phone_text: string | null } | null

type Props = {
  addresses: Address[]
  selectedAddressId: number | null
  onSelect: (id: number | null) => void
  profile: Profile
  onChanged: () => void
}

const formatAddress = (a: Address) =>
  [a.address, a.locality, `${a.country} ${a.postal_code}`.trim()].filter(Boolean).join(', ')

const fullName = (a: Address) =>
  [a.profile?.first_name, a.profile?.last_name].filter(Boolean).join(' ') || 'Saved address'

const MobileAddressSelector = ({
  addresses,
  selectedAddressId,
  onSelect,
  profile,
  onChanged,
}: Props) => {
  const [listOpen, setListOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)

  const selected = addresses.find((a) => a.id === selectedAddressId) ?? null
  const hasAddresses = addresses.length > 0
  const atLimit = addresses.length >= 3

  const openAddForm = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEditForm = (address: Address) => {
    setEditing(address)
    setFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const res = await fetch('/api/address', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressId: id }),
    })
    const result = await res.json()

    if (!result?.success) {
      customToast.error({
        title: "Couldn't delete address",
        description: result?.message ?? 'Something went wrong while deleting the address.',
      })
      return
    }

    onChanged()
    customToast.success({
      title: 'Address successfully deleted!',
      description: 'The address has been removed from your account.',
    })
  }

  const formDefaults = editing
    ? {
        firstName: editing.profile?.first_name ?? '',
        lastName: editing.profile?.last_name ?? '',
        phone: editing.profile?.phone_text ?? '',
        address: editing.address,
        postalCode: editing.postal_code,
        locality: editing.locality,
        country: editing.country,
        makeDefault: editing.make_default,
      }
    : {
        firstName: profile?.first_name ?? '',
        lastName: profile?.last_name ?? '',
        phone: profile?.phone_text ?? '',
      }

  return (
    <>
      {/* Entry container */}
      {hasAddresses ? (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-border p-4 text-left"
        >
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            {selected ? (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{fullName(selected)}</p>
                <p className="text-xs text-muted-foreground truncate">{formatAddress(selected)}</p>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Select a delivery address</span>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={openAddForm}
          className="w-full flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-tint px-4 py-4 text-left"
        >
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
          <span className="text-sm font-medium text-danger">
            Please add a delivery address to continue
          </span>
        </button>
      )}

      {/* List sheet */}
      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="right" className="w-full p-0 flex flex-col [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Address</SheetTitle>
            <SheetDescription>Choose a delivery address or add a new one</SheetDescription>
          </VisuallyHidden>

          <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
            <button type="button" onClick={() => setListOpen(false)} aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold">Address</h2>
          </div>

          <div className="flex flex-col gap-4 p-4 overflow-y-auto">
            {addresses.map((address) => {
              const isSelected = selectedAddressId === address.id
              return (
                <div key={address.id} className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mobileSelectedAddress"
                    checked={isSelected}
                    onChange={() => {
                      onSelect(address.id)
                      setListOpen(false)
                    }}
                    className="w-5 h-5 accent-brand cursor-pointer shrink-0 mt-1"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {fullName(address)}
                      {address.make_default && (
                        <span className="text-[10px] font-semibold text-brand bg-brand-tint px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatAddress(address)}</p>
                    {address.profile?.phone_text && (
                      <p className="text-xs text-muted-foreground">{address.profile.phone_text}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditForm(address)}
                      aria-label="Edit address"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <DeleteModal subtitle="address" onSuccess={() => handleDelete(address.id)}>
                      <button type="button" aria-label="Remove address" className="text-muted-foreground hover:text-danger">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </DeleteModal>
                  </div>
                </div>
              )
            })}

            {atLimit ? (
              <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-tint px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-warning font-medium">
                  You&apos;ve reached the maximum of 3 saved addresses. Remove one to add a new one.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setListOpen(false)
                  openAddForm()
                }}
                className="w-full rounded-full border border-brand text-brand font-semibold py-3 text-sm hover:bg-brand hover:text-brand-foreground transition-colors"
              >
                Add new address
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Form sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-full p-0 flex flex-col overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>{editing ? 'Edit address' : 'New address'}</SheetTitle>
            <SheetDescription>Enter the delivery address details</SheetDescription>
          </VisuallyHidden>

          <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold">{editing ? 'Edit address' : 'New address'}</h2>
          </div>

          <div className="p-4">
            <AddressFormBody
              action={editing ? 'edit' : 'add'}
              addressId={editing?.id}
              lockIdentity={!!formDefaults.firstName}
              saveLabel={editing ? 'Update address' : 'Add address'}
              defaults={formDefaults}
              onSuccess={() => {
                setFormOpen(false)
                onChanged()
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default MobileAddressSelector
