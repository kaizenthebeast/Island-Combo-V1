import React from "react";
import { Phone, Mail, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="w-full bg-[#F8FBFF] py-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-items-center">

        {/* Logo */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={100}
              height={100}
              className="object-contain"
            />
            <h2 className="font-bold text-2xl text-[#900036]">
              Island Combo
            </h2>
          </div>

          <p className="text-gray-500 text-sm mt-2">
            ©2026 All Rights Reserved. Island Combo
          </p>
        </div>

        {/* Contact */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="font-semibold text-xl">Contact us</h1>

          <ul className="flex flex-col space-y-4 text-sm mt-6 text-gray-700 items-center md:items-start">
            <li className="flex gap-3 items-center">
              <Phone size={18} />
              <span>320-6666</span>
            </li>
            <li className="flex gap-3 items-center">
              <Mail size={18} />
              <span>islandcombopni@gmail.com</span>
            </li>
            <li className="flex gap-3 items-center">
              <MapPin size={18} />
              <span className="text-center md:text-left">
                Dolonier, Kolonia, Federated States of Micronesia
              </span>
            </li>
          </ul>
        </div>

        {/* About */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="font-semibold text-xl">About Us</h1>

          <ul className="flex flex-col space-y-4 text-sm mt-6 text-gray-700 items-center md:items-start">
            <li>
              <Link href="/" className="inline-block hover:text-black">
                Who we are
              </Link>
            </li>

            <li>
              <Link href="/terms" className="inline-block hover:text-black">
                Terms and Condition
              </Link>
            </li>

            <li>
              <Link href="/privacy" className="inline-block hover:text-black">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

      </div>
    </footer>
  );
};

export default Footer;