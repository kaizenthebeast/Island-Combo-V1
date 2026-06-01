'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AddressFormValues, Address } from '@/types/users'

// All address logic is self-scoped to the authenticated user. RLS is the
// primary authz boundary; the user_id filters below are belt-and-suspenders.

const MAX_ADDRESSES_PER_USER = 3

// READ

export const getUserAddress = async (): Promise<Address[]> => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('addresses')
    .select('id, address, postal_code, locality, country, make_default, profile(first_name, last_name, phone_text)')
    .eq('user_id', user.id)
    .order('make_default', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((a) => ({
    ...a,
    profile: Array.isArray(a.profile) ? a.profile[0] ?? null : a.profile,
  })) as Address[]
}

// CREATE

export const insertAddressInfo = async (addressInfo: AddressFormValues) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  // Cap saved addresses per user before touching the database.
  const { count, error: countError } = await supabase
    .from('addresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (countError) return { success: false, status: 403, message: countError.message }

  if ((count ?? 0) >= MAX_ADDRESSES_PER_USER) {
    return {
      success: false,
      status: 400,
      message: `You can only save up to ${MAX_ADDRESSES_PER_USER} addresses. Please remove one before adding a new one.`,
    }
  }

  if (addressInfo.makeDefault) {
    await supabase.from('addresses').update({ make_default: false }).eq('user_id', user.id)
  }

  const { error: profileError } = await supabase.from('profile').upsert({
    user_id: user.id,
    email: user.email,
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,
  }).eq('user_id', user.id)

  if (profileError) return { success: false, status: 403, message: profileError.message }

  const { error: addressError } = await supabase.from('addresses').insert({
    user_id: user.id,
    address: addressInfo.address,
    postal_code: addressInfo.postalCode,
    locality: addressInfo.locality,
    country: addressInfo.country,
    make_default: addressInfo.makeDefault,
  })

  if (addressError) return { success: false, status: 403, message: addressError.message }

  revalidatePath('/checkout/address')
  return { success: true, status: 201, message: 'Address successfully added' }
}

// UPDATE

export const updateAddressInfo = async (
  addressId: number | undefined,
  addressInfo: AddressFormValues,
) => {
  if (!addressId) return { success: false, status: 400, message: 'Address ID is required' }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  if (addressInfo.makeDefault) {
    await supabase.from('addresses').update({ make_default: false }).eq('user_id', user.id)
  }

  const { error: profileError } = await supabase.from('profile').update({
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,
  }).eq('user_id', user.id)

  if (profileError) return { success: false, status: 403, message: profileError.message }

  const { error: updateError } = await supabase
    .from('addresses')
    .update({
      address: addressInfo.address,
      postal_code: addressInfo.postalCode,
      locality: addressInfo.locality,
      country: addressInfo.country,
      make_default: addressInfo.makeDefault,
      updated_at: new Date().toISOString(),
    })
    .eq('id', addressId)
    .eq('user_id', user.id)

  if (updateError) return { success: false, status: 403, message: updateError.message }

  revalidatePath('/checkout/address')
  return { success: true, status: 200, message: 'Address successfully updated' }
}

// DELETE

export const deleteAddress = async (addressId: number) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { error: deleteError } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', user.id)

  if (deleteError) return { success: false, status: 403, message: deleteError.message }

  revalidatePath('/checkout/address')
  return { success: true, status: 200, message: 'Address successfully deleted' }
}
