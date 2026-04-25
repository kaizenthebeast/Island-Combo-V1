import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import CartCount from "./cart/CartCount";
import { ShoppingCart, Heart, User } from "lucide-react";



export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;
  const isAuthenticated = !!user?.email;

  const Actions = () => (
    <div className="flex items-center gap-6">
      {/* CART */}
      <Link href="/checkout" className="relative flex items-center">
        <ShoppingCart size={22} />
        <span className="absolute -top-2 -right-2 text-xs bg-[#900036] text-white rounded-full px-1.5">
          <CartCount />
        </span>
      </Link>

      {/* FAVORITES */}
      <Link href="/">
        <Heart size={22} />
      </Link>
      {isAuthenticated && (
        <Link href="/protected/user_details">
          <User size={22} />
        </Link>
      )}
    </div>
  );

  return isAuthenticated ? (
    <div className="flex items-center gap-9">
      <Actions />

      <LogoutButton />
    </div>
  ) : (
    <div className="flex items-center gap-6">
      <Actions />

      <div className="flex gap-4 font-semibold text-sm">
        <Link href="/auth/login">Sign in</Link>
        <Link href="/auth/sign-up">Sign up</Link>
      </div>
    </div>
  );
}