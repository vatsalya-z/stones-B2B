import type { Metadata } from "next";
import { Breadcrumb } from "@stone/ui";
import { getActiveCategories } from "@/lib/db";
import { CategoryDiscoveryExplorer } from "@/components/categories/category-discovery-explorer";

export const metadata: Metadata = {
  title: "Natural Stone Categories — Indian Marble, Granite, Sandstone & Slabs | StonesDekho",
  description:
    "Explore India's premier B2B natural stone collections: Makrana Marble, Black Galaxy Granite, Dholpur Sandstone, Kota Limestone, Slate, Quartzite, Gangsaw Slabs, and Calibrated Tiles sourced directly from verified Indian quarries.",
  alternates: {
    canonical: "/categories",
  },
  openGraph: {
    title: "Natural Stone Collections & Directory | StonesDekho B2B",
    description:
      "Explore wholesale Indian natural stone collections by geology, surface finish, quarry origin, and architectural application. Direct factory procurement.",
    url: "/categories",
    type: "website",
  },
};

interface CategoriesPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const sp = await searchParams;
  const categories = await getActiveCategories(null);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://stonesdekho.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Stone Categories",
        item: "https://stonesdekho.com/categories",
      },
    ],
  };

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="container-wide space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Categories" },
          ]}
        />

        {/* Master Category Discovery Explorer (Sections A, B, C, D, E) */}
        <CategoryDiscoveryExplorer
          categories={categories}
          initialSearch={sp?.q ?? ""}
        />
      </div>
    </div>
  );
}
