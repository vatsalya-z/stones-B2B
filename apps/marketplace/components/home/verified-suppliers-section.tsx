"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PublicSeller } from "@/lib/db";

export interface VerifiedSuppliersSectionProps {
  sellers?: PublicSeller[];
}

const DEFAULT_SUPPLIERS = [
  {
    id: "sup-1",
    businessName: "Rajputana Marbles",
    slug: "rajputana-marbles",
    city: "Makrana",
    state: "Rajasthan",
    country: "India",
    image: "/images/backgrounds/stone-texture.jpg", // Active marble quarry
    materials: "Marble · Granite · Onyx",
    yearsInBusiness: 35,
  },
  {
    id: "sup-2",
    businessName: "Galaxy Granite Exports",
    slug: "galaxy-granite-exports",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    image: "/images/suppliers/granite-processing-factory.jpg", // Processing facility
    materials: "Granite · Quartzite · Slabs",
    yearsInBusiness: 24,
  },
  {
    id: "sup-3",
    businessName: "The Sandstone Solution",
    slug: "the-sandstone-solution",
    city: "Dholpur",
    state: "Rajasthan",
    country: "India",
    image: "/images/suppliers/seaworthy-crate-packaging.jpg", // Sandstone quarry/yard
    materials: "Sandstone · Tiles · Blocks",
    yearsInBusiness: 18,
  },
  {
    id: "sup-4",
    businessName: "Deccan Limestone Co.",
    slug: "deccan-limestone",
    city: "Tandur",
    state: "Andhra Pradesh",
    country: "India",
    image: "/images/suppliers/stone-slab-warehouse.jpg", // Warehouse
    materials: "Limestone · Slabs · Pavers",
    yearsInBusiness: 20,
  },
];

export function VerifiedSuppliersSection({ sellers = [] }: VerifiedSuppliersSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Combine DB sellers with reference suppliers to ensure 4 cards
  const displaySuppliers = React.useMemo(() => {
    const fromDb = (sellers || []).map((s, idx) => {
      const fallback = DEFAULT_SUPPLIERS[idx % DEFAULT_SUPPLIERS.length];
      return {
        id: s.id,
        businessName: s.businessName,
        slug: s.slug,
        city: s.city || fallback?.city || "Rajasthan",
        state: s.state || fallback?.state || "India",
        country: s.country || fallback?.country || "India",
        image: s.coverImageUrl || fallback?.image || "/images/backgrounds/stone-texture.jpg",
        materials: s.businessType || fallback?.materials || "Marble · Granite · Quartzite",
        yearsInBusiness: s.yearsInBusiness || fallback?.yearsInBusiness || 15,
      };
    });

    const seenNames = new Set<string>();
    const uniqueFromDb = [];
    for (const s of fromDb) {
      const normalized = s.businessName.trim().toLowerCase();
      if (!seenNames.has(normalized)) {
        seenNames.add(normalized);
        uniqueFromDb.push(s);
      }
    }

    const backfill = DEFAULT_SUPPLIERS.filter(
      (d) => !seenNames.has(d.businessName.trim().toLowerCase())
    );
    return [...uniqueFromDb, ...backfill].slice(0, 4);
  }, [sellers]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -340 : 340;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 sm:py-16 bg-white border-t border-stone-200/70">
      <div className="container-wide">
        {/* Section Header with Carousel Arrows and View All */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Verified Suppliers & Quarries
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 max-w-xl">
              Source directly from pre-verified stone suppliers, quarries and exporters.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            {/* Carousel Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="h-8 w-8 rounded-full border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 flex items-center justify-center transition-colors shadow-2xs"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="h-8 w-8 rounded-full border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 flex items-center justify-center transition-colors shadow-2xs"
              >
                ›
              </button>
            </div>

            <Link
              href="/suppliers"
              className="text-xs sm:text-sm font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 transition-colors group pl-2"
            >
              <span>View All Suppliers</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

        {/* 4 Suppliers Horizontal Scroll / Grid */}
        <div
          ref={scrollRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto scrollbar-none pb-2"
        >
          {displaySuppliers.map((supplier) => (
            <Link
              key={supplier.id}
              href={`/suppliers/${supplier.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-2xs hover:shadow-lg hover:border-amber-600/30 transition-all min-w-[260px]"
            >
              {/* Quarry / Facility Photography */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
                <Image
                  src={supplier.image}
                  alt={`${supplier.businessName} Quarry and Factory Facility`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 bg-stone-950/80 px-2 py-0.5 rounded backdrop-blur-xs">
                    {supplier.yearsInBusiness}+ Yrs Industry Experience
                  </span>
                </div>
              </div>

              {/* Supplier Info Body */}
              <div className="p-4 sm:p-5 flex flex-1 flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                    {supplier.businessName}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span>
                      {supplier.city}, {supplier.state}
                    </span>
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-100">
                  {/* Verified Supplier Green Badge */}
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Verified Supplier
                    </span>
                  </div>

                  {/* Materials Tagline */}
                  <p className="text-xs text-stone-600 font-medium truncate">
                    {supplier.materials}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
