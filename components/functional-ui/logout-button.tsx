"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();

    try {
      // 1. Sign out from Supabase
      await supabase.auth.signOut();

      // 2. Clear anonymous identity
      localStorage.removeItem("guest_id");

      // 3. Reset cart state (IMPORTANT FIX)
      useCartStore.getState().clearCart();

      // 4. Redirect
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return <Button onClick={logout}>Logout</Button>;
}