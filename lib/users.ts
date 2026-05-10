'use server'
import { createClient } from "@/lib/supabase/server";
import { AddressFormValues, Address } from '@/types/users';
import { revalidatePath } from "next/cache";

export const insertAddressInfo = async (addressInfo: AddressFormValues) => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, status: 401, message: 'Unauthorized' };

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

export const getUserAddress = async (): Promise<Address[] | { success: false; status: number; message: string }> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, status: 401, message: 'Unauthorized' };

  const { data: addresses, error: addressError } = await supabase
    .from("addresses")
    .select("id, address, postal_code, locality, country, make_default, profile(first_name, last_name, phone_text)")
    .eq("user_id", user.id)
    .order("make_default", { ascending: false });

  if (addressError) return { success: false, status: 403, message: addressError.message };

  return (addresses ?? []).map((a) => ({
    ...a,
    profile: Array.isArray(a.profile) ? a.profile[0] ?? null : a.profile,
  })) as Address[];
};


// ADMIN SIDE

export const getUsers = async () => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, status: 401, message: 'Unauthorized' };

  const { data, error } = await supabase
    .from("profile")
    .select(`
      user_id,
      first_name,
      last_name,
      email,
      phone_text,
      sex,
      age,
      role,
      profile_url,
      created_at,
      profile_pts (
        total_pts
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return { success: false, status: 403, message: error.message };

  return { success: true, status: 200, data };
};