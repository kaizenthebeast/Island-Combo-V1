import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

const SampleProductCard = () => {
  return (
    <Card className="w-[224px] h-[336px] border-none shadow-none relative overflow-hidden flex flex-col cursor-pointer ">
      
      {/* Badge */}
      <div className="absolute top-0 right-0 bg-[#900036] text-white text-xs px-3 py-1 rounded-tr-md rounded-bl-md z-10">
        Wholesale available
      </div>

      {/* Image */}
      <div className="relative w-full h-[180px] flex items-center justify-center">
        <Image
          src="/images/bug.png"
          alt="product"
          fill
          className="object-fill"
          sizes="224px"
          priority
        />
      </div>

      {/* Content */}
      <CardContent className="px-0 pt-2 pb-0 space-y-1 flex-1">
        
        <h3 className="text-sm font-medium leading-snug line-clamp-2">
          Gamma 24” Medium Hard Case Zipperless
        </h3>

        <p className="text-lg font-semibold">$4,000.00</p>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400 line-through">
            $3,500.00
          </span>
          <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded">
            -30%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SampleProductCard;
