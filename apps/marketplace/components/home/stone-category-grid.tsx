"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  Layers,
  Mountain,
  Compass,
  Gem,
} from "lucide-react";
import { cn } from "@stone/ui";
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

const GEOLOGICAL_TABS: {
  id: GeologicalTab;
  title: string;
  categoryNames: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "all",
    title: "All Stones",
    categoryNames: "All Collections",
    count: 9,
    icon: Layers,
  },
  {
    id: "metamorphic",
    title: "Marble & Slate",
    categoryNames: "Metamorphic",
    count: 2,
    icon: Sparkles,
  },
  {
    id: "igneous",
    title: "Granite",
    categoryNames: "Igneous",
    count: 1,
    icon: Mountain,
  },
  {
    id: "sedimentary",
    title: "Sandstone & Limestone",
    categoryNames: "Sedimentary",
    count: 4,
    icon: Compass,
  },
  {
    id: "exotic",
    title: "Onyx & Semi-Precious",
    categoryNames: "Exotic",
    count: 2,
    icon: Gem,
  },
];

const CATEGORY_ITEMS: StoneCategoryCardData[] = [
  {
    id: "sandstone",
    name: "Sandstone",
    slug: "sandstone",
    group: "sedimentary",
    geologyBadge: "Sedimentary Quartzite",
    origin: "Dholpur, Jodhpur & Bundi",
    availableLots: "22+ Lots",
    image: "/images/products/dholpur-beige-sandstone.webp",
  },
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
    id: "semi-precious-stone",
    name: "Semi Precious Stone",
    slug: "semi-precious-stone",
    group: "exotic",
    geologyBadge: "Rare Minerals & Gemstones",
    origin: "Rajasthan & Gujarat Lapidary",
    availableLots: "14+ Lots",
    image: "/images/categories/semi-precious-stones.jpg",
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
  {
    id: "slate",
    name: "Slate Stone",
    slug: "slate",
    group: "metamorphic",
    geologyBadge: "Foliated Metamorphic",
    origin: "Kund & Rewari Belt",
    availableLots: "16+ Lots",
    image: "/images/products/kund-black-slate.webp",
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
    id: "pebbles",
    name: "Pebbles",
    slug: "pebbles",
    group: "sedimentary",
    geologyBadge: "River Stone & Aggregates",
    origin: "Himalayan & River Formations",
    availableLots: "8+ Lots",
    image: "/images/categories/decorative-stone.jpg",
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
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-5 border-b border-stone-200/80">
          <div className="space-y-2 max-w-2xl text-center sm:text-left mx-auto sm:mx-0">
            <div className="flex justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-800 border border-amber-600/20 shadow-2xs">
                <Sparkles className="h-3 w-3 text-amber-600" />
                <span>Curated Stone Collections</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-stone-950 tracking-tight font-serif sm:font-sans">
              Explore by Stone Category
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              <span className="hidden sm:inline">
                Source factory-finished slabs, cut-to-size architectural tiles, and quarry blocks directly from certified processors across India&apos;s heritage stone hubs.
              </span>
              <span className="sm:hidden">
                Factory-finished slabs, cut-to-size tiles &amp; quarry blocks from certified Indian stone hubs.
              </span>
            </p>
          </div>

          {/* Luxury Geological Family Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 -mx-1 sm:mx-0 sm:flex-wrap self-center lg:self-auto max-w-full shrink-0">
            {GEOLOGICAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              const count = tab.id === "all" ? resolvedItems.length : tab.count;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "group relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer active:scale-95",
                    isSelected
                      ? "bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-amber-400 shadow-md border border-amber-500/40 ring-1 ring-amber-500/20"
                      : "bg-white text-stone-700 hover:text-stone-950 hover:bg-stone-50 border border-stone-200/90 shadow-2xs hover:border-amber-500/40",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      isSelected
                        ? "text-amber-400"
                        : "text-stone-400 group-hover:text-amber-600",
                    )}
                  />
                  <span className="tracking-tight">{tab.title}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none shrink-0 transition-colors",
                      isSelected
                        ? "bg-amber-500 text-stone-950"
                        : "bg-stone-100 text-stone-600 group-hover:bg-amber-100 group-hover:text-amber-900",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact, Clean Category Grid (2 cols mobile, 4 cols desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
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
              <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 space-y-1.5 sm:space-y-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-950 group-hover:text-amber-700 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-1 font-medium mt-0.5">
                    {cat.origin}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] sm:text-xs font-semibold text-amber-700 group-hover:text-amber-800">
                  <span className="hidden sm:inline">Explore Collection</span>
                  <span className="sm:hidden">Explore</span>
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
