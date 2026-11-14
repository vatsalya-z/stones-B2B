"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ProductSummary } from "@/lib/db";

const TABS = [
  { label: "All Materials", value: "all" },
  { label: "Marble", value: "marble" },
  { label: "Granite", value: "granite" },
  { label: "Sandstone", value: "sandstone" },
  { label: "Limestone", value: "limestone" },
  { label: "Quartzite", value: "quartzite" },
];

export interface FeaturedMaterialsSectionProps {
  initialProducts?: ProductSummary[];
}

// Fallback showcase items matching reference mockup exactly
const CURATED_MATERIALS = [
  {
    id: "curated-1",
    name: "Makrana Pure White Marble",
    slug: "makrana-white-marble",
    materialType: "Marble",
    sellerName: "Rajputana Exporters",
    sellerSlug: "rajputana-marbles",
    isVerifiedSeller: true,
    primaryImage: "/images/products/makrana-white-marble.jpg",
    tags: ["Slab", "Block", "Custom Size"],
    price: 420,
    unit: "sq_ft",
    currency: "INR",
  },
  {
    id: "curated-2",
    name: "Black Galaxy Granite",
    slug: "black-galaxy-granite",
    materialType: "Granite",
    sellerName: "Galaxy Granite Exports",
    sellerSlug: "galaxy-granite-exports",
    isVerifiedSeller: true,
    primaryImage: "/images/products/black-galaxy-granite.jpg",
    tags: ["Slab", "Tile", "Countertop"],
    price: 280,
    unit: "sq_ft",
    currency: "INR",
  },
  {
    id: "curated-3",
    name: "Dholpur Beige Sandstone",
    slug: "dholpur-beige-sandstone",
    materialType: "Sandstone",
    sellerName: "The Sandstone Solution",
    sellerSlug: "the-sandstone-solution",
    isVerifiedSeller: true,
    primaryImage: "/images/products/dholpur-beige-sandstone.jpg",
    tags: ["Slab", "Tile", "Project Supply"],
    price: 110,
    unit: "sq_ft",
    currency: "INR",
  },
  {
    id: "curated-4",
    name: "Statuario Classic Marble",
    slug: "statuario-classic-marble",
    materialType: "Marble",
    sellerName: "Rajasthan Stone Traders",
    sellerSlug: "rajasthan-stone-traders",
    isVerifiedSeller: true,
    primaryImage: "/images/products/rajasthan-green-marble.jpg",
    tags: ["Slab", "Block", "Custom Size"],
    price: 650,
    unit: "sq_ft",
    currency: "INR",
  },
  {
    id: "curated-5",
    name: "Kota Blue Limestone",
    slug: "kota-blue-limestone",
    materialType: "Limestone",
    sellerName: "Kota Stone Industries",
    sellerSlug: "kota-stone-industries",
    isVerifiedSeller: true,
    primaryImage: "/images/products/kota-blue-limestone.jpg",
    tags: ["Slab", "Tile", "Paver"],
    price: 55,
    unit: "sq_ft",
    currency: "INR",
  },
  {
    id: "curated-6",
    name: "Travertine Beige Architectural",
    slug: "classic-travertine-slab",
    materialType: "Travertine",
    sellerName: "Classic Stones",
    sellerSlug: "classic-stones",
    isVerifiedSeller: true,
    primaryImage: "/images/products/classic-travertine-slab.jpg",
    tags: ["Slab", "Tile", "Wall Cladding"],
    price: 320,
    unit: "sq_ft",
    currency: "INR",
  },
];

export function FeaturedMaterialsSection({ initialProducts = [] }: FeaturedMaterialsSectionProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Merge DB products with showcase data to ensure 6 high quality cards
  const allItems = React.useMemo(() => {
    const formattedDb = (initialProducts || []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      materialType: p.materialType || "Natural Stone",
      sellerName: p.sellerName || "Verified Supplier",
      sellerSlug: p.sellerSlug || "verified-supplier",
      isVerifiedSeller: Boolean(p.isVerifiedSeller),
      primaryImage: p.primaryImage || "/images/products/makrana-white-marble.jpg",
      tags: [p.materialType || "Stone", p.finish || "Polished", "Custom Lot"].filter(Boolean),
      price: p.price,
      unit: p.unit || "sq_ft",
      currency: p.currency || "INR",
    }));

    // If DB has fewer than 6, blend curated items without duplicate slugs
    const existingSlugs = new Set(formattedDb.map((p) => p.slug));
    const backfill = CURATED_MATERIALS.filter((c) => !existingSlugs.has(c.slug));
    return [...formattedDb, ...backfill].slice(0, 6);
  }, [initialProducts]);

  const filteredItems = React.useMemo(() => {
    if (activeTab === "all") return allItems;
    return allItems.filter(
      (item) => item.materialType.toLowerCase() === activeTab.toLowerCase()
    );
  }, [allItems, activeTab]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="py-12 sm:py-16 bg-[#FDFBF7] border-t border-stone-200/70">
      <div className="container-wide">
        {/* Header with Title and Filter Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Featured Stone Materials
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 max-w-xl">
              Curated stone products by verified suppliers with bulk pricing and project support.
            </p>
          </div>

          {/* Filter Tabs matching reference image */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.value
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:border-stone-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6 Products Grid matching Reference Mockup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((product) => {
            const isFav = favorites[product.id];
            return (
              <div
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-2xs hover:shadow-lg hover:border-amber-600/30 transition-all"
              >
                {/* Product Image Frame */}
                <Link
                  href={`/products/${product.slug}`}
                  className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100 block"
                >
                  <Image
                    src={product.primaryImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/10 transition-colors" />

                  {/* Favorite Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(product.id, e)}
                    aria-label="Save to shortlist"
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-stone-700 hover:text-red-500 shadow-sm flex items-center justify-center backdrop-blur-xs transition-colors"
                  >
                    <svg
                      className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : "fill-none text-stone-600"}`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                  </button>
                </Link>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex flex-1 flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Supplier Row with Verified Badge */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-stone-700 font-medium truncate max-w-[140px]">
                        {product.sellerName}
                      </span>
                      {product.isVerifiedSeller && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                          <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Verified Supplier
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <Link href={`/products/${product.slug}`} className="block">
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Attribute Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {product.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-block text-[11px] font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Row: Get Bulk Price & Request Quote */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-xs sm:text-sm font-semibold text-stone-700 hover:text-amber-700 transition-colors"
                    >
                      Get Bulk Price
                    </Link>

                    <Link
                      href={`/request-quote?product=${encodeURIComponent(product.name)}`}
                      className="inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Request Quote
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
