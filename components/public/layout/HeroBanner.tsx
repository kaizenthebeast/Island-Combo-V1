"use client";

import { useState } from "react";
import Image from "next/image";

const slides = [
  {
    id: 1,
    tag: "Special Offer",
    title: "Christmas",
    highlight: "Big Sale",
    offer: "UP TO 60% OFF",
    bg: "bg-red-600",
  },
  {
    id: 2,
    tag: "Limited Time",
    title: "New Year",
    highlight: "Mega Deals",
    offer: "UP TO 50% OFF",
    bg: "bg-red-700",
  
  },
  {
    id: 3,
    tag: "Exclusive",
    title: "Flash",
    highlight: "Sale Event",
    offer: "UP TO 70% OFF",
    bg: "bg-rose-700",
  
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  return (
    <div className="w-full rounded-xl overflow-hidden relative">
      <div className={`relative w-full h-[220px] md:h-[320px] ${slide.bg} transition-colors duration-500`}>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
          <p className="text-yellow-300 text-xs tracking-[0.25em] uppercase font-medium mb-2">
            {slide.tag}
          </p>
          <h1 className="text-white text-4xl md:text-5xl font-bold leading-tight">
            {slide.title}
          </h1>
          <h2 className="text-yellow-300 text-4xl md:text-5xl font-bold leading-tight mb-2">
            {slide.highlight}
          </h2>
          <p className="text-white text-sm tracking-[0.3em] font-semibold mb-5">
            {slide.offer}
          </p>
          <button className="bg-white text-red-600 text-sm font-semibold px-8 py-2 rounded hover:bg-gray-100 transition">
            SHOP NOW
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-2 py-3 bg-white border-t border-gray-100">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === current ? "bg-red-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}