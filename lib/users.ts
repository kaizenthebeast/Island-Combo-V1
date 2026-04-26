'use server'
import { createClient } from "@/lib/supabase/server";
import { AddressFormValues, Address } from '@/types/users';
import { revalidatePath } from "next/cache";

export const insertAddressInfo = async (addressInfo: AddressFormValues) => {
  const supabase = await createClient();

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data?.user) {
    throw new Error(`Error fetching user: ${userError?.message ?? "User not found"}`);
  }

  const userId = data.user.id;
  const email = data.user.email;

  if (addressInfo.makeDefault) {
    await supabase.from("addresses").update({ make_default: false }).eq("user_id", userId);
  }

  const { error: profileError } = await supabase.from("profile").upsert({
    user_id: userId,
    email: email,
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,
  }).eq("user_id", userId);

   if (profileError) {
    return { success: false, error: profileError.message }
  }

  const { error: addressError } = await supabase.from("addresses").insert({
    user_id: userId,
    address: addressInfo.address,
    postal_code: addressInfo.postalCode,
    locality: addressInfo.locality,
    country: addressInfo.country,
    make_default: addressInfo.makeDefault,
  });

  if (addressError) {
    throw new Error(`Error inserting address info: ${addressError.message}`);
  }

  revalidatePath("/checkout/address");
};

export const updateAddressInfo = async (addressId: number | undefined, addressInfo: AddressFormValues) => {
  if (!addressId) throw new Error("Address ID is required"); 

  const supabase = await createClient();

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data?.user) {  
    throw new Error(`Error fetching user: ${userError?.message ?? "User not found"}`);
  }

  const userId = data.user.id;

  // Reset other defaults if this is being set as default
  if (addressInfo.makeDefault) {
    await supabase.from("addresses").update({ make_default: false }).eq("user_id", userId);
  }

  // Update profile too since name/phone may have changed
  const { error: profileError } = await supabase.from("profile").update({
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,
  }).eq("user_id", userId);

  if (profileError) {
    throw new Error(`Error updating profile info: ${profileError.message}`);
  }

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
    .eq("user_id", userId); 

  if (updateError) {
    throw new Error(`Error updating address info: ${updateError.message}`);
  }

  revalidatePath("/checkout/address");
};

export const deleteAddress = async (addressId: number) => {
  const supabase = await createClient();

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data?.user) {  
    throw new Error(`Error fetching user: ${userError?.message ?? "User not found"}`);
  }

  const userId = data.user.id;

  const { error: deleteError } = await supabase
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`Error deleting address: ${deleteError.message}`);
  }

  revalidatePath("/checkout/address");
};

export const getUserAddress = async (): Promise<Address[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error(`Error fetching user: ${error?.message ?? "User not found"}`);
  }

  const userId = data.user.id;

  const { data: addresses, error: addressError } = await supabase
    .from("addresses")
    .select("id, address, postal_code, locality, country, make_default, profile(first_name, last_name, phone_text)")
    .eq("user_id", userId)
    .order("make_default", { ascending: false });

  if (addressError) {
    throw new Error(`Error fetching addresses: ${addressError.message}`);
  }

  return (addresses ?? []).map((a) => ({
    ...a,
    profile: Array.isArray(a.profile) ? a.profile[0] ?? null : a.profile,
  })) as Address[];
};