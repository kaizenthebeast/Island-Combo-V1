"use client";

import Link from "next/link";
import CartCount from "./cart/CartCount";
import FavoriteCount from "./favorite/FavoriteCount";
import { UserMenu } from "./User_Menu";
import { ShoppingCart, Heart } from "lucide-react";

export function AuthButtonClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="flex items-center gap-6">
      <Link href="/checkout" className="relative flex items-center">
        <ShoppingCart size={22} />
        <span className="absolute -top-2 -right-2 text-xs bg-[#900036] text-white rounded-full px-1.5">
          <CartCount />
        </span>
      </Link>

      <Link href="/product/favorites" className="relative flex items-center">
        <Heart size={22} />
        <span className="absolute -top-2 -right-2 text-xs bg-[#900036] text-white rounded-full px-1.5">
          <FavoriteCount />
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