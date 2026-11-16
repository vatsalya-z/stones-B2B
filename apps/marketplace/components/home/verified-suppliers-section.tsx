"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ArrowRight, MapPin } from "lucide-react";
import type { PublicSeller } from "@/lib/db";

export interface VerifiedSuppliersSectionProps {
  sellers?: PublicSeller[];
}

const DEFAULT_SUPPLIERS = [
  {
    id: "sup-1",
    businessName: "Royal Makrana Marbles",
    slug: "royal-makrana-marbles",
    city: "Makrana",
    state: "Rajasthan",
    country: "India",
    image: "/images/suppliers/marble-processing-factory.jpg", // Active marble processing factory
    materials: "Makrana White Marble · Dungri · Kumari",
    yearsInBusiness: 35,
  },
  {
    id: "sup-2",
    businessName: "Galaxy Granite Exports",
    slug: "galaxy-granite-exports",
    city: "Ongole",
    state: "Andhra Pradesh",
    country: "India",
    image: "/images/suppliers/granite-processing-factory.jpg", // Processing facility
    materials: "Black Galaxy · Steel Grey · Tan Brown",
    yearsInBusiness: 24,
  },
  {
    id: "sup-3",
    businessName: "Thar Sandstone Industries",
    slug: "thar-sandstone-industries",
    city: "Dholpur",
    state: "Rajasthan",
    country: "India",
    image: "/images/hero/stone-quarry-hero.jpg", // Sandstone quarry/yard
    materials: "Dholpur Beige · Red Sandstone · CNC Jaalis",
    yearsInBusiness: 18,
  },
  {
    id: "sup-4",
    businessName: "Deccan Limestone Processors",
    slug: "deccan-limestone-processors",
    city: "Kota",
    state: "Rajasthan",
    country: "India",
    image: "/images/suppliers/stone-slab-warehouse.jpg", // Warehouse
    materials: "Kota Blue · Kota Brown · Natural Cleft",
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
        image: s.coverImageUrl || fallback?.image || "/images/suppliers/marble-processing-factory.jpg",
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
      (d) => !seenNames.has(d.businessName.trim().toLowerCase()),
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
    <section className="py-12 sm:py-16 bg-white border-b border-stone-200/80">
      <div className="container-wide">
        {/* Section Header with Eyebrow, Title and View All */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-300/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                <ShieldCheck className="h-3 w-3 text-amber-700" />
                Direct Quarry & Processing Hubs
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif sm:font-sans">
              Verified Indian Stone Suppliers
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 max-w-xl">
              Source factory-calibrated slabs, cut-to-size architectural tiles, and quarry blocks directly from certified processors across India.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            {/* Carousel Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="h-8 w-8 rounded-full border border-stone-200 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="h-8 w-8 rounded-full border border-stone-200 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              >
                ›
              </button>
            </div>

            <Link
              href="/suppliers"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs transition-all group cursor-pointer"
            >
              <span>Explore All Suppliers</span>
              <ArrowRight className="h-3.5 w-3.5 text-amber-600 transition-transform group-hover:translate-x-0.5" />
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
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-2xs hover:shadow-lg hover:border-amber-600/40 transition-all min-w-[260px]"
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
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 bg-stone-950/80 px-2 py-0.5 rounded backdrop-blur-xs border border-white/10">
                    {supplier.yearsInBusiness}+ Yrs Experience
                  </span>
                </div>
              </div>

              {/* Supplier Info Body */}
              <div className="p-4 sm:p-5 flex flex-1 flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-800 transition-colors truncate">
                    {supplier.businessName}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span>
                      {supplier.city}, {supplier.state}
                    </span>
                  </p>
                </div>

                <div className="space-y-2.5 pt-2.5 border-t border-stone-100">
                  {/* Verified Supplier Green Badge */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      Verified Processor
                    </span>
                    <span className="text-xs font-semibold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                      View Yard →
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
