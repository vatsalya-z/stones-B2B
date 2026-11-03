"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { type CategoryItem } from "@/lib/db";
import { getCategoryFallbackImage } from "@/lib/images";

export type CategoryFilterGroup = "all" | "geology" | "format" | "bespoke";

export interface CategoryMetaProfile {
  group: "geology" | "format" | "bespoke";
  groupLabel: string;
  badge: string;
  subtitle: string;
  origin?: string;
  finishes?: string[];
  thicknesses?: string[];
  standards?: string;
  packaging?: string;
  synonyms: string[];
}

export const CATEGORY_PROFILES: Record<string, CategoryMetaProfile> = {
  marble: {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Metamorphic Calcite",
    subtitle: "Recrystallized calcite and dolomitic marble featuring soft grey veining and high crystalline translucency.",
    origin: "Makrana, Rajsamand, Udaipur (Rajasthan); Ambaji (Gujarat)",
    finishes: ["Mirror Polished", "Honed", "Leathered", "Brushed"],
    thicknesses: ["16mm", "18mm", "20mm", "30mm"],
    synonyms: ["marble", "makrana", "white marble", "calcite", "dungri", "albeta", "flooring", "vanity"],
  },
  granite: {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Igneous Plutonic",
    subtitle: "Ultra-hard, scratch and thermal-resistant quartz-feldspar stone engineered for high-traffic commercial environments.",
    origin: "Ongole, Chimakkurthi (Andhra Pradesh); Jalore (Rajasthan); Ilkal (Karnataka)",
    finishes: ["Mirror Polished", "Flamed", "Leathered", "Laporta", "Bush-Hammered"],
    thicknesses: ["18mm", "20mm", "30mm"],
    synonyms: ["granite", "black galaxy", "tan brown", "steel grey", "kitchen", "countertop", "commercial"],
  },
  sandstone: {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Sedimentary Quartzite",
    subtitle: "Weather-resistant silica-bound sedimentary stone prized for historical facades, paving, and architectural jaalis.",
    origin: "Dholpur, Jodhpur, Bundi, Bijolia, Karauli (Rajasthan); Gwalior (Madhya Pradesh)",
    finishes: ["Natural Cleft", "Honed", "Sandblasted", "Tumbled", "Shot-Blasted"],
    thicknesses: ["18mm", "20mm", "25mm", "30mm", "50mm"],
    synonyms: ["sandstone", "dholpur", "jodhpur", "agra red", "cleft", "paving", "cladding", "jaali"],
  },
  limestone: {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Sedimentary Carbonate",
    subtitle: "Fine-grained calcite stone celebrated for uniform non-slip texture, mirror polish, and high compressive strength.",
    origin: "Kota & Jaisalmer (Rajasthan); Tandur (Karnataka); Kadapa (Andhra Pradesh)",
    finishes: ["Mirror Polish", "Honed", "Natural Split", "River-Washed", "Tumbled"],
    thicknesses: ["20mm", "22mm Calibrated", "25mm", "30mm"],
    synonyms: ["limestone", "kota blue", "kota brown", "tandur", "kadapa", "jaisalmer", "flooring", "pavement"],
  },
  quartzite: {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Non-Foliated Metamorphic",
    subtitle: "Pure quartz sandstone recrystallized into Mohs 7 hardness slabs combining marble elegance with superior durability.",
    origin: "Himachal Pradesh; Rajasthan; Andhra Pradesh",
    finishes: ["Natural Cleft", "Honed", "Polished", "Flamed"],
    thicknesses: ["15mm", "20mm", "30mm"],
    synonyms: ["quartzite", "silver white", "golden quartzite", "acid resistant", "scratch proof", "islands"],
  },
  slate: {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Foliated Metamorphic",
    subtitle: "Homogeneous foliated natural stone cleaving into dense tactile sheets with exceptional freeze-thaw endurance.",
    origin: "Kund & Rewari Belt (Haryana); Himachal Pradesh; Andhra Pradesh",
    finishes: ["Natural Split / Cleft", "Honed", "Brushed"],
    thicknesses: ["10mm", "12mm", "15mm", "20mm"],
    synonyms: ["slate", "kund black", "roofing", "foliated", "rustic", "pool deck", "cleft"],
  },
  travertine: {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Terrestrial Carbonate",
    subtitle: "Warm, textured sedimentary stone with characteristic fibrous cavities, available in vein-cut and cross-cut faces.",
    origin: "Imported & Selective Domestic Formations (Beige, Walnut, Silver, Noce)",
    finishes: ["Filled & Polished", "Unfilled & Honed", "Brushed", "Tumbled"],
    thicknesses: ["18mm", "20mm", "30mm"],
    synonyms: ["travertine", "vein cut", "cross cut", "cream travertine", "spa", "pool", "roman"],
  },
  onyx: {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Cryptocrystalline Gemstone",
    subtitle: "Translucent chalcedony quartz bands that radiate ambient light when backlit, for statement architectural portals.",
    origin: "Select Exotic Deposits (Honey Amber, Mint Green, Pure White Onyx)",
    finishes: ["High-Gloss Diamond Polish", "Translucent Slabs"],
    thicknesses: ["16mm", "18mm", "20mm"],
    synonyms: ["onyx", "translucent", "backlit", "honey onyx", "green onyx", "bar counter", "feature wall"],
  },
  "semi-precious-stones": {
    group: "geology",
    groupLabel: "Geological Stone Family",
    badge: "Rare Minerals & Inlay",
    subtitle: "Handcrafted luxury slabs composed of natural agate, petrified wood, jasper, and lapis lazuli for bespoke interior statements.",
    origin: "Rajasthan & Gujarat Lapidary Centers",
    finishes: ["Mirror Gem Polish", "Backlit Epoxy Matrix"],
    thicknesses: ["18mm", "20mm"],
    synonyms: ["semi precious", "agate", "lapis", "jasper", "malachite", "petrified wood", "inlay", "luxury"],
  },
  "natural-stone-slabs": {
    group: "format",
    groupLabel: "Product Format & Supply Standard",
    badge: "Gangsaw Slabs",
    subtitle: "Large-format multi-wire gangsaw and circular cutter slabs for seamless architectural flooring and bookmatched panels.",
    standards: "2800–3200 × 1600–2000 mm Gangsaw Format",
    packaging: "Seaworthy ISPM-15 A-frame wooden bundles",
    thicknesses: ["16mm", "18mm", "20mm", "30mm"],
    synonyms: ["slabs", "gangsaw", "large format", "cutter slabs", "bookmatch", "bundles"],
  },
  "stone-tiles": {
    group: "format",
    groupLabel: "Product Format & Supply Standard",
    badge: "Calibrated Tiles",
    subtitle: "Precision cut, machine-calibrated, and edge-bevelled tiles for uniform commercial and residential project installations.",
    standards: "300×300, 600×300, 600×600, 1200×600 mm",
    packaging: "Corrugated boxes in seaworthy wooden crates",
    thicknesses: ["10mm", "12mm", "15mm", "20mm", "22mm"],
    synonyms: ["tiles", "calibrated", "cut to size", "flooring tiles", "paving tiles", "chamfered"],
  },
  "stone-blocks": {
    group: "format",
    groupLabel: "Product Format & Supply Standard",
    badge: "Quarry Blocks",
    subtitle: "Wire-saw dressed, structural rectangular raw quarry blocks prepared for gangsaw processing and break-bulk vessel export.",
    standards: "Average Block Weight: 18 to 28 Metric Tons",
    packaging: "Direct container bolster loading / break-bulk vessel",
    thicknesses: ["Raw Wire-Saw Dressed"],
    synonyms: ["blocks", "quarry blocks", "raw blocks", "dressed blocks", "rough stone", "container blocks"],
  },
  "decorative-stone": {
    group: "bespoke",
    groupLabel: "Architectural & Custom Procurement",
    badge: "Bespoke Stonecraft",
    subtitle: "High-precision 5-axis CNC-routed stone jaalis, intricate wall reliefs, waterjet medallions, and architectural mouldings.",
    standards: "CAD DXF/DWG custom pattern execution",
    packaging: "Foam-cushioned shock-resistant wooden crates",
    thicknesses: ["25mm", "30mm", "50mm", "75mm"],
    synonyms: ["decorative", "jaali", "lattice", "carving", "cnc", "relief", "medallion", "screen"],
  },
  "custom-stone-products": {
    group: "bespoke",
    groupLabel: "Architectural & Custom Procurement",
    badge: "Project BOQ Supply",
    subtitle: "Made-to-order architectural stone elements fabricated to exact project specifications, bill of quantities (BOQ), and site drawings.",
    standards: "Tolerance: ± 0.5mm computerized CNC fabrication",
    packaging: "Job-site sequenced crate packing",
    thicknesses: ["Custom BOQ Specifications"],
    synonyms: ["custom", "bespoke", "boq", "fabricated", "project supply", "cut to size"],
  },
};

