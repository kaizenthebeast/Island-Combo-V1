"use client";

import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const slides = [
  {
    id: 1,
    tag: "Special Offer",
    title: "Christmas",
    highlight: "Big Sale",
    offer: "UP TO 60% OFF",
    bg: "bg-brand",
  },
  {
    id: 2,
    tag: "Limited Time",
    title: "New Year",
    highlight: "Mega Deals",
    offer: "UP TO 50% OFF",
    bg: "bg-brand-hover",
  },
  {
    id: 3,
    tag: "Exclusive",
    title: "Flash",
    highlight: "Sale Event",
    offer: "UP TO 70% OFF",
    bg: "bg-brand",
  },
];

export default function HeroBanner() {
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: false }));

  return (
    <div className="w-ful  overflow-hidden">
      <Carousel
        plugins={[plugin.current]}
        opts={{ loop: true }}
        className="w-full"
      >
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide.id}>
              <div
                className={`relative w-full h-[220px] md:h-[320px] ${slide.bg} transition-colors duration-500`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
                  <p className="text-warning text-xs tracking-[0.25em] uppercase font-medium mb-2">
                    {slide.tag}
                  </p>
                  <h1 className="text-white text-4xl md:text-5xl font-bold leading-tight">
                    {slide.title}
                  </h1>
                  <h2 className="text-warning text-4xl md:text-5xl font-bold leading-tight mb-2">
                    {slide.highlight}
                  </h2>
                  <p className="text-white text-sm tracking-[0.3em] font-semibold mb-5">
                    {slide.offer}
                  </p>
                  <button className="bg-white text-brand text-sm font-semibold px-8 py-2 rounded hover:bg-brand-tint transition">
                    SHOP NOW
                  </button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}