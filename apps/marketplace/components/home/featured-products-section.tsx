"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Heart } from "lucide-react";
import { useRfqModal } from "@/features/rfq/rfq-modal-context";
import type { ProductSummary } from "@/lib/db";

export interface FeaturedProductsSectionProps {
  initialProducts?: ProductSummary[];
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  attribute: string;
  materialType: string;
  primaryImage: string;
  rating: number;
  reviewCount: number;
  tabGroup: "trending" | "new" | "bestseller";
}

// 5 Reference stone products with realistic architectural attributes & ratings matching reference
const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: "prod-makrana",
    name: "Makrana White Marble",
    slug: "makrana-white-marble",
    category: "Marble",
    attribute: "Premium",
    materialType: "Marble",
    primaryImage: "/images/products/makrana-white-marble.webp",
    rating: 4.8,
    reviewCount: 120,
    tabGroup: "trending",
  },
  {
    id: "prod-black-galaxy",
    name: "Black Galaxy Granite",
    slug: "black-galaxy-granite",
    category: "Granite",
    attribute: "Polished",
    materialType: "Granite",
    primaryImage: "/images/products/black-galaxy-granite.webp",
    rating: 4.7,
    reviewCount: 96,
    tabGroup: "trending",
  },
  {
    id: "prod-dholpur-beige",
    name: "Dholpur Beige Sandstone",
    slug: "dholpur-beige-sandstone",
    category: "Sandstone",
    attribute: "Natural",
    materialType: "Sandstone",
    primaryImage: "/images/products/dholpur-beige-sandstone.webp",
    rating: 4.6,
    reviewCount: 88,
    tabGroup: "trending",
  },
  {
    id: "prod-italian-grey",
    name: "Italian Grey Marble",
    slug: "rajasthan-green-marble",
    category: "Marble",
    attribute: "Imported",
    materialType: "Marble",
    primaryImage: "/images/products/rajasthan-green-marble.webp",
    rating: 4.8,
    reviewCount: 72,
    tabGroup: "trending",
  },
  {
    id: "prod-green-onyx",
    name: "Green Onyx",
    slug: "honey-onyx-translucent",
    category: "Onyx",
    attribute: "Premium",
    materialType: "Onyx",
    primaryImage: "/images/products/honey-onyx-translucent.webp",
    rating: 4.9,
    reviewCount: 54,
    tabGroup: "trending",
  },
  // Additional products for New Arrivals & Best Sellers tabs
  {
    id: "prod-quartzite-silver",
    name: "Silver White Quartzite",
    slug: "silver-white-quartzite",
    category: "Quartzite",
    attribute: "Architectural",
    materialType: "Quartzite",
    primaryImage: "/images/products/silver-white-quartzite.webp",
    rating: 4.9,
    reviewCount: 42,
    tabGroup: "new",
  },
  {
    id: "prod-kund-slate",
    name: "Kund Black Slate",
    slug: "kund-black-slate",
    category: "Slate",
    attribute: "Rustic Cleft",
    materialType: "Slate",
    primaryImage: "/images/products/kund-black-slate.webp",
    rating: 4.7,
    reviewCount: 38,
    tabGroup: "new",
  },
  {
    id: "prod-travertine-cream",
    name: "Classic Beige Travertine",
    slug: "classic-travertine-slab",
    category: "Travertine",
    attribute: "Honed",
    materialType: "Travertine",
    primaryImage: "/images/products/classic-travertine-slab.webp",
    rating: 4.8,
    reviewCount: 65,
    tabGroup: "bestseller",
  },
  {
    id: "prod-kota-blue",
    name: "Kota Blue Limestone",
    slug: "kota-blue-limestone",
    category: "Limestone",
    attribute: "Fine Honed",
    materialType: "Limestone",
    primaryImage: "/images/products/kota-blue-limestone.webp",
    rating: 4.8,
    reviewCount: 115,
    tabGroup: "bestseller",
  },
  {
    id: "prod-agra-red",
    name: "Agra Red Sandstone",
    slug: "agra-red-sandstone",
    category: "Sandstone",
    attribute: "Heritage Grade",
    materialType: "Sandstone",
    primaryImage: "/images/products/agra-red-sandstone.webp",
    rating: 4.7,
    reviewCount: 84,
    tabGroup: "bestseller",
  },
];

type TabType = "trending" | "new" | "bestseller";

