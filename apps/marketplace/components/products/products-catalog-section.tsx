import React, { Suspense } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/ui/product-card";
import { FilterSidebar } from "@/components/ui/filter-sidebar";
import { ProductFilterBar } from "@/components/ui/product-filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { ProductDiscoveryHeader } from "@/components/products/product-discovery-header";
import type { getActiveCategories, getProducts } from "@/lib/db";

export const MATERIAL_OPTIONS = [
  { value: "Marble", label: "Marble" },
  { value: "Granite", label: "Granite" },
  { value: "Sandstone", label: "Sandstone" },
  { value: "Limestone", label: "Limestone" },
  { value: "Quartzite", label: "Quartzite" },
  { value: "Slate", label: "Slate" },
  { value: "Travertine", label: "Travertine" },
  { value: "Onyx", label: "Onyx" },
];

export const COLOUR_OPTIONS = [
  { value: "White", label: "White" },
  { value: "Black", label: "Black" },
  { value: "Beige", label: "Beige / Cream" },
  { value: "Grey", label: "Grey" },
  { value: "Brown", label: "Brown" },
  { value: "Green", label: "Green" },
  { value: "Red", label: "Red / Pink" },
  { value: "Yellow", label: "Yellow / Gold" },
];

export const FINISH_OPTIONS = [
  { value: "Polished", label: "Polished" },
  { value: "Honed", label: "Honed" },
  { value: "Flamed", label: "Flamed" },
  { value: "Leathered", label: "Leathered" },
  { value: "Bush Hammered", label: "Bush Hammered" },
  { value: "Sandblasted", label: "Sandblasted" },
  { value: "Natural Cleft", label: "Natural Cleft" },
];

export const ORIGIN_OPTIONS = [
  { value: "Makrana", label: "Makrana, Rajasthan" },
  { value: "Ongole", label: "Ongole, Andhra Pradesh" },
  { value: "Dholpur", label: "Dholpur, Rajasthan" },
  { value: "Kota", label: "Kota, Rajasthan" },
  { value: "Rewari", label: "Kund / Rewari, Haryana" },
  { value: "Rajasthan", label: "Rajasthan (General)" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Karnataka", label: "Karnataka" },
];

export const THICKNESS_OPTIONS = [
  { value: "15", label: "15 mm Calibrated" },
  { value: "16", label: "16 mm Standard Slabs" },
  { value: "18", label: "18 mm Gangsaw Slabs" },
  { value: "20", label: "20 mm Architectural" },
  { value: "22", label: "22 mm Heavy Tiles" },
  { value: "25", label: "25 mm Cladding Slabs" },
  { value: "30", label: "30 mm Monumental" },
];

export const STOCK_STATUS_OPTIONS = [
  { value: "in_stock", label: "In Stock (Ready Lots)" },
  { value: "made_to_order", label: "Custom Cut-to-Size" },
];

export interface ProductsCatalogSectionProps {
  categories: Awaited<ReturnType<typeof getActiveCategories>>;
  products: Awaited<ReturnType<typeof getProducts>>["products"];
  total: number;
  totalPages: number;
  page: number;
  searchParams: {
    q?: string;
    category?: string;
    material?: string | string[];
    colour?: string | string[];
    finish?: string | string[];
    origin?: string | string[];
    thickness?: string | string[];
    stockStatus?: string | string[];
    minPrice?: string;
    maxPrice?: string;
    verified?: string;
    sort?: string;
    page?: string;
  };
  favouriteIds: Set<string>;
  showBreadcrumbs?: boolean;
  baseUrl?: string;
}

export function ProductsCatalogSection({
  categories,
  products,
  total,
  totalPages,
  page,
  searchParams,
  favouriteIds,
  showBreadcrumbs = true,
  baseUrl = "/products",
}: ProductsCatalogSectionProps) {
  const categoryOptions = categories.map((c) => ({
    value: c.slug,
    label: c.name,
  }));

  return (
    <div className="space-y-8">
      {/* Architectural Discovery Header & Quick Material Filter Shortcuts */}
      <ProductDiscoveryHeader
        totalCount={total}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        currentQuery={searchParams.q ?? ""}
        currentMaterial={searchParams.material}
        currentCategory={searchParams.category}
        showBreadcrumbs={showBreadcrumbs}
      />

      {/* Main Layout: Sticky Left Filter Sidebar + Product Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 pt-2">
        {/* Desktop Left Filter Sidebar */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
            <Suspense fallback={<div className="h-96 w-full animate-pulse bg-stone-100 rounded-xl" />}>
              <FilterSidebar
                categories={categoryOptions}
                materialTypes={MATERIAL_OPTIONS}
                colours={COLOUR_OPTIONS}
                finishes={FINISH_OPTIONS}
                origins={ORIGIN_OPTIONS}
                thicknesses={THICKNESS_OPTIONS}
                stockStatuses={STOCK_STATUS_OPTIONS}
              />
            </Suspense>
          </div>
        </div>

        {/* Product Grid & Controls */}
        <div className="lg:col-span-3 space-y-6">
          <Suspense fallback={<div className="h-10 w-full animate-pulse bg-stone-200 rounded-lg" />}>
            <ProductFilterBar
              categories={categoryOptions}
              materialTypes={MATERIAL_OPTIONS}
              colours={COLOUR_OPTIONS}
              finishes={FINISH_OPTIONS}
              origins={ORIGIN_OPTIONS}
              thicknesses={THICKNESS_OPTIONS}
              stockStatuses={STOCK_STATUS_OPTIONS}
              currentSort={searchParams.sort}
              totalResults={total}
            />
          </Suspense>

          {products.length === 0 ? (
            /* Enhanced Architectural Empty State */
            <div className="rounded-3xl border border-stone-200 bg-white p-8 sm:p-14 text-center shadow-xs space-y-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg sm:text-xl font-bold text-stone-950 font-sans">
                  No stone products match your selected filters
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                  Try broadening your filters, clearing specific thickness or price ranges, or searching for a different stone variety or quarry origin.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href={baseUrl}
                  className="rounded-xl bg-stone-950 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition-colors"
                >
                  Reset All Filters
                </Link>
                <Link
                  href="/categories"
                  className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-colors"
                >
                  Browse Geological Collections
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Premium Product Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    slug={p.slug}
                    name={p.name}
                    primaryImage={p.primaryImage}
                    materialType={p.materialType}
                    colour={p.colour}
                    finish={p.finish}
                    priceType={p.priceType}
                    price={p.price}
                    currency={p.currency}
                    unit={p.unit}
                    sellerName={p.sellerName}
                    sellerSlug={p.sellerSlug}
                    isVerifiedSeller={p.isVerifiedSeller}
                    stoneOrigin={p.stoneOrigin}
                    thickness={p.thickness}
                    length={p.length}
                    width={p.width}
                    minimumOrderQuantity={p.minimumOrderQuantity}
                    stockStatus={p.stockStatus}
                    leadTime={p.leadTime}
                    isFavourited={favouriteIds.has(p.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="pt-6">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  baseUrl={baseUrl}
                  searchParams={searchParams}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
