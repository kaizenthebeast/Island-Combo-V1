"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AuthButtonClient } from "./AuthButtonClient";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function MobileMenu({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button aria-label="Open menu" className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors">
          <Menu size={22} />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-72 p-0 flex flex-col">
        <VisuallyHidden>
          <SheetTitle>Navigation Menu</SheetTitle>
        </VisuallyHidden>

        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Image src="/images/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
          <span className="font-bold text-base text-[#900036]">Island Combo</span>
        </div>

        <div className="px-5 py-4 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-4 pr-9 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#900036]"
            />
          </div>
        </div>

        <div className="px-5 py-4">
          <AuthButtonClient isAuthenticated={isAuthenticated} />
        </div>
      </SheetContent>
    </Sheet>
  );
}