export function FeaturedProductsSection({
  initialProducts: _initialProducts = [],
}: FeaturedProductsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const { openRfqModal } = useRfqModal();

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGetBestPrice = (product: ProductItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openRfqModal({
      stoneVariety: product.name,
      materialType: product.materialType,
    });
  };

  // Filter or arrange products based on active tab
  const displayedProducts = useMemo(() => {
    if (activeTab === "trending") {
      return DEFAULT_PRODUCTS.filter((p) => p.tabGroup === "trending").slice(0, 5);
    }
    if (activeTab === "new") {
      return [
        DEFAULT_PRODUCTS.find((p) => p.id === "prod-quartzite-silver")!,
        DEFAULT_PRODUCTS.find((p) => p.id === "prod-kund-slate")!,
        DEFAULT_PRODUCTS.find((p) => p.id === "prod-makrana")!,
        DEFAULT_PRODUCTS.find((p) => p.id === "prod-green-onyx")!,
        DEFAULT_PRODUCTS.find((p) => p.id === "prod-dholpur-beige")!,
      ].filter(Boolean);
    }
    // Best Sellers
    return [
      DEFAULT_PRODUCTS.find((p) => p.id === "prod-kota-blue")!,
      DEFAULT_PRODUCTS.find((p) => p.id === "prod-black-galaxy")!,
      DEFAULT_PRODUCTS.find((p) => p.id === "prod-travertine-cream")!,
      DEFAULT_PRODUCTS.find((p) => p.id === "prod-makrana")!,
      DEFAULT_PRODUCTS.find((p) => p.id === "prod-agra-red")!,
    ].filter(Boolean);
  }, [activeTab]);

  return (
    <section className="py-8 sm:py-10">
      <div className="container-wide">
        {/* Header with Title, Tabs & View All */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 sm:pb-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#211D1A] tracking-tight">
            Featured Stone Products
          </h2>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            {/* Filter Tabs matching reference: [Trending] [New Arrivals] [Best Sellers] */}
            <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-stone-100/90 border border-stone-200/80">
              <button
                type="button"
                onClick={() => setActiveTab("trending")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "trending"
                    ? "bg-[#E87500] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Trending
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("new")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "new"
                    ? "bg-[#E87500] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                New Arrivals
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bestseller")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "bestseller"
                    ? "bg-[#E87500] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Best Sellers
              </button>
            </div>

            {/* View All Products Link */}
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#E87500] hover:text-[#C95D00] transition-colors group shrink-0 ml-1"
            >
              <span>View All Products</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* 5 Product Cards Grid (Matching Reference Layout) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {displayedProducts.map((product) => {
            const isFav = wishlist[product.id];
            return (
              <div
                key={product.id}
                className="group flex flex-col rounded-xl sm:rounded-2xl border border-[#EAE3DB] bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300"
              >
                {/* Product Image Frame */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                  <Link href={`/products/${product.slug}`} className="block h-full w-full">
                    <Image
                      src={product.primaryImage}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-106"
                    />
                  </Link>

                  {/* Wishlist Heart Icon */}
                  <button
                    type="button"
                    onClick={(e) => toggleWishlist(product.id, e)}
                    aria-label={`Save ${product.name} to wishlist`}
                    className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-xs backdrop-blur-xs transition-transform hover:scale-110 active:scale-95 z-10 cursor-pointer"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isFav
                          ? "fill-red-500 text-red-500"
                          : "fill-none text-stone-600 hover:text-red-500"
                      } transition-colors`}
                    />
                  </button>
                </div>

                {/* Details Body */}
                <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-2 sm:gap-2.5">
                  <div className="space-y-0.5">
                    <Link href={`/products/${product.slug}`} className="block">
                      <h3 className="text-xs sm:text-sm font-bold text-[#211D1A] group-hover:text-[#E87500] transition-colors truncate">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-[10.5px] sm:text-xs text-[#716A64]">
                      {product.category} • {product.attribute}
                    </p>
                  </div>

                  {/* Bottom Row: Rating & Get Best Price Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pt-1">
                    <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-semibold text-stone-700">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                      <span>{product.rating}</span>
                      <span className="text-stone-400 font-normal">
                        ({product.reviewCount})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleGetBestPrice(product, e)}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-[#E87500] bg-white px-2 py-1 text-[10.5px] sm:text-[11px] font-semibold text-[#E87500] transition-all hover:bg-[#FFF2E5] active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Get Best Price
                    </button>
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
