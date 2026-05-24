'use server'
import { createClient } from "@/lib/supabase/server";
import { AddressFormValues, Address} from '@/types/users';
import {AddUserFormValues, EditUserFormValues} from '@/form-schema/userSchema'
import { revalidatePath } from "next/cache";

export const insertAddressInfo = async (addressInfo: AddressFormValues) => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, status: 401, message: 'Unauthorized' };

  // ── Check address limit ─────────────────────────────────────────────────
  // Users are allowed a maximum of 3 saved addresses. If the limit is
  // reached we return an error before touching the database.
  const { count, error: countError } = await supabase
    .from('addresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) return { success: false, status: 403, message: countError.message };

  if ((count ?? 0) >= 3) {
    return {
      success: false,
      status: 400,
      message: 'You can only save up to 3 addresses. Please remove one before adding a new one.',
    };
  }

  if (addressInfo.makeDefault) {
    await supabase.from("addresses").update({ make_default: false }).eq("user_id", user.id);
  }

  const { error: profileError } = await supabase.from("profile").upsert({
    user_id: user.id,
    email: user.email,
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,
  }).eq("user_id", user.id);

  if (profileError) return { success: false, status: 403, message: profileError.message };

  const { error: addressError } = await supabase.from("addresses").insert({
    user_id: user.id,
    address: addressInfo.address,
    postal_code: addressInfo.postalCode,
    locality: addressInfo.locality,
    country: addressInfo.country,
    make_default: addressInfo.makeDefault,
  });

  if (addressError) return { success: false, status: 403, message: addressError.message };

  revalidatePath("/checkout/address");
  return { success: true, status: 201, message: 'Address successfully added' };
};

export const updateAddressInfo = async (addressId: number | undefined, addressInfo: AddressFormValues) => {
  if (!addressId) return { success: false, status: 400, message: 'Address ID is required' };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, status: 401, message: 'Unauthorized' };

  if (addressInfo.makeDefault) {
    await supabase.from("addresses").update({ make_default: false }).eq("user_id", user.id);
  }

  const { error: profileError } = await supabase.from("profile").update({
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,
  }).eq("user_id", user.id);

  if (profileError) return { success: false, status: 403, message: profileError.message };

  const { error: updateError } = await supabase
    .from("addresses")
    .update({
      address: addressInfo.address,
      postal_code: addressInfo.postalCode,
      locality: addressInfo.locality,
      country: addressInfo.country,
      make_default: addressInfo.makeDefault,
      updated_at: new Date().toISOString(),
    })
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (updateError) return { success: false, status: 403, message: updateError.message };

  revalidatePath("/checkout/address");
  return { success: true, status: 200, message: 'Address successfully updated' };
};

export const deleteAddress = async (addressId: number) => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, status: 401, message: 'Unauthorized' };

  const { error: deleteError } = await supabase
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (deleteError) return { success: false, status: 403, message: deleteError.message };

  revalidatePath("/checkout/address");
  return { success: true, status: 200, message: 'Address successfully deleted' };
};

export const updateMyProfile = async (
  data: { first_name: string; last_name: string; phone_text?: string },
) => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, status: 401, message: 'Unauthorized' };

  const { error } = await supabase.from('profile').upsert({
    user_id: user.id,
    email: user.email,
    first_name: data.first_name,
    last_name: data.last_name,
    phone_text: data.phone_text ?? null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id);

  if (error) return { success: false, status: 403, message: error.message };

  revalidatePath('/user/details');
  return { success: true, status: 200, message: 'Profile successfully updated' };
};

export const getUserProfile = async (): Promise<{ first_name: string | null; last_name: string | null; phone_text: string | null } | null> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from("profile")
    .select("first_name, last_name, phone_text")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ?? null;
};

export const getUserAddress = async (): Promise<Address[]> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: addresses, error: addressError } = await supabase
    .from("addresses")
    .select("id, address, postal_code, locality, country, make_default, profile(first_name, last_name, phone_text)")
    .eq("user_id", user.id)
    .order("make_default", { ascending: false });

  if (addressError) throw new Error(addressError.message);

  return (addresses ?? []).map((a) => ({
    ...a,
    profile: Array.isArray(a.profile) ? a.profile[0] ?? null : a.profile,
  })) as Address[];
};


// ADMIN SIDE

export const getUsers = async () => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { data, error } = await supabase
    .from('admin_user_mv')
    .select('*')
    .order('member_since', { ascending: false })

  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 200, data }
}

export const getStaff = async () => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { data, error } = await supabase
    .from('admin_staff_mv')
    .select('*')
    .order('member_since', { ascending: false })

  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 200, data }
}

export const updateUser = async (userId: string, data: EditUserFormValues) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }  // ✅ added status

  const { error } = await supabase
    .from('profile')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone_text: data.phone_text ?? null,
      sex: data.sex ?? null,
      age: data.age ?? null,
      role: data.role,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }   // ✅ added status

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'User successfully updated' } // ✅ added status
}

export const deleteUser = async (userId: string) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }  

  const { error } = await supabase
    .from('profile')
    .delete()
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }   

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'User successfully deleted' } 
}

// ─── SOFT DELETE ──────────────────────────────────────────────────────────────

export const softDeleteUser = async (userId: string) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { error } = await supabase
    .from('profile')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'User successfully deactivated' }
}

// ─── RESTORE ─────────────────────────────────────────────────────────────────

export const restoreUser = async (userId: string) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { error } = await supabase
    .from('profile')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/admin/users')
  return { success: true, status: 200, message: 'User successfully restored' }
}