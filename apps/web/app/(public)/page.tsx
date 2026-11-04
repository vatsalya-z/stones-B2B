import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { SectionHeading, EmptyState } from "@stone/ui";
import { ProductCard } from "@/components/ui/product-card";
import { SupplierCard } from "@/components/ui/supplier-card";
import { CategoryCard } from "@/components/ui/category-card";
import { SearchBar } from "@/components/ui/search-bar";
import { getFeaturedProducts, getFeaturedSellers, getActiveCategories } from "@/lib/db";
import { HERO_IMAGES } from "@/lib/images";

export const metadata: Metadata = {
  title: "StonesDekho — Premium Natural Stone Marketplace",
  description:
    "Source premium natural stone directly from verified Indian manufacturers and exporters. Marble, granite, sandstone, quartzite, limestone and architectural stone.",
  openGraph: {
    title: "StonesDekho — Premium Natural Stone Marketplace",
    description: "Source premium natural stone directly from verified Indian manufacturers on StonesDekho.",
    type: "website",
  },
};

const ARCHITECTURAL_APPLICATIONS = [
  {
    title: "Flooring & Large-Format Paving",
    subtitle: "High-traffic commercial, hotel lobbies & outdoor public plazas",
    recommended: "Granite · Kota Limestone · Quartzite · Hard Marble",
    image: "/images/categories/granite.jpg",
    href: "/products?finish=Polished",
  },
  {
    title: "Interior & Exterior Wall Cladding",
    subtitle: "Dry-hung ventilated stone facades & bookmatched feature walls",
    recommended: "Makrana Marble · Travertine · Slate · Sandstone",
    image: "/images/product-gallery/marble-install-living.jpg",
    href: "/products?finish=Honed",
  },
  {
    title: "Kitchen Countertops & Vanity Slabs",
    subtitle: "Scratch & stain-resistant monolithic stone surfaces",
    recommended: "Black Galaxy Granite · Tan Brown · White Quartzite",
    image: "/images/products/black-galaxy-granite.jpg",
    href: "/products?material=Granite",
  },
  {
    title: "Landscaping, Cobbles & Pathways",
    subtitle: "Weatherproof anti-skid paving, kerbstones & driveways",
    recommended: "Dholpur Beige · Kota Blue · Natural Cleft Slate",
    image: "/images/products/dholpur-beige-sandstone.jpg",
    href: "/products?material=Sandstone",
  },
  {
    title: "Architectural Facades & Cut Panels",
    subtitle: "CNC-routed stone screens, fluted panels & rain-screen panels",
    recommended: "Teakwood Sandstone · Rainbow · Travertine",
    image: "/images/categories/sandstone.jpg",
    href: "/products?material=Sandstone",
  },
  {
    title: "Heritage Stonecraft & Monuments",
    subtitle: "Intricate jaalis, columns, hand-chiseled temple architecture",
    recommended: "Pure Makrana Marble · Pink Sandstone · Limestone",
    image: "/images/products/makrana-white-marble.jpg",
    href: "/products?material=Marble",
  },
];

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
    <div className="flex flex-col">
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
      <section className="relative overflow-hidden bg-stone-900 text-white">
        {/* Photographic Hero Background — Luxury Architectural Stone Showroom */}
        <div className="absolute inset-0 z-0">
          <Image
            src={HERO_IMAGES.showroom}
            alt="Luxury natural stone architectural showroom and bookmatched marble slabs"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-45"
            unoptimized
          />
        </div>

        {/* Directional Gradient Scrim: dark on left for text legibility, subtle on right to showcase stone */}
        
        <div
          className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-10 z-10"
          aria-hidden="true"
        />

        <div className="relative z-20 container-wide py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column (7 cols): Headline, Description, Search & CTAs */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400 ring-1 ring-inset ring-amber-500/30">
                India&apos;s Leading Natural Stone B2B Network
              </div>

              <h1 className="mt-3.5 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-stone-50 leading-tight max-w-2xl">
                Source Premium Natural Stone —{" "}
                <span className="text-amber-500">Direct from Verified Quarries & Factories</span>
              </h1>

              <p className="mt-3 text-sm sm:text-base text-stone-300 leading-relaxed font-normal max-w-xl">
                Connect with leading Indian stone manufacturers, quarry owners, and certified exporters.
                Discover marble, granite, sandstone, slate, and architectural stone for global projects.
              </p>

              {/* Product Search */}
              <div className="mt-5 max-w-md">
                <Suspense fallback={<div className="h-12 w-full rounded-xl bg-stone-800 animate-pulse" />}>
                  <SearchBar variant="hero" defaultValue="" />
                </Suspense>
              </div>

              {/* CTAs */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/products"
                  className="btn-accent px-5 py-2.5 text-sm font-semibold shadow-md shadow-amber-600/20"
                >
                  Explore Slabs & Tiles
                </Link>
                <Link
                  href="/register/seller"
                  className="btn-secondary border-stone-700 bg-stone-800/80 text-stone-200 hover:bg-stone-800 hover:border-stone-600 px-5 py-2.5 text-sm font-semibold"
                >
                  List Your Factory
                </Link>
              </div>

              {/* B2B Trust Indicators */}
              <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>100% Verified Indian Factories</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Factory-Direct Wholesale Pricing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span>Global Port Container Dispatch</span>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Featured Premium Natural Stone Showcase Card */}
            <div className="hidden lg:block lg:col-span-5">
              <div className="relative rounded-2xl border border-stone-700/70 bg-stone-900/70 p-4 shadow-2xl backdrop-blur-md">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-stone-800">
                  <Image
                    src="/images/products/makrana-white-marble.jpg"
                    alt="Makrana Pure White Marble Slab"
                    fill
                    sizes="(max-width: 1280px) 40vw, 480px"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    priority
                    unoptimized
                  />
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center rounded-full bg-stone-950/80 px-3 py-1 text-xs font-medium text-amber-400 backdrop-blur-sm border border-amber-500/30">
                      ★ Featured Factory Lot
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="inline-flex items-center rounded-lg bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-stone-950 backdrop-blur-sm">
                      Verified Exporter
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-stone-100">
                        Makrana Pure White Marble Slabs
                      </h3>
                      <p className="text-xs text-stone-400">
                        Origin: Makrana, Rajasthan · 18mm Gangsaw Slabs
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-stone-400">Wholesale</span>
                      <p className="text-sm font-extrabold text-amber-400">
                        ₹650 <span className="text-[11px] font-normal text-stone-400">/ sq ft</span>
                      </p>
                    </div>
                  </div>

                  {/* Thumbnail Row of other stone varieties */}
                  <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
                    <span>Popular Stones:</span>
                    <div className="flex items-center gap-2">
                      <Link
                        href="/products/black-galaxy-granite"
                        className="group/t relative h-9 w-9 overflow-hidden rounded-lg border border-stone-700 hover:border-amber-500 transition-colors"
                        title="Black Galaxy Granite"
                      >
                        <Image
                          src="/images/products/black-galaxy-granite.jpg"
                          alt="Black Galaxy Granite"
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      </Link>
                      <Link
                        href="/products/dholpur-beige-sandstone"
                        className="group/t relative h-9 w-9 overflow-hidden rounded-lg border border-stone-700 hover:border-amber-500 transition-colors"
                        title="Dholpur Beige Sandstone"
                      >
                        <Image
                          src="/images/products/dholpur-beige-sandstone.jpg"
                          alt="Dholpur Beige Sandstone"
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      </Link>
                      <Link
                        href="/products/rajasthan-green-marble"
                        className="group/t relative h-9 w-9 overflow-hidden rounded-lg border border-stone-700 hover:border-amber-500 transition-colors"
                        title="Rajasthan Green Marble"
                      >
                        <Image
                          src="/images/products/rajasthan-green-marble.jpg"
                          alt="Rajasthan Green Marble"
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      </Link>
                      <Link
                        href="/products/classic-travertine-slab"
                        className="group/t relative h-9 w-9 overflow-hidden rounded-lg border border-stone-700 hover:border-amber-500 transition-colors"
                        title="Classic Travertine"
                      >
                        <Image
                          src="/images/products/classic-travertine-slab.jpg"
                          alt="Classic Travertine"
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Categories */}
      <section className="section-pad bg-white">
        <div className="container-wide">
          <SectionHeading
            title="Stone Varieties & Products"
            subtitle="Explore high-demand natural stone categories sourced directly from key Indian stone belts"
            action={
              <Link
                href="/categories"
                className="text-sm font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                View all categories →
              </Link>
            }
          />

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="Categories are being curated"
                  description="New stone categories and catalogues will appear here shortly."
                />
              </div>
            ) : (
              categories.slice(0, 8).map((cat) => (
                <CategoryCard
                  key={cat.id}
                  name={cat.name}
                  slug={cat.slug}
                  description={cat.description}
                  imageUrl={cat.image_url}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. Popular Applications & Project-Use Categories */}
      <section className="section-pad bg-stone-50 border-t border-stone-200/60">
        <div className="container-wide">
          <SectionHeading
            title="Architectural Project Applications"
            subtitle="Discover calibrated stone slabs, pavers, and carved elements engineered for specific project typologies"
            action={
              <Link
                href="/products"
                className="text-sm font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                Browse all specifications →
              </Link>
            }
          />

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ARCHITECTURAL_APPLICATIONS.map((app, i) => (
              <Link
                key={i}
                href={app.href}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card transition-all hover:border-amber-600/30 hover:shadow-card-hover"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
                  <Image
                    src={app.image}
                    alt={app.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-xs font-semibold text-amber-400 drop-shadow-sm">Project Application</span>
                    <h3 className="text-lg font-bold text-white drop-shadow-md">{app.title}</h3>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <p className="text-xs text-stone-600 leading-relaxed">{app.subtitle}</p>
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-500">Key Stones:</span>
                    <span className="font-semibold text-stone-800 text-right">{app.recommended}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Popular Stone Products */}
      <section className="section-pad bg-white border-y border-stone-200/60">
        <div className="container-wide">
          <SectionHeading
            title="Featured Products"
            subtitle="Recent approved stone lots, gangsaw slabs, and calibrated tiles from verified suppliers"
            action={
              <Link
                href="/products"
                className="btn-secondary text-sm font-semibold"
              >
                Browse All Products
              </Link>
            }
          />

          <div className="mt-8">
            {products.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
                <EmptyState
                  title="No stone products listed yet"
                  description="Verified manufacturers are currently preparing their factory inventory for display."
                  action={
                    <Link href="/register/seller" className="btn-accent text-sm">
                      Become a Seller
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. How StonesDekho Works */}
      <section id="how-it-works" className="section-pad bg-white border-b border-stone-200/60 scroll-mt-20">
        <div className="container-wide">
          <SectionHeading
            title="How StonesDekho Works"
            subtitle="A transparent, streamlined 4-step procurement process built specifically for natural stone logistics"
            align="center"
            action={
              <Link
                href="/how-it-works"
                className="text-sm font-semibold text-amber-600 hover:text-amber-700 flex items-center justify-center gap-1 mt-2 sm:mt-0"
              >
                Read comprehensive procurement guide →
              </Link>
            }
          />

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Direct Factory Discovery",
                desc: "Search stone by quarry origin, thickness, finish, and gangsaw capacity across verified Indian manufacturers.",
              },
              {
                step: "02",
                title: "Sample & Slab Inspection",
                desc: "Inspect live slab lot photographs, crystalline veining, and request physical lab-tested samples for architect approval.",
              },
              {
                step: "03",
                title: "Custom BOQ & Quotation",
                desc: "Submit your exact architectural Bill of Quantities. Receive transparent, factory-direct commercial quotations without broker markups.",
              },
              {
                step: "04",
                title: "Crate Packing & Dispatch",
                desc: "Sellers pack your slabs in fumigated, seaworthy wooden crates for container loading and port dispatch (Mundra, Pipavav, Chennai).",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-stone-200/80 bg-stone-50/60 p-6 transition-all hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-amber-600/80 tracking-tight">{item.step}</span>
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <h3 className="mt-4 text-base font-bold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Why Choose StonesDekho */}
      <section className="section-pad bg-stone-50/50">
        <div className="container-wide">
          <SectionHeading
            title="Built for Stone Importers, Architects & Contractors"
            subtitle="An enterprise B2B platform designed specifically around stone trade logistics and quality control."
            align="center"
          />

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: (
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "Strict Factory Verification",
                desc: "Every seller's GST, factory location, processing machinery, and past exports are rigorously verified.",
              },
              {
                icon: (
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Factory-Direct Pricing",
                desc: "Cut out middlemen and brokers. Direct communication with quarry owners and processing units.",
              },
              {
                icon: (
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                ),
                title: "Detailed Architectural Specs",
                desc: "Search stone by exact thickness (mm), surface finish (polished, flamed, leathered), and quarry origin.",
              },
              {
                icon: (
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Export & Domestic Logistics",
                desc: "Suppliers experienced in international seaworthy wooden crate packaging and port dispatch.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-6 transition-all hover:border-stone-300 hover:bg-stone-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-600/20">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Featured Suppliers */}
      <section className="section-pad bg-stone-50 border-t border-stone-200/60">
        <div className="container-wide">
          <SectionHeading
            title="Verified Suppliers & Exporters"
            subtitle="Connect with certified stone processing companies from Rajasthan, Gujarat, Andhra Pradesh, and Karnataka"
            action={
              <Link
                href="/suppliers"
                className="text-sm font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                View all suppliers →
              </Link>
            }
          />

          <div className="mt-8">
            {sellers.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
                <EmptyState
                  title="Suppliers directory updating"
                  description="Verified manufacturers will be featured here."
                  action={
                    <Link href="/register/seller" className="btn-accent text-sm">
                      Register as Supplier
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {sellers.map((s) => (
                  <SupplierCard
                    key={s.id}
                    id={s.id}
                    slug={s.slug}
                    businessName={s.businessName}
                    businessType={s.businessType}
                    logoUrl={s.logoUrl}
                    city={s.city}
                    state={s.state}
                    description={s.description}
                    yearsInBusiness={s.yearsInBusiness}
                    verifiedAt={s.verifiedAt}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. Buyer Enquiry CTA */}
      <section className="relative overflow-hidden py-20 sm:py-24 bg-stone-950 text-white">
        <div className="absolute inset-0 z-0">
          <Image
            src={HERO_IMAGES.procurement}
            alt="Luxury natural stone gangsaw slabs showroom and B2B gallery"
            fill
            sizes="100vw"
            className="object-cover object-center"
            unoptimized
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-stone-950/55 via-stone-950/40 to-stone-950/55"
            aria-hidden="true"
          />
        </div>
        <div className="relative z-10 container-narrow text-center">
          <span className="inline-block rounded-full bg-stone-950/70 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-amber-400 ring-1 ring-amber-400/30 backdrop-blur-sm">
            Direct B2B Procurement
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
            Have a Specific Architectural or Bulk Requirement?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-stone-100 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
            Send your custom cut-to-size specifications, bill of quantities (BOQ), or project requirements directly to verified suppliers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/request-quote" className="btn-accent px-8 py-3 text-sm font-semibold shadow-lg shadow-amber-600/30">
              Post Custom RFQ
            </Link>
            <Link href="/products" className="btn-secondary border-stone-600 bg-stone-900/80 text-white hover:bg-stone-800 hover:border-stone-500 backdrop-blur-sm px-8 py-3 text-sm font-semibold">
              Search Stone Slabs
            </Link>
            <Link
              href="/suppliers"
              className="btn-secondary border-white/25 bg-stone-950/70 text-white hover:bg-stone-900/90 hover:border-white/40 backdrop-blur-sm px-8 py-3 text-sm font-semibold"
            >
              Find Factory Partners
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
