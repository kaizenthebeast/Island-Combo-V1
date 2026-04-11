import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { AuthButton } from "@/components/functional-ui/auth-button";

const Navbar = () => {
    return (
        <header className="w-full  bg-white">
            <nav className="max-w-7xl mx-auto flex items-center gap-7 px-4 py-3">

                {/* LEFT - LOGO */}
                <Link href="/product" className="flex items-center gap-2 shrink-0">
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

                {/* CENTER - SEARCH (takes most width) */}
                <div className="flex-1 relative">
                    <Search
                        size={18}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full pl-4 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#900036]"
                    />
                </div>

                {/* RIGHT - ACTIONS */}
                <div className="flex items-center gap-4 shrink-0">


                    <Suspense>
                        <AuthButton />
                    </Suspense>
                </div>

            </nav>
        </header>
    );
};

export default Navbar;