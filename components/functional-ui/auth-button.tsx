import Link from "next/link";
import { Button } from "../ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import CartCount from "../functional-ui/CartCount"

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
    <div className="flex gap-2 items-center">
      Cart Count:  <CartCount />
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
       <Button asChild size="sm" variant={"outline"}>
        <Link href="/checkout">checkout</Link>
      </Button>
    </div>
  );
}