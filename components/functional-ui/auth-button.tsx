import Link from "next/link";
import { Button } from "../ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import CartCount from "../functional-ui/CartCount"
import { ShoppingCart, Heart } from 'lucide-react';

export async function AuthButton() {
  const supabase = await createClient();

  // Get session claims
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Only treat as authenticated if there's an email
  const isAuthenticated = !!user?.email;

  return isAuthenticated ? (
    <div className="flex items-center gap-4">

      Hey, {user.email}
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/protected/checkout">checkout</Link>
      </Button>
      <LogoutButton />
      Cart Count:  <CartCount />
    </div>
  ) : (
    <div className="flex gap-8 items-center">
      <div className="flex items-center gap-4">
        <Link href="/checkout" className="flex items-center gap-2">
          <ShoppingCart size={18} />  <CartCount />
        </Link>
        <Link href="/">
          <Heart size={18} />
        </Link>
      </div>
      <div className="flex gap-6 font-bold">
        <Link href="/auth/login">Sign in</Link>
        <Link href="/auth/sign-up">Sign up</Link>
      </div>
    </div>
  );
}