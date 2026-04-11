import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthButton } from "@/components/functional-ui/auth-button";

const AuthNavbar = () => {
  return (
    <header className="w-full border-b bg-white">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">

        {/* LEFT - LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <span className="font-bold text-lg text-[#900036] hidden sm:block">
            Island Combo
          </span>
        </Link>

        {/* RIGHT - AUTH ACTIONS */}
        <Suspense>
          <AuthButton />
        </Suspense>

      </nav>
    </header>
  );
};

export default AuthNavbar;