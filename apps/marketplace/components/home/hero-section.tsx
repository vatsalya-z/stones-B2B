import React from "react";
import Link from "next/link";
import Image from "next/image";
import { HeroRequestQuoteButton } from "./hero-request-quote-button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-stone-950 text-white min-h-[560px] sm:min-h-[580px] lg:min-h-[640px] flex items-center">
      {/* Original Luxurious Symmetrical Marble Showroom Background with Enhanced Brightness & Lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/images/hero/luxurious-symmetrical-marble-showroom.jpg"
          alt="Luxurious Symmetrical Marble Showroom"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-110 contrast-105"
          unoptimized
        />
        {/* Soft Directional Scrim: Dark on left for text legibility, transparent on right to let original showroom lighting shine */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 via-50% to-black/20 lg:bg-gradient-to-r lg:from-black/65 lg:via-black/25 lg:via-40% lg:to-transparent" />
      </div>

      <div className="relative z-10 container-wide py-12 sm:py-16 lg:py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column (7 cols): Editorial Typography & Direct CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Upper Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-stone-900/90 border border-amber-600/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 shadow-sm backdrop-blur-md">
              <span>B2B Stone Sourcing Platform</span>
            </div>

            {/* Headline matching user reference image */}
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.15] drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
              Source Natural Stone{" "}
              <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600">
                Direct from Verified Suppliers
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-sm sm:text-base lg:text-lg text-stone-200 leading-relaxed font-normal max-w-xl drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
              A dedicated B2B marketplace for importers, architects, contractors and project buyers.
            </p>

            {/* Trust Indicators Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-stone-200">
              <div className="inline-flex items-center gap-2 rounded-lg bg-stone-900/80 border border-stone-800 px-3 py-1.5 backdrop-blur-xs">
                <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                <span>Verified Suppliers</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-stone-900/80 border border-stone-800 px-3 py-1.5 backdrop-blur-xs">
                <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <span>Bulk & Project Pricing</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-stone-900/80 border border-stone-800 px-3 py-1.5 backdrop-blur-xs">
                <svg className="h-4 w-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                </svg>
                <span>Pan India & Export Supply</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <HeroRequestQuoteButton />
              <Link
                href="#categories"
                className="inline-flex items-center justify-center rounded-xl border border-stone-700 bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white px-7 py-3.5 text-sm sm:text-base font-semibold transition-all"
              >
                Explore Categories
              </Link>
            </div>
          </div>

          {/* Right Column (5 cols): Authentic Upright Marble Slab Exhibition Card */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="relative rounded-2xl border border-stone-800 bg-stone-900/80 p-3.5 shadow-2xl backdrop-blur-md">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-stone-800 bg-stone-950">
                <Image
                  src="/images/hero/hero-marble-slabs-display.jpg"
                  alt="Makrana Pure White Marble Slab in Exhibition Gallery"
                  fill
                  sizes="(max-width: 1280px) 45vw, 540px"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/20 pointer-events-none" />

                <div className="absolute top-3.5 left-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-950/85 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/30 backdrop-blur-md shadow-sm">
                    <span>★</span> Featured Factory Lot
                  </span>
                </div>

                <div className="absolute bottom-3.5 right-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold text-stone-950 backdrop-blur-md shadow-sm">
                    <svg className="h-3.5 w-3.5 text-stone-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Verified Exporter
                  </span>
                </div>
              </div>

              {/* Specification Card Footer */}
              <div className="p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-stone-100">
                      Makrana Pure White Marble Slabs
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Origin: Makrana, Rajasthan · 18mm Gangsaw Slabs
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">Wholesale Rate</span>
                    <p className="text-base font-extrabold text-amber-400">
                      ₹420 <span className="text-xs font-normal text-stone-400">/ sq ft</span>
                    </p>
                  </div>
                </div>

                {/* Popular Stones Variety Navigation Row */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
                  <span className="font-medium text-stone-400">Popular Slabs:</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/products/black-galaxy-granite"
                      className="group relative h-9 w-9 overflow-hidden rounded-lg border border-stone-700 hover:border-amber-500 transition-colors"
                      title="Black Galaxy Granite"
                    >
                      <Image
                        src="/images/products/black-galaxy-granite.jpg"
                        alt="Black Galaxy Granite"
                        fill
                        sizes="36px"
                        className="object-cover"
                        unoptimized
                      />
                    </Link>
                    <Link
                      href="/products/dholpur-beige-sandstone"
                      className="group relative h-9 w-9 overflow-hidden rounded-lg border border-stone-700 hover:border-amber-500 transition-colors"
                      title="Dholpur Beige Sandstone"
                    >
                      <Image
                        src="/images/products/dholpur-beige-sandstone.jpg"
                        alt="Dholpur Beige Sandstone"
                        fill
                        sizes="36px"
                        className="object-cover"
                        unoptimized
                      />
                    </Link>
                    <Link
                      href="/products/rajasthan-green-marble"
                      className="group relative h-9 w-9 overflow-hidden rounded-lg border border-stone-700 hover:border-amber-500 transition-colors"
                      title="Rajasthan Green Marble"
                    >
                      <Image
                        src="/images/products/rajasthan-green-marble.jpg"
                        alt="Rajasthan Green Marble"
                        fill
                        sizes="36px"
                        className="object-cover"
                        unoptimized
                      />
                    </Link>
                    <Link
                      href="/products/classic-travertine-slab"
                      className="group relative h-9 w-9 overflow-hidden rounded-lg border border-stone-700 hover:border-amber-500 transition-colors"
                      title="Classic Travertine"
                    >
                      <Image
                        src="/images/products/classic-travertine-slab.jpg"
                        alt="Classic Travertine"
                        fill
                        sizes="36px"
                        className="object-cover"
                        unoptimized
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
