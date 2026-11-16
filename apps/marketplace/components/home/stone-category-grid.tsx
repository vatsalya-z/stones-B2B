"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Layers } from "lucide-react";
import { useRfqModal } from "@/features/rfq/rfq-modal-context";
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
  subtitle: string;
  origin: string;
  finishes: string;
  thicknesses: string;
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
    subtitle: "Recrystallized calcite and dolomitic marble with soft crystalline veining and bookmatched slab formats.",
    origin: "Makrana, Rajsamand & Udaipur (Rajasthan)",
    finishes: "Mirror Polished · Honed · Leathered",
    thicknesses: "16mm · 18mm · 20mm · 30mm",
    availableLots: "28+ Verified Lots",
    image: "/images/products/makrana-white-marble.webp",
  },
  {
    id: "granite",
    name: "Granite",
    slug: "granite",
    group: "igneous",
    geologyBadge: "Igneous Plutonic",
    subtitle: "Scratch and thermal-resistant quartz-feldspar stone engineered for heavy commercial and kitchen installations.",
    origin: "Ongole (AP) · Jalore & Rajsamand (Rajasthan)",
    finishes: "Mirror Polished · Flamed · Leathered",
    thicknesses: "18mm · 20mm · 30mm",
    availableLots: "34+ Verified Lots",
    image: "/images/products/black-galaxy-granite.webp",
  },
  {
    id: "sandstone",
    name: "Sandstone",
    slug: "sandstone",
    group: "sedimentary",
    geologyBadge: "Sedimentary Quartzite",
    subtitle: "Weather-resistant silica-bound sedimentary stone prized for historical facades, exterior paving, and CNC jaalis.",
    origin: "Dholpur, Jodhpur & Bharatpur (Rajasthan)",
    finishes: "Natural Cleft · Honed · Sandblasted",
    thicknesses: "18mm · 20mm · 25mm · 30mm",
    availableLots: "22+ Verified Lots",
    image: "/images/products/dholpur-beige-sandstone.webp",
  },
  {
    id: "limestone",
    name: "Limestone",
    slug: "limestone",
    group: "sedimentary",
    geologyBadge: "Sedimentary Carbonate",
    subtitle: "Fine-grained calcite stone celebrated for uniform non-slip texture, mirror polish, and high compressive strength.",
    origin: "Kota & Ramganj Mandi (Rajasthan) · Tandur",
    finishes: "Natural Cleft · Mirror Polish · River Washed",
    thicknesses: "20mm · 22mm Calibrated · 25mm",
    availableLots: "19+ Verified Lots",
    image: "/images/products/kota-blue-limestone.webp",
  },
  {
    id: "onyx",
    name: "Onyx",
    slug: "onyx",
    group: "exotic",
    geologyBadge: "Cryptocrystalline Gemstone",
    subtitle: "Translucent chalcedony quartz bands that radiate ambient light when backlit, for statement architectural portals.",
    origin: "Salumber (Rajasthan) & Exotic Imported",
    finishes: "Translucent Diamond Polish · Resin Matrix",
    thicknesses: "16mm · 18mm · 20mm",
    availableLots: "12+ Verified Lots",
    image: "/images/products/honey-onyx-translucent.webp",
  },
  {
    id: "quartzite",
    name: "Quartzite",
    slug: "quartzite",
    group: "metamorphic",
    geologyBadge: "Non-Foliated Metamorphic",
    subtitle: "Pure quartz sandstone recrystallized into Mohs 7 hardness slabs combining marble elegance with superior durability.",
    origin: "Deoli & Bhilwara (Rajasthan) · Himachal",
    finishes: "Leathered · Brushed · Honed · Polished",
    thicknesses: "15mm · 20mm · 30mm",
    availableLots: "16+ Verified Lots",
    image: "/images/products/silver-white-quartzite.webp",
  },
  {
    id: "slate",
    name: "Slate",
    slug: "slate",
    group: "metamorphic",
    geologyBadge: "Foliated Metamorphic",
    subtitle: "Dense foliated natural stone cleaving into tactile sheets with exceptional weather and freeze-thaw endurance.",
    origin: "Kund & Rewari Belt (Haryana) · AP",
    finishes: "Natural Split / Cleft · Calibrated Honed",
    thicknesses: "10mm · 12mm · 15mm · 20mm",
    availableLots: "14+ Verified Lots",
    image: "/images/products/kund-black-slate.webp",
  },
  {
    id: "travertine",
    name: "Travertine",
    slug: "travertine",
    group: "sedimentary",
    geologyBadge: "Terrestrial Carbonate",
    subtitle: "Warm, textured sedimentary stone with characteristic fibrous cavities, available in vein-cut and cross-cut faces.",
    origin: "Kishangarh Formations & Imported Stocks",
    finishes: "Vein Cut · Cross Cut · Filled & Honed",
    thicknesses: "18mm · 20mm · 30mm",
    availableLots: "15+ Verified Lots",
    image: "/images/products/classic-travertine-slab.webp",
  },
];

