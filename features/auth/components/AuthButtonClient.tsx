"use client";

import Link from "next/link";
import CartCount from "@/features/cart/components/CartCount";
import WishlistCount from "@/features/wishlist/components/WishlistCount";
import { UserMenu } from "./UserMenu";
import { ShoppingCart, Heart } from "lucide-react";

export function AuthButtonClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="flex items-center gap-6">
      <Link href="/checkout" className="relative flex items-center">
        <ShoppingCart size={22} />
        <span className="absolute -top-2 -right-2 text-xs bg-brand text-white rounded-full px-1.5">
          <CartCount />
        </span>
      </Link>

      <Link href="/products/wishlist" className="relative flex items-center">
        <Heart size={22} />
        <span className="absolute -top-2 -right-2 text-xs bg-brand text-white rounded-full px-1.5">
          <WishlistCount />
        </span>
      </Link>

      {isAuthenticated ? (
        <UserMenu />
      ) : (
        <div className="flex gap-4 font-semibold text-sm">
          <Link href="/auth/login">Sign in</Link>
          <Link href="/auth/sign-up">Sign up</Link>
        </div>
      )}
    </div>
  );
}