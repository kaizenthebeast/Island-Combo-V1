"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { User, Settings, LogOut, Star, Ticket, PackageSearch, CreditCard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    try {
      sessionStorage.setItem("logging_out", "true"); // suppress AnonAuthProvider
      await supabase.auth.signOut();
      useCartStore.getState().clearCart();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      sessionStorage.removeItem("logging_out"); // always clean up
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center focus:outline-none cursor-pointer">
          <User size={22} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href="/protected/user_details" className="flex items-center gap-2 cursor-pointer">
            <Settings size={15} />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/protected/user_details" className="flex items-center gap-2 cursor-pointer">
            <Star size={15} />
            Loyalty Points
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/protected/user_details" className="flex items-center gap-2 cursor-pointer">
            <Ticket size={15} />
            Buy Cash Voucher
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/protected/user_details" className="flex items-center gap-2 cursor-pointer">
            <PackageSearch size={15} />
            Order & Tracking
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/protected/user_details" className="flex items-center gap-2 cursor-pointer">
            <CreditCard size={15} />
            Payment Method
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