export function StoneCategoryGrid({ categories }: StoneCategoryGridProps) {
  const [activeTab, setActiveTab] = useState<GeologicalTab>("all");
  const { openRfqModal } = useRfqModal();

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
    <section className="py-14 sm:py-20 bg-stone-50/70 border-t border-b border-stone-200/80">
      <div className="container-wide space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-stone-200/80">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 border border-amber-500/20">
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span>Curated Geological Collections</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-950 tracking-tight">
              Explore by Stone Category
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Source factory-calibrated slabs, cut-to-size architectural tiles, and quarry blocks directly from certified processors across India&apos;s heritage stone hubs.
            </p>
          </div>

          {/* Geological Family Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "exotic"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              Exotic (1)
            </button>
          </div>
        </div>

        {/* 4-Column Luxury Architectural Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((cat) => (
            <article
              key={cat.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs hover:shadow-xl hover:border-[#E87500]/60 transition-all duration-300"
            >
              {/* Image Frame */}
              <Link
                href={`/products?category=${cat.slug}`}
                className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100 block"
                aria-label={`Explore ${cat.name} Collection`}
              >
                <Image
                  src={cat.image}
                  alt={`${cat.name} natural stone texture and calibrated slab`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-106"
                />
                {/* Subtle soft vignette for image depth and title readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent opacity-85 group-hover:opacity-65 transition-opacity" />

                {/* Top Left Classification Badge */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-stone-800 border border-stone-200/80 shadow-2xs">
                    <Layers className="h-3 w-3 text-[#E87500]" />
                    <span>{cat.geologyBadge}</span>
                  </span>
                </div>

                {/* Top Right Live Lot Counter */}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center rounded-full bg-emerald-600/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                    {cat.availableLots}
                  </span>
                </div>

                {/* Stone Title on Image Base */}
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="font-serif text-2xl font-bold tracking-tight text-white drop-shadow-sm group-hover:text-amber-200 transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </Link>

              {/* Clean White Card Content Body */}
              <div className="p-5 flex flex-1 flex-col justify-between space-y-4">
                <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed font-normal">
                  {cat.subtitle}
                </p>

                {/* Technical Specifications Matrix */}
                <div className="space-y-1.5 pt-3 border-t border-stone-100 text-xs text-stone-600">
                  <p className="truncate">
                    <span className="font-semibold text-stone-800">Quarry Hubs: </span>
                    <span>{cat.origin}</span>
                  </p>
                  <p className="truncate">
                    <span className="font-semibold text-stone-800">Finishes: </span>
                    <span>{cat.finishes}</span>
                  </p>
                  <p className="truncate">
                    <span className="font-semibold text-stone-800">Calibrated: </span>
                    <span>{cat.thicknesses}</span>
                  </p>
                </div>

                {/* Card Action Row */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                  <Link
                    href={`/products?category=${cat.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E87500] hover:text-[#C95D00] transition-colors group-hover:translate-x-0.5"
                  >
                    <span>Explore Collection</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      openRfqModal({
                        materialType: cat.name,
                        stoneVariety: cat.name,
                      })
                    }
                    className="rounded-lg bg-stone-100 hover:bg-[#FFF2E5] hover:text-[#E87500] hover:border-[#E87500]/40 px-3 py-1.5 text-xs font-semibold text-stone-800 border border-stone-200 transition-colors cursor-pointer"
                  >
                    Request Quote
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
