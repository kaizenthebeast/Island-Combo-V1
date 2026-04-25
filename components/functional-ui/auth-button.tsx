import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CartCount from "./cart/CartCount";
import { ShoppingCart, Heart } from "lucide-react";
import { UserMenu } from "./User_Menu";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;
  const isAuthenticated = !!user?.email;

  return (
    <div className="flex items-center gap-6">
      {/* CART */}
      <Link href="/checkout" className="relative flex items-center">
        <ShoppingCart size={22} />
        <span className="absolute -top-2 -right-2 text-xs bg-[#900036] text-white rounded-full px-1.5">
          <CartCount />
        </span>
      </Link>

      {/* FAVORITES */}
      <Link href="/product/favorites">
        <Heart size={22} />
      </Link>

      {/* USER */}
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