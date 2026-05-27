"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AuthButtonClient } from "./AuthButtonClient";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import SearchBar from "@/components/public/layout/SearchBar";

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
          <SheetDescription>Site navigation and search</SheetDescription>
        </VisuallyHidden>

        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Image src="/images/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
          <span className="font-bold text-base text-brand">Island Combo</span>
        </div>

        <div className="px-5 py-4 border-b border-gray-100">
          <SearchBar
            inputClassName="w-full pl-4 pr-9 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-brand"
            onNavigate={() => setOpen(false)}
          />
        </div>

        <div className="px-5 py-4">
          <AuthButtonClient isAuthenticated={isAuthenticated} />
        </div>
      </SheetContent>
    </Sheet>
  );
}