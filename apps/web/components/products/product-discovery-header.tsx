"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Breadcrumb } from "@stone/ui";
import { SearchBar } from "@/components/ui/search-bar";

export interface ProductCategoryShortcut {
  slug: string;
  name: string;
}

interface ProductDiscoveryHeaderProps {
  totalCount: number;
  categories: ProductCategoryShortcut[];
  currentQuery?: string;
  currentMaterial?: string | string[];
  currentCategory?: string;
}

export function ProductDiscoveryHeader({
  totalCount,
  categories,
  currentQuery = "",
  currentMaterial,
  currentCategory,
}: ProductDiscoveryHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Normalize selected materials
  const selectedMaterials = Array.isArray(currentMaterial)
    ? currentMaterial
    : currentMaterial
      ? [currentMaterial]
      : [];

  const handleShortcutClick = useCallback(
    (materialName: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page"); // reset pagination on category shortcut change

      if (!materialName) {
        // Clear both material and category filters
        params.delete("material");
        params.delete("category");
      } else {
        // Check if already active
        const existing = params.getAll("material");
        if (existing.includes(materialName) && existing.length === 1 && !params.get("category")) {
          // Deselect
          params.delete("material");
        } else {
          // Set as single focused material
          params.delete("material");
          params.delete("category");
          params.append("material", materialName);
        }
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const isAllActive = selectedMaterials.length === 0 && !currentCategory;

  // Use actual database categories, filtering for clean stone families
  const shortcutList = categories.length > 0
    ? categories
        .filter((c) => !c.slug.includes("semi-precious"))
        .slice(0, 9)
        .map((c) => c.name)
    : [
        "Marble",
        "Granite",
        "Sandstone",
        "Limestone",
        "Slate",
        "Quartzite",
        "Travertine",
        "Onyx",
      ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Products" },
        ]}
      />

      {/* Editorial Header Card */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-10 shadow-xs space-y-6">
        <div className="space-y-3">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 border border-amber-500/20">
            <span>STONE MARKETPLACE</span>
            <span className="text-amber-500">•</span>
            <span>PRODUCT DIRECTORY</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-950 font-sans">
            Explore Natural Stone Products
          </h1>

          {/* Supporting Text */}
          <p className="text-sm sm:text-base text-stone-600 max-w-3xl leading-relaxed">
            Discover premium stone slabs, tiles, blocks and architectural materials sourced from Indian manufacturers and suppliers.
          </p>
        </div>

        {/* Search Bar + Dynamic Result Counter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="w-full md:max-w-xl">
            <SearchBar defaultValue={currentQuery} />
          </div>

          {/* Dynamic Result Count & Trust Markers */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-stone-600 font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-200 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              {totalCount.toLocaleString("en-IN")} verified stone lots
            </span>
            <span className="hidden sm:inline text-stone-300">•</span>
            <span className="text-stone-500 hidden sm:inline">Direct Quarry Sourcing</span>
          </div>
        </div>

        {/* Quick Category Shortcuts Strip */}
        <div className="pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="font-bold text-stone-400 whitespace-nowrap mr-1 uppercase tracking-wider text-[11px]">
              Quick Select:
            </span>

            {/* All Products Pill */}
            <button
              type="button"
              onClick={() => handleShortcutClick(null)}
              className={`rounded-full px-3.5 py-1.5 font-semibold whitespace-nowrap transition-all ${
                isAllActive
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
              }`}
            >
              All Stones ({totalCount})
            </button>

            {/* Geological Stone Family Shortcuts */}
            {shortcutList.map((mat) => {
              const isSelected = selectedMaterials.includes(mat);
              return (
                <button
                  key={mat}
                  type="button"
                  onClick={() => handleShortcutClick(mat)}
                  className={`rounded-full px-3.5 py-1.5 font-semibold whitespace-nowrap transition-all border ${
                    isSelected
                      ? "bg-amber-700 text-white border-amber-700 shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:border-amber-400 hover:text-amber-800 hover:bg-amber-50/50"
                  }`}
                >
                  {mat}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
