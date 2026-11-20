import type { Metadata } from "next";
import { ProductsCatalogSection } from "@/components/products/products-catalog-section";
import { getCurrentUserFavouriteIds } from "@/features/buyer/queries";
import { getProducts, getActiveCategories } from "@/lib/db";

export const metadata: Metadata = {
  title: "Natural Stone Slabs & Tiles — Indian Quarry Wholesale Directory | StoneB2B",
  description:
    "Explore natural stone slabs, architectural tiles, blocks, and natural stone collections sourced directly from verified Indian quarries and manufacturers.",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "Natural Stone Products & Gangsaw Slabs | StoneB2B Directory",
    description:
      "Source factory-direct Indian marble, granite, sandstone, limestone, slate, quartzite, and travertine. Standard thicknesses and export-grade packaging.",
    url: "/products",
    type: "website",
  },
};

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    location?: string;
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
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [categories, { products, total, totalPages }, favouriteIds] = await Promise.all([
    getActiveCategories(null),
    getProducts({
      q: sp.q,
      location: sp.location,
      category: sp.category,
      material: sp.material,
      colour: sp.colour,
      finish: sp.finish,
      origin: sp.origin,
      thickness: sp.thickness,
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

  const productListingJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Natural Stone Products & Factory Lots Directory | StoneB2B",
    description: "Search and filter Indian natural stone products, gangsaw slabs, and architectural tiles from verified quarries.",
    url: "https://stonesdekho.com/products",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: products.map((p, idx) => ({
        "@type": "ListItem",
        position: (page - 1) * 18 + idx + 1,
        item: {
          "@type": "Product",
          name: p.name,
          url: `https://stonesdekho.com/products/${p.slug}`,
          image: p.primaryImage || "https://stonesdekho.com/images/products/makrana-white-marble.jpg",
          material: p.materialType,
          offers: p.price
            ? {
                "@type": "Offer",
                price: p.price,
                priceCurrency: p.currency,
                availability:
                  p.stockStatus === "in_stock"
                    ? "https://schema.org/InStock"
                    : "https://schema.org/PreOrder",
              }
            : undefined,
        },
      })),
    },
  };

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productListingJsonLd) }}
      />
      <div className="container-wide space-y-8">
        <ProductsCatalogSection
          categories={categories}
          products={products}
          total={total}
          totalPages={totalPages}
          page={page}
          searchParams={sp}
          favouriteIds={favouriteIds}
          showBreadcrumbs={true}
          baseUrl="/products"
        />
      </div>
    </div>
  );
}
