import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SectionHeading, Breadcrumb, EmptyState } from "@stone/ui";
import { ProductCard } from "@/components/ui/product-card";
import { FilterSidebar } from "@/components/ui/filter-sidebar";
import { ProductFilterBar } from "@/components/ui/product-filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { SearchBar } from "@/components/ui/search-bar";
import { getCurrentUserFavouriteIds } from "@/features/buyer/queries";
import { getProducts, getActiveCategories } from "@/lib/db";

export const metadata: Metadata = {
  title: "Natural Stone Slabs & Tiles — Indian Quarry Wholesale Directory",
  description:
    "Search and filter natural stone products, gangsaw marble slabs, granite blocks, calibrated sandstone tiles, and architectural stone from verified Indian manufacturers and exporters.",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "Natural Stone Products & Gangsaw Slabs | StonesDekho B2B",
    description:
      "Source factory-direct Indian marble, granite, sandstone, limestone, slate, quartzite, and travertine. Calibrated thicknesses and export-grade packaging.",
    url: "/products",
    type: "website",
  },
};

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    material?: string | string[];
    colour?: string | string[];
    finish?: string | string[];
    origin?: string | string[];
    stockStatus?: string | string[];
    minPrice?: string;
    maxPrice?: string;
    verified?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [categories, { products, total, totalPages }, favouriteIds] = await Promise.all([
    getActiveCategories(null),
    getProducts({
      q: sp.q,
      category: sp.category,
      material: sp.material,
      colour: sp.colour,
      finish: sp.finish,
      origin: sp.origin,
      stockStatus: sp.stockStatus,
      minPrice: sp.minPrice,
      maxPrice: sp.maxPrice,
      verified: sp.verified,
      sort: sp.sort,
      page,
      pageSize: 18,
    }),
    getCurrentUserFavouriteIds(),
  ]);

  const categoryOptions = categories.map((c) => ({
    value: c.slug,
    label: c.name,
  }));

  const materialOptions = [
    { value: "Marble", label: "Marble" },
    { value: "Granite", label: "Granite" },
    { value: "Sandstone", label: "Sandstone" },
    { value: "Limestone", label: "Limestone" },
    { value: "Quartzite", label: "Quartzite" },
    { value: "Slate", label: "Slate" },
    { value: "Travertine", label: "Travertine" },
    { value: "Onyx", label: "Onyx" },
  ];

  const colourOptions = [
    { value: "White", label: "White" },
    { value: "Black", label: "Black" },
    { value: "Beige", label: "Beige / Cream" },
    { value: "Grey", label: "Grey" },
    { value: "Brown", label: "Brown" },
    { value: "Green", label: "Green" },
    { value: "Red", label: "Red / Pink" },
    { value: "Yellow", label: "Yellow / Gold" },
  ];

  const finishOptions = [
    { value: "Polished", label: "Polished" },
    { value: "Honed", label: "Honed" },
    { value: "Flamed", label: "Flamed" },
    { value: "Leathered", label: "Leathered" },
    { value: "Bush Hammered", label: "Bush Hammered" },
    { value: "Sandblasted", label: "Sandblasted" },
    { value: "Natural Cleft", label: "Natural Cleft" },
  ];

  const originOptions = [
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

  const stockStatusOptions = [
    { value: "in_stock", label: "In Stock (Ready Lots)" },
    { value: "made_to_order", label: "Custom Cut-to-Size" },
  ];

  const productListingJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Natural Stone Gangsaw Slabs & Tiles Directory",
    description: "Search and filter Indian natural stone products, gangsaw slabs, and calibrated tiles.",
    url: "https://stonesdekho.com/products",
  };

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productListingJsonLd) }}
      />
      <div className="container-wide space-y-6">
        <div>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Products" },
            ]}
          />
          <SectionHeading
            className="mt-4"
            title="Natural Stone Products & Factory Lots"
            subtitle={
              total > 0
                ? `Showing ${products.length} of ${total.toLocaleString("en-IN")} verified stone slabs, blocks, and calibrated tiles.`
                : "Browse verified inventory of natural stone slabs, tiles, and blocks."
            }
          />
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl">
          <Suspense fallback={<div className="h-12 w-full rounded-xl bg-stone-200 animate-pulse" />}>
            <SearchBar defaultValue={sp.q ?? ""} />
          </Suspense>
        </div>

        {/* Layout: Sidebar + Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 pt-2">
          {/* Desktop Left Filter Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
              <Suspense fallback={<div className="h-96 w-full animate-pulse bg-stone-100 rounded-xl" />}>
                <FilterSidebar
                  categories={categoryOptions}
                  materialTypes={materialOptions}
                  colours={colourOptions}
                  finishes={finishOptions}
                  origins={originOptions}
                  stockStatuses={stockStatusOptions}
                />
              </Suspense>
            </div>
          </div>

          {/* Product Grid & Controls */}
          <div className="lg:col-span-3 space-y-6">
            <Suspense fallback={<div className="h-10 w-full animate-pulse bg-stone-200 rounded-lg" />}>
              <ProductFilterBar
                categories={categoryOptions}
                materialTypes={materialOptions}
                colours={colourOptions}
                finishes={finishOptions}
                origins={originOptions}
                stockStatuses={stockStatusOptions}
                currentSort={sp.sort}
                totalResults={total}
              />
            </Suspense>

            {products.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-card">
                <EmptyState
                  title="No stone products match your filters"
                  description="Try broadening your filters, adjusting the price range, or searching for a different stone variety or quarry origin."
                  action={
                    <Link href="/products" className="btn-secondary text-sm">
                      Reset All Filters
                    </Link>
                  }
                />
              </div>
            ) : (
              <>
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
                      isFavourited={favouriteIds.has(p.id)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="pt-6">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    baseUrl="/products"
                    searchParams={sp}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