export const ARCHITECTURAL_APPLICATIONS = [
  {
    title: "Flooring & Large-Format Paving",
    subtitle: "Mirror-polished calcite marble, calibrated limestone tiles, and high-abrasion quartzite slabs.",
    href: "/products?finish=Polished",
    image: "/images/product-gallery/marble-install-living.jpg",
    tag: "High Foot-Traffic",
  },
  {
    title: "Interior & Exterior Wall Cladding",
    subtitle: "Weatherproof sandstone panels, honed travertine slabs, and ventilated curtain-wall systems.",
    href: "/products?finish=Honed",
    image: "/images/products/agra-red-sandstone.jpg",
    tag: "Ventilated Facades",
  },
  {
    title: "Kitchen Countertops & Vanity Slabs",
    subtitle: "Scratch, heat, and acid-resistant Black Galaxy granite and non-porous crystalline quartzite.",
    href: "/products?material=Granite",
    image: "/images/product-gallery/marble-detail-vein.jpg",
    tag: "Stain & Heat Proof",
  },
  {
    title: "Landscaping, Cobbles & Pathways",
    subtitle: "Natural cleft sandstone paving, tumbled limestone setts, and flame-finished granite cobbles.",
    href: "/products?material=Sandstone",
    image: "/images/suppliers/seaworthy-crate-packaging.jpg",
    tag: "Weather Resistant",
  },
  {
    title: "Architectural Facades & Cut Panels",
    subtitle: "Machine-calibrated 25mm–30mm exterior panels engineered for high-wind load curtain walls.",
    href: "/products?material=Sandstone&finish=Sandblasted",
    image: "/images/suppliers/stone-slab-warehouse.jpg",
    tag: "Engineered Panels",
  },
  {
    title: "Heritage Stonecraft & Monuments",
    subtitle: "Historical Makrana pure white marble, Tantpur red sandstone, and monumental masonry blocks.",
    href: "/products?material=Marble",
    image: "/images/hero/stone-factory-hero.jpg",
    tag: "Classical Restoration",
  },
  {
    title: "Decorative Interiors & CNC Jaalis",
    subtitle: "5-axis CNC lattice screens, backlit onyx bar counters, and precision waterjet inlay medallions.",
    href: "/products?category=decorative-stone",
    image: "/images/products/hand-carved-sandstone-jaali.jpg",
    tag: "Precision Carvings",
  },
];

