'use server'
import { createClient } from "@/lib/supabase/server";
import { AddressFormValues } from '@/types/users';

export const insertAddressInfo = async (addressInfo: AddressFormValues) => {
  const supabase = await createClient();

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data?.user) {
    throw new Error(`Error fetching user: ${userError?.message ?? "User not found"}`);
  }

  const userId = data.user.id;
  const email = data.user.email;

  // Reset all defaults first if this one is being set as default
  if (addressInfo.makeDefault) {
    await supabase
      .from("addresses")
      .update({ make_default: false })   
      .eq("user_id", userId);
  }

 
  const { error: profileError } = await supabase.from("profile").upsert({
    user_id: userId,                     
    email: email,
    first_name: addressInfo.firstName,
    last_name: addressInfo.lastName,
    phone_text: addressInfo.phone,       
  }).eq("user_id", userId); 

  if (profileError) {
    throw new Error(`Error inserting profile info: ${profileError.message}`);
  }

  // Insert into addresses (always insert, never upsert — user can have multiple)
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
};