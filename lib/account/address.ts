/** Customer address CRUD (self-scoped). Pure data-access: the caller passes the
 *  authenticated userId (derived from the JWT at the API-route boundary) and RLS
 *  on `addresses` enforces the security boundary. No auth happens here. */
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AddressFormValues, Address } from '@/lib/types/users'

const MAX_ADDRESSES_PER_USER = 3

// READ

export const getUserAddress = async (userId: string): Promise<Address[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('addresses')
    .select('id, address, postal_code, locality, country, make_default, profile(first_name, last_name, phone_text)')
    .eq('user_id', userId)
    .order('make_default', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((a) => ({
    ...a,
    profile: Array.isArray(a.profile) ? a.profile[0] ?? null : a.profile,
  })) as Address[]
}

// CREATE

export const insertAddressInfo = async (
  userId: string,
  email: string | null,
  addressInfo: AddressFormValues,
) => {
  const supabase = await createClient()

  // Cap saved addresses per user before touching the database.
  const { count, error: countError } = await supabase
    .from('addresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) return { success: false, status: 403, message: countError.message }

  if ((count ?? 0) >= MAX_ADDRESSES_PER_USER) {
    return {
      success: false,
      status: 400,
      message: `You can only save up to ${MAX_ADDRESSES_PER_USER} addresses. Please remove one before adding a new one.`,
    }
  }

  if (addressInfo.makeDefault) {
    await supabase.from('addresses').update({ make_default: false }).eq('user_id', userId)
  }

  const { error: profileError } = await supabase.from('profile').upsert({
    user_id: userId,
    email,
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,
  }).eq('user_id', userId)

  if (profileError) return { success: false, status: 403, message: profileError.message }

  const { error: addressError } = await supabase.from('addresses').insert({
    user_id: userId,
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
  userId: string,
  addressId: number | undefined,
  addressInfo: AddressFormValues,
) => {
  if (!addressId) return { success: false, status: 400, message: 'Address ID is required' }

  const supabase = await createClient()

  if (addressInfo.makeDefault) {
    await supabase.from('addresses').update({ make_default: false }).eq('user_id', userId)
  }

  const { error: profileError } = await supabase.from('profile').update({
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,
  }).eq('user_id', userId)

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
    .eq('user_id', userId)

  if (updateError) return { success: false, status: 403, message: updateError.message }

  revalidatePath('/checkout/address')
  return { success: true, status: 200, message: 'Address successfully updated' }
}

// SET DEFAULT
//
// Focused single-purpose flip: mark one address as the default and clear the
// flag on every other address the user owns. Unlike updateAddressInfo this
// touches only `make_default` — no address fields, no profile — so a one-click
// "Make default" from a list never has to round-trip (or clobber) other data.
export const setDefaultAddress = async (userId: string, addressId: number) => {
  const supabase = await createClient()

  // Guard: the target must belong to the caller. RLS already blocks cross-user
  // writes, but an explicit existence check turns a silent no-op into a clean 404.
  const { data: target, error: lookupError } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle()

  if (lookupError) return { success: false, status: 403, message: lookupError.message }
  if (!target) return { success: false, status: 404, message: 'Address not found' }

  // Clear the previous default(s), then set the new one.
  const { error: clearError } = await supabase
    .from('addresses')
    .update({ make_default: false })
    .eq('user_id', userId)
    .neq('id', addressId)

  if (clearError) return { success: false, status: 403, message: clearError.message }

  const { error: setError } = await supabase
    .from('addresses')
    .update({ make_default: true, updated_at: new Date().toISOString() })
    .eq('id', addressId)
    .eq('user_id', userId)

  if (setError) return { success: false, status: 403, message: setError.message }

  revalidatePath('/checkout/address')
  return { success: true, status: 200, message: 'Default address updated' }
}

// DELETE

export const deleteAddress = async (userId: string, addressId: number) => {
  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId)

  if (deleteError) return { success: false, status: 403, message: deleteError.message }

  revalidatePath('/checkout/address')
  return { success: true, status: 200, message: 'Address successfully deleted' }
}