export const REGIONAL_QUARRY_HUBS = [
  {
    city: "Makrana",
    state: "Rajasthan",
    geology: "Pure Calcite White Marble (Taj Mahal quarry belt)",
    href: "/products?origin=Makrana",
    image: "/images/products/makrana-white-marble.jpg",
    highlight: "Non-porous crystalline calcite",
  },
  {
    city: "Ongole",
    state: "Andhra Pradesh",
    geology: "World-famous Black Galaxy (Star Galaxy) Granite",
    href: "/products?origin=Ongole",
    image: "/images/products/black-galaxy-granite.jpg",
    highlight: "Bronzite mineral spangles",
  },
  {
    city: "Dholpur & Jodhpur",
    state: "Rajasthan",
    geology: "Dholpur Beige, Red Sandstone & Architectural Carving Stone",
    href: "/products?origin=Dholpur",
    image: "/images/products/dholpur-beige-sandstone.jpg",
    highlight: "Heritage architectural sandstone",
  },
  {
    city: "Kota",
    state: "Rajasthan",
    geology: "Kota Blue & Brown Dense Calibrated Limestone",
    href: "/products?origin=Kota",
    image: "/images/products/kota-blue-limestone.jpg",
    highlight: "Heavy-traffic infrastructure paving",
  },
  {
    city: "Kund / Rewari",
    state: "Haryana",
    geology: "Kund Charcoal Black Natural Cleft Slate",
    href: "/products?origin=Rewari",
    image: "/images/products/kund-black-slate.jpg",
    highlight: "Freeze-thaw certified roofing & paving",
  },
  {
    city: "Kishangarh & Rajsamand",
    state: "Rajasthan",
    geology: "Asia's largest marble processing cluster & Green Marble",
    href: "/products?material=Marble",
    image: "/images/products/rajasthan-green-marble.jpg",
    highlight: "Multi-wire gangsaw processing",
  },
  {
    city: "Ambaji",
    state: "Gujarat",
    geology: "Dense fine-grain crystalline white architectural marble",
    href: "/products?origin=Gujarat",
    image: "/images/products/silver-white-quartzite.jpg",
    highlight: "Monolithic temple carving marble",
  },
];

