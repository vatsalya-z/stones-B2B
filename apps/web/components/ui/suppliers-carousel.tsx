"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { SupplierCard } from "@/components/ui/supplier-card";
import type { PublicSeller } from "@/lib/db";

interface SuppliersCarouselProps {
  sellers: PublicSeller[];
}

export function SuppliersCarousel({ sellers }: SuppliersCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const scrollBy = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-supplier-card]")?.clientWidth ?? 300;
    el.scrollBy({ left: dir === "right" ? cardWidth + 24 : -(cardWidth + 24), behavior: "smooth" });
  }, []);

  return (
    <div className="mt-8">
      {/* Horizontal scrollable row */}
      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {sellers.map((s) => (
          <div
            key={s.id}
            data-supplier-card
            className="flex-none w-72 sm:w-80"
            style={{ scrollSnapAlign: "start" }}
          >
            <SupplierCard
              id={s.id}
              slug={s.slug}
              businessName={s.businessName}
              businessType={s.businessType}
              logoUrl={s.logoUrl}
              city={s.city}
              state={s.state}
              description={s.description}
              yearsInBusiness={s.yearsInBusiness}
              verifiedAt={s.verifiedAt}
              productCount={s.productCount}
              materialCapabilities={s.materialCapabilities}
            />
          </div>
        ))}
      </div>

      {/* Center navigation — arrows + Explore All button */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {/* Prev arrow */}
        <button
          onClick={() => scrollBy("left")}
          disabled={!canScrollLeft}
          aria-label="Previous suppliers"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-stone-300 bg-white text-stone-600 shadow-sm transition-all hover:border-amber-500 hover:text-amber-700 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Explore All Suppliers */}
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:border-amber-500 hover:bg-amber-50 hover:text-amber-800 hover:shadow-md"
        >
          Explore All Suppliers
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Next arrow */}
        <button
          onClick={() => scrollBy("right")}
          disabled={!canScrollRight}
          aria-label="Next suppliers"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-stone-300 bg-white text-stone-600 shadow-sm transition-all hover:border-amber-500 hover:text-amber-700 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
