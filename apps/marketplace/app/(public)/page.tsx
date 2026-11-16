import type { Metadata } from "next";
import { getProducts, getActiveCategories, getFeaturedSellers } from "@/lib/db";
import { getCurrentUserFavouriteIds } from "@/features/buyer/queries";
import { StoneCategoryGrid } from "@/components/home/stone-category-grid";
import { ProductsCatalogSection } from "@/components/products/products-catalog-section";
import { VerifiedSuppliersSection } from "@/components/home/verified-suppliers-section";
import { ProjectApplicationGrid } from "@/components/home/project-application-grid";

export const metadata: Metadata = {
  title: "StonesDekho — Source Natural Stone Direct from Verified Suppliers",
  description:
    "A dedicated B2B natural stone sourcing marketplace for architects, builders, developers, and bulk procurement buyers. Verified quarries, bulk pricing, and custom project supply.",
  openGraph: {
    title: "StonesDekho — Premium B2B Natural Stone Marketplace",
    description:
      "Source premium natural stone directly from verified Indian quarries and manufacturers. Marble, granite, sandstone, limestone, quartzite, and slate.",
    type: "website",
  },
};

interface HomePageProps {
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

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = (await searchParams) || {};
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [categories, { products, total, totalPages }, favouriteIds, featuredSellers] = await Promise.all([
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
    getFeaturedSellers(4),
  ]);

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "StonesDekho",
    url: "https://stonesdekho.com",
    description: "Premium B2B Natural Stone Marketplace connecting verified Indian quarries and factories.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://stonesdekho.com/products?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "StonesDekho",
    url: "https://stonesdekho.com",
    logo: "https://stonesdekho.com/icon.svg",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "trade desk",
      email: "trade@stonesdekho.com",
      areaServed: ["IN", "US", "AE", "GB", "EU", "AU"],
      availableLanguage: ["English", "Hindi"],
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* 1. Live Stone Products Catalog & Sourcing Directory */}
      <section id="products-catalog" className="pt-6 sm:pt-8 pb-10 bg-white">
        <div className="container-wide">
          <ProductsCatalogSection
            categories={categories}
            products={products}
            total={total}
            totalPages={totalPages}
            page={page}
            searchParams={sp}
            favouriteIds={favouriteIds}
            showBreadcrumbs={false}
            baseUrl="/"
          />
        </div>
      </section>

      {/* 2. Curated Geological Collections (Explore by Stone Category - Compact Luxury Showcase) */}
      <StoneCategoryGrid categories={categories} />

      {/* 3. Verified Indian Stone Suppliers & Quarry Owners */}
      <VerifiedSuppliersSection sellers={featuredSellers} />

      {/* 4. Popular Project Applications (4 Cards) */}
      <ProjectApplicationGrid />
    </div>
  );
}