const SEARCH_SUGGESTIONS = [
  "Marble",
  "Granite",
  "Sandstone",
  "Kota Limestone",
  "Gangsaw Slabs",
  "Stone Tiles",
  "Onyx",
  "Slate",
];

export interface CategoryDiscoveryExplorerProps {
  categories: CategoryItem[];
  initialSearch?: string;
}

export function CategoryDiscoveryExplorer({
  categories,
  initialSearch = "",
}: CategoryDiscoveryExplorerProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState<CategoryFilterGroup>("all");

  // Enrich categories with architectural metadata profiles
  const enrichedCategories = useMemo(() => {
    return categories.map((cat) => {
      const slugKey = cat.slug.toLowerCase();
      const meta = CATEGORY_PROFILES[slugKey] || {
        group: "geology" as const,
        groupLabel: "Natural Stone Collection",
        badge: "Natural Stone",
        subtitle: cat.description || "Authentic natural stone from verified Indian quarries.",
        synonyms: [cat.name.toLowerCase(), cat.slug],
      };
      const resolvedImage = cat.image_url || getCategoryFallbackImage(cat.slug);
      return {
        ...cat,
        meta,
        resolvedImage,
      };
    });
  }, [categories]);

  // Counts by group
  const groupCounts = useMemo(() => {
    let geology = 0;
    let format = 0;
    let bespoke = 0;
    enrichedCategories.forEach((c) => {
      if (c.meta.group === "geology") geology++;
      else if (c.meta.group === "format") format++;
      else if (c.meta.group === "bespoke") bespoke++;
    });
    return {
      all: enrichedCategories.length,
      geology,
      format,
      bespoke,
    };
  }, [enrichedCategories]);

  // Filtered categories based on search query and active tab
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return enrichedCategories.filter((cat) => {
      // Tab filter
      if (activeTab !== "all" && cat.meta.group !== activeTab) {
        return false;
      }
      // Query filter
      if (!q) return true;

      const nameMatch = cat.name.toLowerCase().includes(q);
      const descMatch = Boolean(cat.description && cat.description.toLowerCase().includes(q));
      const subtitleMatch = cat.meta.subtitle.toLowerCase().includes(q);
      const originMatch = Boolean(cat.meta.origin && cat.meta.origin.toLowerCase().includes(q));
      const synonymMatch = cat.meta.synonyms.some((s) => s.includes(q) || q.includes(s));

      return nameMatch || descMatch || subtitleMatch || originMatch || synonymMatch;
    });
  }, [enrichedCategories, searchQuery, activeTab]);

  return (
    <div className="space-y-16">
      {/* ─────────────────────────────────────────────────────────────
          SECTION A: EDITORIAL DISCOVERY HERO
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 text-white shadow-xl">
        {/* Subtle architectural backdrop */}
        <div className="absolute inset-0 z-0 opacity-25 mix-blend-luminosity">
          <Image
            src="/images/hero/marble-showroom-hero.jpg"
            alt="Luxury architectural stone showroom and warehouse gallery"
            fill
            sizes="100vw"
            priority
            className="object-cover object-center filter blur-[1px]"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-stone-950/50" />
        </div>

        <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16 lg:py-20 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300 border border-amber-500/30 backdrop-blur-md">
            <span>Stone Collections</span>
            <span className="text-amber-500">•</span>
            <span>Material Directory</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm font-sans">
              Discover Natural Stone.
            </h1>
            <p className="text-base sm:text-xl font-medium text-stone-200 max-w-2xl mx-auto leading-relaxed">
              Explore India&rsquo;s finest marble, granite, sandstone and architectural stone collections.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Explore natural stone materials by geology, finish, origin and architectural application. Connect directly with verified stone manufacturers, quarry owners, and export processing units.
          </p>

          {/* High-Contrast Interactive Category Search Bar */}
          <div className="pt-2 max-w-2xl mx-auto">
            <div className="relative flex items-center shadow-xl rounded-2xl bg-stone-900/90 backdrop-blur-md border border-stone-600/70 transition-all focus-within:border-amber-400 focus-within:bg-stone-900 focus-within:ring-2 focus-within:ring-amber-500/40">
              <span className="pl-4 text-amber-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stone by family, format, origin (e.g. Makrana, Slabs, Granite, Tiles)..."
                className="w-full bg-transparent py-4 pl-3.5 pr-10 text-sm sm:text-base text-white placeholder-stone-400 focus:outline-none"
                aria-label="Search stone collections"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="pr-4 text-stone-400 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Quick Search Suggestions */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 text-xs text-stone-300">
              <span className="font-semibold text-stone-400 mr-1">Suggested:</span>
              {SEARCH_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSearchQuery(item)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                    searchQuery.toLowerCase() === item.toLowerCase()
                      ? "bg-amber-500 text-stone-950 border-amber-400 font-bold"
                      : "bg-stone-800/90 text-stone-300 hover:bg-amber-600/30 hover:text-amber-200 border-stone-700/70"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Trust Indicators & Category Counter */}
          <div className="pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-stone-300 font-medium">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>{categories.length} Verified Stone Collections</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Direct Indian Quarry Concessions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span>ISPM-15 Fumigated Export Crates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION B: CATEGORY DISCOVERY (CORE SHOWCASE)
          ───────────────────────────────────────────────────────────── */}
      <section id="categories-grid" className="space-y-6 scroll-mt-24">
        {/* Section Heading & Grouping Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-200 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Material Catalog
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs font-semibold text-stone-500">
                {filteredCategories.length} Collections
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Explore Stone Families
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Find the right natural stone for your next architectural or construction project. Select a category to inspect geological origin, available finishes, and factory lots.
            </p>
          </div>

          {/* Grouping Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "all"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              All ({groupCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("geology")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "geology"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              Geological Families ({groupCounts.geology})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("format")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "format"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              Supply Formats ({groupCounts.format})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bespoke")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "bespoke"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              Architectural &amp; Custom ({groupCounts.bespoke})
            </button>
          </div>
        </div>

        {/* High-Visibility Active Filter Feedback Bar */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between rounded-xl bg-amber-50/90 border border-amber-200/90 px-4 py-3 text-sm text-amber-950 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-amber-900">Active search:</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 font-medium text-amber-950 border border-amber-200 shadow-xs text-xs">
                &ldquo;{searchQuery}&rdquo;
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-amber-700 hover:text-amber-950 p-0.5 rounded transition-colors"
                  aria-label="Clear active search"
                >
                  ✕
                </button>
              </span>
              <span className="text-xs text-amber-800">
                &bull; {filteredCategories.length} {filteredCategories.length === 1 ? "collection" : "collections"} matched
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
              }}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 underline underline-offset-4 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Empty State when search returns 0 */}
        {filteredCategories.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-card space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-stone-900">
                No stone collections found matching &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                We couldn&rsquo;t find any categories matching your query. Try searching for &ldquo;Marble&rdquo;, &ldquo;Granite&rdquo;, &ldquo;Sandstone&rdquo;, &ldquo;Slabs&rdquo;, or &ldquo;Tiles&rdquo;.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
                className="btn-secondary text-xs px-4 py-2 font-semibold"
              >
                Clear Filters
              </button>
              <Link href="/products" className="btn-accent text-xs px-4 py-2 font-semibold">
                Search All Products
              </Link>
            </div>
          </div>
        ) : (
          /* 3-Column Editorial Grid (Desktop) / 2-Column (Tablet) / 1-Column (Mobile) */
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat) => (
              <article
                key={cat.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-card transition-all duration-300 hover:shadow-card-hover hover:border-amber-500/50"
              >
                {/* Large Architectural Photography Header */}
                <Link
                  href={`/categories/${cat.slug}`}
                  className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100 block"
                  aria-label={`Explore ${cat.name} Collection`}
                >
                  <Image
                    src={cat.resolvedImage}
                    alt={`${cat.name} natural stone texture and architectural slab`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    unoptimized={!cat.resolvedImage.includes(".supabase.co")}
                  />
                  {/* Photographic vignette overlay for high text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent" />

                  {/* Top classification badge */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-stone-950/80 px-2.5 py-1 text-[11px] font-semibold text-amber-300 backdrop-blur-md border border-amber-400/30 shadow-xs">
                      {cat.meta.badge}
                    </span>
                  </div>

                  {/* Top right lot counter */}
                  {cat.productCount !== undefined && cat.productCount > 0 && (
                    <div className="absolute top-3.5 right-3.5">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/95 px-2.5 py-0.5 text-[10px] font-bold text-stone-950 backdrop-blur-md shadow-xs">
                        {cat.productCount} {cat.productCount === 1 ? "Lot" : "Lots"} Available
                      </span>
                    </div>
                  )}

                  {/* Bottom title in image */}
                  <div className="absolute bottom-3.5 left-4 right-4 text-white">
                    <p className="text-[11px] font-semibold text-amber-300 drop-shadow-sm">
                      {cat.meta.groupLabel}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
                      {cat.name}
                    </h3>
                  </div>
                </Link>

                {/* Editorial Content Box */}
                <div className="p-5 sm:p-6 flex flex-1 flex-col justify-between space-y-4">
                  <p className="text-sm text-stone-600 leading-relaxed font-normal">
                    {cat.meta.subtitle}
                  </p>

                  {/* Technical & Sourcing Attributes Matrix */}
                  <div className="space-y-1.5 pt-3 border-t border-stone-100 text-xs text-stone-600">
                    {cat.meta.origin && (
                      <p className="line-clamp-1">
                        <span className="font-semibold text-stone-800">Quarry Hubs: </span>
                        <span>{cat.meta.origin}</span>
                      </p>
                    )}
                    {cat.meta.finishes && (
                      <p className="line-clamp-1">
                        <span className="font-semibold text-stone-800">Finishes: </span>
                        <span>{cat.meta.finishes.join(" · ")}</span>
                      </p>
                    )}
                    {cat.meta.standards && (
                      <p className="line-clamp-1">
                        <span className="font-semibold text-stone-800">Standards: </span>
                        <span>{cat.meta.standards}</span>
                      </p>
                    )}
                    {cat.meta.packaging && (
                      <p className="line-clamp-1">
                        <span className="font-semibold text-stone-800">Packaging: </span>
                        <span>{cat.meta.packaging}</span>
                      </p>
                    )}
                  </div>

                  {/* Card Action Row */}
                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                    <Link
                      href={`/categories/${cat.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors group-hover:translate-x-0.5"
                    >
                      <span>Explore Collection</span>
                      <span>→</span>
                    </Link>
                    <Link
                      href={`/request-quote?category=${cat.slug}`}
                      className="inline-flex items-center text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg border border-stone-200/80 transition-colors"
                    >
                      Request Quote
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION C: EXPLORE BY ARCHITECTURAL APPLICATION
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-6 pt-4 border-t border-stone-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Project Specification
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Explore by Architectural Application
          </h2>
          <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
            Discover curated natural stone selections engineered and finished specifically for distinct architectural environments, traffic loads, and climatic conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ARCHITECTURAL_APPLICATIONS.map((app) => (
            <Link
              key={app.title}
              href={app.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card transition-all duration-300 hover:shadow-card-hover hover:border-amber-500/50"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                <Image
                  src={app.image}
                  alt={`${app.title} architectural stone application`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />
                <div className="absolute top-2.5 left-2.5">
                  <span className="rounded-full bg-stone-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                    {app.tag}
                  </span>
                </div>
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <h3 className="text-sm font-bold text-white leading-snug drop-shadow-sm">
                    {app.title}
                  </h3>
                </div>
              </div>
              <div className="p-4 flex flex-1 flex-col justify-between space-y-2">
                <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                  {app.subtitle}
                </p>
                <div className="flex items-center text-xs font-bold text-amber-700 group-hover:text-amber-800 pt-1">
                  <span>Browse Filtered Lots</span>
                  <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION D: STONE ORIGIN DISCOVERY (REGIONAL SOURCING HUBS)
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-6 pt-4 border-t border-stone-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Direct Sourcing
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Quarry Hubs &amp; Regional Origins
          </h2>
          <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
            Source directly from India&rsquo;s most celebrated geological mineral belts, quarry concessions, and specialized gangsaw processing clusters.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {REGIONAL_QUARRY_HUBS.map((hub) => (
            <Link
              key={hub.city}
              href={hub.href}
              className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-card transition-all duration-300 hover:shadow-card-hover hover:border-amber-500/40"
            >
              <div className="space-y-3">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-stone-100">
                  <Image
                    src={hub.image}
                    alt={`${hub.city}, ${hub.state} stone quarry and processing hub`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2.5 text-white">
                    <span className="text-[10px] uppercase font-bold text-amber-300">
                      {hub.state}
                    </span>
                    <h3 className="text-sm font-bold text-white">{hub.city}</h3>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-stone-900">{hub.geology}</p>
                  <p className="text-stone-500 text-[11px] leading-relaxed">{hub.highlight}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
                <span>View Regional Lots</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION E: CUSTOM PROCUREMENT CTA
          ───────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-stone-800 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-8 sm:p-12 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-block rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
              Architectural Project Procurement
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Need Custom Slab Thickness or Cut-to-Size Panels?
            </h2>
            <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-normal">
              Share your project requirements, BOQ, and custom dimensions to connect with verified stone manufacturers, quarry owners, and export processing factories.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Custom CAD &amp; DWG Drawings Supported
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Fumigated ISPM-15 Wooden Crate Packing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Mundra &amp; Chennai Port Container Dispatch
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 flex-shrink-0">
            <Link
              href="/request-quote"
              className="btn-accent px-8 py-3.5 text-sm font-semibold shadow-lg shadow-amber-600/30 text-center"
            >
              Submit Project RFQ
            </Link>
            <Link
              href="/suppliers"
              className="btn-secondary border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800 hover:border-stone-600 px-8 py-3.5 text-sm font-semibold text-center"
            >
              Browse Suppliers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
