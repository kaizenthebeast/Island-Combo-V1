"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { User, Settings, LogOut, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWishlistStore } from "@/stores";

export function UserMenu() {
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { clearWishlist } = useWishlistStore();

  const logout = async () => {
    const supabase = createClient();
    try {
      clearCart();
      clearWishlist();
      await supabase.auth.signOut({ scope: "local" });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center focus:outline-hidden cursor-pointer">
          <User size={22} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2 cursor-pointer">
            <Settings size={15} />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account?tab=orders" className="flex items-center gap-2 cursor-pointer">
            <Package size={15} />
            My Orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full cursor-pointer"
          >
            <LogOut size={15} />
            Logout
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}