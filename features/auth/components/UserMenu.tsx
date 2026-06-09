"use client";

import Link from "next/link";
import { createClient } from "@/shared/lib/db/client";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/features/cart/stores/cart-store";
import { User, Star, Ticket, PackageSearch, CreditCard, LogOut, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useWishlistStore } from "@/features/wishlist/stores/wishlist-store";

// Mirrors the "My Account" sidebar sections (AccountContainer). Each opens the
// account page on the matching ?tab= deep-link; Buy Cash Voucher is its own route.
const ACCOUNT_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Account Details", href: "/account", icon: User },
  { label: "Loyalty Points", href: "/account?tab=loyalty", icon: Star },
  { label: "Buy Cash Voucher", href: "/cashvoucher", icon: Ticket },
  { label: "Orders & Tracking", href: "/account?tab=orders", icon: PackageSearch },
  { label: "My Cards", href: "/account?tab=cards", icon: CreditCard },
];

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
      <DropdownMenuContent align="end" className="w-52">
        {ACCOUNT_LINKS.map(({ label, href, icon: Icon }) => (
          <DropdownMenuItem key={label} asChild>
            <Link href={href} className="flex items-center gap-2 cursor-pointer">
              <Icon size={15} />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
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
