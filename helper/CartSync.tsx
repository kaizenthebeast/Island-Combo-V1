"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cartStore";

export default function CartSync() {
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        await fetchCart();
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        void fetchCart();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCart]);

  return null;
}
