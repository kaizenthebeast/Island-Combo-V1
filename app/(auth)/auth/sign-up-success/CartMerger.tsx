"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CartMerger() {
  useEffect(() => {
    const mergeCart = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Read guest ID from cookie
      const guestUserId = document.cookie
        .split("; ")
        .find(row => row.startsWith("guest_user_id="))
        ?.split("=")[1];

      if (guestUserId && guestUserId !== user.id) {
        await supabase.rpc("merge_cart", {
          p_guest_user_id: guestUserId,
          p_auth_user_id: user.id,
        });

        // Clear cookie after merging
        document.cookie = "guest_user_id=; path=/; max-age=0";
      }
    };

    mergeCart();
  }, []);

  return null; // renders nothing
}