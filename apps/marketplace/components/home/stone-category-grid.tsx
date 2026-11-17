"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import type { CategoryItem } from "@/lib/db";

export interface StoneCategoryGridProps {
  categories?: CategoryItem[];
}

export type GeologicalTab = "all" | "metamorphic" | "igneous" | "sedimentary" | "exotic";

export interface StoneCategoryCardData {
  id: string;
  name: string;
  slug: string;
  group: "metamorphic" | "igneous" | "sedimentary" | "exotic";
  geologyBadge: string;
  origin: string;
  availableLots: string;
  image: string;
}

const CATEGORY_ITEMS: StoneCategoryCardData[] = [
  {
    id: "marble",
    name: "Marble",
    slug: "marble",
    group: "metamorphic",
    geologyBadge: "Metamorphic Calcite",
    origin: "Makrana, Rajsamand & Udaipur",
    availableLots: "28+ Lots",
    image: "/images/products/makrana-white-marble.webp",
  },
  {
    id: "granite",
    name: "Granite",
    slug: "granite",
    group: "igneous",
    geologyBadge: "Igneous Plutonic",
    origin: "Ongole, Jalore & Rajsamand",
    availableLots: "34+ Lots",
    image: "/images/products/black-galaxy-granite.webp",
  },
  {
    id: "sandstone",
    name: "Sandstone",
    slug: "sandstone",
    group: "sedimentary",
    geologyBadge: "Sedimentary Quartzite",
    origin: "Dholpur, Jodhpur & Bharatpur",
    availableLots: "22+ Lots",
    image: "/images/products/dholpur-beige-sandstone.webp",
  },
  {
    id: "limestone",
    name: "Limestone",
    slug: "limestone",
    group: "sedimentary",
    geologyBadge: "Sedimentary Carbonate",
    origin: "Kota, Ramganj Mandi & Tandur",
    availableLots: "19+ Lots",
    image: "/images/products/kota-blue-limestone.webp",
  },
  {
    id: "onyx",
    name: "Onyx",
    slug: "onyx",
    group: "exotic",
    geologyBadge: "Cryptocrystalline Gemstone",
    origin: "Salumber & Translucent Reserves",
    availableLots: "12+ Lots",
    image: "/images/products/honey-onyx-translucent.webp",
  },
  {
    id: "quartzite",
    name: "Quartzite",
    slug: "quartzite",
    group: "metamorphic",
    geologyBadge: "Non-Foliated Metamorphic",
    origin: "Deoli, Bhilwara & Himachal",
    availableLots: "16+ Lots",
    image: "/images/products/silver-white-quartzite.webp",
  },
  {
    id: "slate",
    name: "Slate",
    slug: "slate",
    group: "metamorphic",
    geologyBadge: "Foliated Metamorphic",
    origin: "Kund & Rewari Belt",
    availableLots: "14+ Lots",
    image: "/images/products/kund-black-slate.webp",
  },
  {
    id: "travertine",
    name: "Travertine",
    slug: "travertine",
    group: "sedimentary",
    geologyBadge: "Terrestrial Carbonate",
    origin: "Kishangarh & Imported Reserves",
    availableLots: "15+ Lots",
    image: "/images/products/classic-travertine-slab.webp",
  },
];

export function StoneCategoryGrid({ categories }: StoneCategoryGridProps) {
  const [activeTab, setActiveTab] = useState<GeologicalTab>("all");

  // Map db category images if present while strictly preserving the 8 core categories
  const resolvedItems = useMemo(() => {
    return CATEGORY_ITEMS.map((item) => {
      const dbCat = categories?.find(
        (c) =>
          c.slug.toLowerCase() === item.slug.toLowerCase() ||
          c.name.toLowerCase() === item.name.toLowerCase(),
      );
      return {
        ...item,
        image: dbCat?.image_url || item.image,
        slug: dbCat?.slug || item.slug,
      };
    });
  }, [categories]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return resolvedItems;
    return resolvedItems.filter((item) => item.group === activeTab);
  }, [resolvedItems, activeTab]);

  return (
    <section className="py-10 sm:py-14 bg-stone-50/70 border-t border-b border-stone-200/80">
      <div className="container-wide space-y-6 sm:space-y-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-stone-200/80">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 border border-amber-500/20">
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span>Curated Geological Collections</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight font-serif sm:font-sans">
              Explore by Stone Category
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Source factory-calibrated slabs, cut-to-size architectural tiles, and quarry blocks directly from certified processors across India&apos;s heritage stone hubs.
            </p>
          </div>

          {/* Compact Geological Family Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-stone-200/90 shadow-2xs shrink-0 overflow-x-auto no-scrollbar scrollbar-hide max-w-full sm:flex-wrap self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              All Stones ({resolvedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("metamorphic")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "metamorphic"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              Metamorphic (3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("igneous")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "igneous"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              Igneous (1)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sedimentary")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "sedimentary"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              Sedimentary (3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("exotic")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "exotic"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              Exotic (1)
            </button>
          </div>
        </div>

        {/* Compact, Clean Category Grid (2 cols mobile, 4 cols desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredItems.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-2xs hover:shadow-lg hover:border-amber-600/40 transition-all duration-300"
            >
              {/* Compact Image Frame */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
                <Image
                  src={cat.image}
                  alt={`${cat.name} natural stone`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/15 to-transparent opacity-85 group-hover:opacity-65 transition-opacity" />

                {/* Top Right Live Lot Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <span className="inline-flex items-center rounded-full bg-stone-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-white/10 shadow-2xs">
                    {cat.availableLots}
                  </span>
                </div>

                {/* Classification Chip on Bottom Left of Image */}
                <div className="absolute bottom-2.5 left-2.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-stone-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-white/10">
                    {cat.geologyBadge}
                  </span>
                </div>
              </div>

              {/* Compact Clean Body */}
              <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 space-y-2">
                <div>
                  <h3 className="text-base font-bold text-stone-950 group-hover:text-amber-700 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-stone-500 line-clamp-1 font-medium mt-0.5">
                    {cat.origin}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-amber-700 group-hover:text-amber-800">
                  <span>Explore Collection</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
