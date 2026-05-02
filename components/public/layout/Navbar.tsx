import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuthButtonClient } from "@/components/functional-ui/AuthButtonClient";
import { MobileMenu } from "@/components/functional-ui/mobile-menu";

const Navbar = async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims?.email;

  return (
    <header className="w-full bg-white border-b border-gray-100">
      <nav className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
          <span className="font-bold text-lg text-[#900036] hidden sm:block">Island Combo</span>
        </Link>

        <div className="flex-1 relative hidden md:block">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#900036]"
          />
        </div>

        <div className="hidden md:flex items-center gap-4 shrink-0">
          <AuthButtonClient isAuthenticated={isAuthenticated} />
        </div>

        <div className="flex md:hidden items-center ml-auto">
          <MobileMenu isAuthenticated={isAuthenticated} />
        </div>

      </nav>
    </header>
  );
};

export default Navbar;