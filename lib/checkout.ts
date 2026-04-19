import { createClient } from "./supabase/server";

export async function findPromoCode(promoCode: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("promo")
    .select("code, value, min_quantity, expires_at")
    .eq("code", promoCode.toUpperCase())
    .single(); 

  if (error || !data) return null;

  const now = new Date();

  if (data.expires_at && new Date(data.expires_at) < now) {
    return null;
  }

  return data;
}
