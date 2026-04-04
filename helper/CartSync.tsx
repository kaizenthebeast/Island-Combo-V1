"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cartStore";

export default function CartSync() {
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    const supabase = createClient();

    void fetchCart();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void fetchCart();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCart]);

  return null;
}