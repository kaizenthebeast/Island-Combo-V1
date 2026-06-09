import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { createClient } from "@/shared/lib/db/server";
import { AuthButtonClient } from "@/features/auth/components/AuthButtonClient";
import SearchBar from "@/shared/components/layout/SearchBar";
import CartCount from "@/features/cart/components/CartCount";

const Navbar = async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims?.email;

  return (
    <header className="w-full">
      <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex items-center justify-between md:justify-start gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={36}
              height={36}
              className="object-contain"
            />
            <span className="font-bold text-base md:text-lg text-brand">
              Island Combo
            </span>
          </Link>

          <Link
            href="/checkout"
            aria-label="Cart"
            className="relative md:hidden text-foreground"
          >
            <ShoppingCart size={22} />
            <span className="absolute -top-2 -right-2 text-[10px] bg-brand text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              <CartCount />
            </span>
          </Link>
        </div>

        <div className="flex-1">
          <SearchBar />
        </div>

        <div className="hidden md:flex items-center gap-4 shrink-0">
          <AuthButtonClient isAuthenticated={isAuthenticated} />
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
