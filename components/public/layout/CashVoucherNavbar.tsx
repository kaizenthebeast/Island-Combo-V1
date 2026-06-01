'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

const CashVoucherNavbar = () => {
  const [open, setOpen] = useState(false)

  return (
    <header className="w-full border-b border-border bg-white">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Island Combo"
            width={36}
            height={36}
            className="object-contain"
          />
          <span className="font-bold text-base md:text-lg text-brand">Island Combo</span>
        </Link>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-brand text-brand text-sm font-semibold px-5 py-2 hover:bg-brand hover:text-white transition-colors"
          >
            Browse Products
          </Link>
          <Link
            href="/cashvoucher"
            className="inline-flex items-center justify-center rounded-full bg-brand text-white text-sm font-semibold px-5 py-2 hover:bg-brand-hover transition-colors"
          >
            Send cash
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-foreground"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border px-4 py-3 flex flex-col gap-2">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-full border border-brand text-brand text-sm font-semibold px-5 py-2.5 hover:bg-brand hover:text-white transition-colors"
          >
            Browse Products
          </Link>
          <Link
            href="/cashvoucher"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-full bg-brand text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand-hover transition-colors"
          >
            Send cash
          </Link>
        </div>
      )}
    </header>
  )
}

export default CashVoucherNavbar
