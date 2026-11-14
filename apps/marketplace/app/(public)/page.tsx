import type { Metadata } from "next";
import { getFeaturedProducts, getFeaturedSellers, getActiveCategories } from "@/lib/db";
import { HeroSection } from "@/components/home/hero-section";
import { TrustMetricsStrip } from "@/components/home/trust-metrics-strip";
import { ProjectRequirementPanel } from "@/components/home/project-requirement-panel";
import { StoneCategoriesSection } from "@/components/home/stone-categories-section";
import { FeaturedMaterialsSection } from "@/components/home/featured-materials-section";
import { VerifiedSuppliersSection } from "@/components/home/verified-suppliers-section";
import { ArchitecturalApplicationsSection } from "@/components/home/architectural-applications-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { ValuePropositionsSection } from "@/components/home/value-propositions-section";
import { ProjectCtaSection } from "@/components/home/project-cta-section";

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

export default async function HomePage() {
  const [categories, products, sellers] = await Promise.all([
    getActiveCategories(null),
    getFeaturedProducts(6),
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

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Trust Metrics Strip */}
      <TrustMetricsStrip />

      {/* 3. Floating B2B Requirement Panel */}
      <ProjectRequirementPanel />

      {/* 4. Browse by Stone Categories */}
      <StoneCategoriesSection categories={categories} />

      {/* 5. Featured Stone Materials */}
      <FeaturedMaterialsSection initialProducts={products} />

      {/* 6. Verified Suppliers & Quarries */}
      <VerifiedSuppliersSection sellers={sellers} />

      {/* 7. Architectural Project Applications */}
      <ArchitecturalApplicationsSection />

      {/* 8. How StonesDekho Works */}
      <HowItWorksSection />

      {/* 9. Built for Importers, Architects & Contractors */}
      <ValuePropositionsSection />

      {/* 10. Final Project Requirement CTA */}
      <ProjectCtaSection />
    </div>
  );
}
