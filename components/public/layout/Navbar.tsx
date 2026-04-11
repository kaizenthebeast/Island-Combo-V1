import React from 'react'
import { Suspense } from "react";
import { AuthButton } from "@/components/functional-ui/auth-button";
import Link from "next/link";
import Image from 'next/image';

const Navbar = () => {
    return (
        <header>
            <nav className="w-full flex justify-center h-16">
                <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                    {/* LOGO */}
                    <div className="flex gap-5 items-center font-semibold">
                        <Link href={"/"} className='flex items-center gap-3'>
                            <Image src="/images/logo.png"
                                alt="Logo"
                                width={50}
                                height={50}
                                className="object-contain" />
                            <h5 className="font-bold text-xl text-[#900036]">
                                Island Combo
                            </h5>
                        </Link>

                    </div>
                    {/* SEARCH BAR */}
                    <div>

                    </div>

                    {/* CART/ SIGN */}
                    <Suspense>
                        <AuthButton />
                    </Suspense>

                </div>
            </nav>
        </header>
    )
}

export default Navbar