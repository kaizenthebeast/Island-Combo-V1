"use client";

import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/shared/components/ui/carousel";
import type { BannerWithImage } from "@/shared/types/banner";

// Admin-managed slides come from the banners table (image_src is a signed URL
// into the private promotional-images bucket). Until the admin publishes one,
// the original static slides keep the homepage looking finished.

const fallbackSlides = [
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

function BannerSlide({ banner, isFirst }: { banner: BannerWithImage; isFirst: boolean }) {
  const overlay = (banner.description || banner.cta_label) && (
    <div className="absolute inset-0 z-10 flex flex-col items-start justify-end bg-gradient-to-t from-black/50 via-black/10 to-transparent p-6 md:p-10">
      <h2 className="text-white text-2xl md:text-4xl font-bold leading-tight drop-shadow">
        {banner.title}
      </h2>
      {banner.description && (
        <p className="mt-1 max-w-xl text-white/90 text-sm md:text-base drop-shadow">
          {banner.description}
        </p>
      )}
      {banner.cta_label && banner.cta_url && (
        <Link
          href={banner.cta_url}
          className="mt-4 rounded bg-white px-8 py-2 text-sm font-semibold text-brand hover:bg-brand-tint transition"
        >
          {banner.cta_label}
        </Link>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-[220px] md:h-[320px] bg-muted">
      {banner.image_src && (
        <Image
          src={banner.image_src}
          alt={banner.title}
          fill
          priority={isFirst}
          sizes="100vw"
          className="object-cover"
          unoptimized
        />
      )}
      {overlay}
    </div>
  );
}

export default function HeroBanner({ banners = [] }: { banners?: BannerWithImage[] }) {
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: false }));
  const liveBanners = banners.filter((banner) => banner.image_src);

  return (
    <div className="w-ful  overflow-hidden">
      <Carousel
        plugins={[plugin.current]}
        opts={{ loop: true }}
        className="w-full"
      >
        <CarouselContent>
          {liveBanners.length > 0
            ? liveBanners.map((banner, index) => (
                <CarouselItem key={banner.id}>
                  <BannerSlide banner={banner} isFirst={index === 0} />
                </CarouselItem>
              ))
            : fallbackSlides.map((slide) => (
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
