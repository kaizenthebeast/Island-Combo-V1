import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { AuthButtonClient } from "@/components/functional-ui/AuthButtonClient";
import { MobileMenu } from "@/components/functional-ui/mobile-menu";
import SearchBar from "@/components/public/layout/SearchBar";

const Navbar = async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims?.email;

  return (
    <header className="w-full bg-white border-b border-gray-100">
      <nav className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
          <span className="font-bold text-lg text-brand hidden sm:block">Island Combo</span>
        </Link>

        <div className="flex-1 hidden md:block">
          <SearchBar />
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