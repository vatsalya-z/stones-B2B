import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumb, EmptyState } from "@stone/ui";
import { CategoryCard } from "@/components/ui/category-card";
import { ProductCard } from "@/components/ui/product-card";
import { getCategoryBySlug, getActiveCategories, getProducts } from "@/lib/db";
import { getCategoryFallbackImage } from "@/lib/images";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

const CATEGORY_ARCHITECTURAL_DATA: Record<
  string,
  {
    geology: string;
    origin: string;
    finishes: string[];
    thicknesses: string[];
    applications: string[];
    density: string;
    waterAbsorption: string;
  }
> = {
  marble: {
    geology: "Metamorphic recrystallized carbonate rock",
    origin: "Rajasthan (Makrana, Rajsamand, Udaipur, Kishangarh), Gujarat (Ambaji)",
    finishes: ["Mirror Polished", "Honed", "Leathered / Antique", "Brushed"],
    thicknesses: ["16mm", "18mm", "20mm", "30mm"],
    applications: ["Luxury Interior Flooring", "Bathroom Vanities", "Feature Wall Cladding", "Monuments"],
    density: "2,600 – 2,750 kg/m³",
    waterAbsorption: "< 0.5%",
  },
  granite: {
    geology: "Coarse-grained intrusive felsic igneous rock",
    origin: "Andhra Pradesh (Chimakkurthi / Black Galaxy), Telangana, Karnataka (Bangalore, Ilkal), Rajasthan (Jalore)",
    finishes: ["Mirror Polished", "Flamed", "Leathered", "Laporta", "Shot Blasted"],
    thicknesses: ["18mm", "20mm", "30mm"],
    applications: ["High-Traffic Commercial Flooring", "Kitchen Countertops", "Exterior Facades", "Steps & Risers"],
    density: "2,650 – 2,800 kg/m³",
    waterAbsorption: "< 0.2%",
  },
  sandstone: {
    geology: "Sedimentary rock composed of mineral particles and quartz",
    origin: "Rajasthan (Dholpur, Jodhpur, Bundi, Bijolia, Karauli), Madhya Pradesh (Gwalior)",
    finishes: ["Natural Cleft", "Honed", "Sandblasted", "Tumbled", "Bush Hammered"],
    thicknesses: ["18mm", "20mm", "25mm", "30mm", "50mm"],
    applications: ["Exterior Wall Cladding", "Patio Pavements", "Heritage Jali Carvings", "Pool Coping"],
    density: "2,300 – 2,450 kg/m³",
    waterAbsorption: "1.0% – 1.8%",
  },
  limestone: {
    geology: "Sedimentary carbonate rock consisting of calcite and aragonite",
    origin: "Rajasthan (Kota Blue, Jaisalmer Yellow), Karnataka (Tandur), Andhra Pradesh (Kadapa Black)",
    finishes: ["Mirror Polish", "Honed", "River Washed", "Natural Split", "Tumbled"],
    thicknesses: ["20mm", "25mm", "30mm", "Calibrated 22mm"],
    applications: ["Commercial Heavy-Duty Flooring", "Hospitality Corridors", "Pathways", "Internal Courtyards"],
    density: "2,550 – 2,650 kg/m³",
    waterAbsorption: "< 0.8%",
  },
  slate: {
    geology: "Fine-grained, foliated, homogeneous metamorphic rock",
    origin: "Himachal Pradesh, Haryana (Kund), Rajasthan, Andhra Pradesh",
    finishes: ["Natural Split / Cleft", "Honed", "Brushed"],
    thicknesses: ["10mm", "12mm", "15mm", "20mm"],
    applications: ["Architectural Roofing", "Feature Accent Cladding", "Pool Decks", "Rustic Flooring"],
    density: "2,700 – 2,800 kg/m³",
    waterAbsorption: "< 0.4%",
  },
  quartzite: {
    geology: "Hard, non-foliated metamorphic rock originally pure quartz sandstone",
    origin: "Himachal Pradesh, Rajasthan, Andhra Pradesh",
    finishes: ["Natural Cleft", "Honed", "Polished", "Flamed"],
    thicknesses: ["15mm", "20mm", "30mm"],
    applications: ["High-Abrasion Exterior Paving", "Driveways", "Wall Coverings", "Fireplace Surrounds"],
    density: "2,600 – 2,650 kg/m³",
    waterAbsorption: "< 0.3%",
  },
  travertine: {
    geology: "Terrestrial sedimentary rock formed by the precipitation of carbonate minerals",
    origin: "Imported & Selective Domestic Formations (Beige, Walnut, Silver, Noce)",
    finishes: ["Filled & Polished", "Unfilled & Honed", "Brushed", "Tumbled"],
    thicknesses: ["18mm", "20mm", "30mm"],
    applications: ["Spa & Pool Decks", "Interior Wall Cladding", "Warm Architectural Accents"],
    density: "2,400 – 2,550 kg/m³",
    waterAbsorption: "0.5% – 1.5%",
  },
  onyx: {
    geology: "Parallel banded variety of chalcedony cryptocrystalline quartz",
    origin: "Select Exotic Deposits (Green, Honey, Pure White Onyx)",
    finishes: ["High-Gloss Polish", "Translucent Backlit Slabs"],
    thicknesses: ["16mm", "18mm", "20mm"],
    applications: ["Backlit Bar Counters", "Luxury Reception Portals", "Feature Niches", "Vanity Slabs"],
    density: "2,600 – 2,750 kg/m³",
    waterAbsorption: "< 0.3%",
  },
  "semi-precious-stones": {
    geology: "Precious and semi-precious microcrystalline mineral aggregates",
    origin: "Rajasthan & Gujarat Lapidary Centers",
    finishes: ["Mirror Gem Polish", "Backlit Epoxy Matrix"],
    thicknesses: ["18mm", "20mm"],
    applications: ["Luxury Feature Walls", "Statement Bar Counters", "Bespoke Furniture", "Inlays"],
    density: "2,600 – 2,700 kg/m³",
    waterAbsorption: "< 0.1%",
  },
  "natural-stone-slabs": {
    geology: "Multi-wire gangsaw and circular cutter large-format natural stone slabs",
    origin: "Makrana, Kishangarh, Ongole, Jalore, Dholpur",
    finishes: ["Mirror Polished", "Honed", "Flamed", "Leathered"],
    thicknesses: ["16mm", "18mm", "20mm", "30mm"],
    applications: ["Large-Format Interior Flooring", "Matched Feature Panels", "Exterior Paving"],
    density: "2,600 – 2,850 kg/m³",
    waterAbsorption: "< 0.5%",
  },
  "stone-tiles": {
    geology: "Machine-gauged and edge-bevelled natural stone project tiles",
    origin: "Kota, Tandur, Makrana, Kund, Ongole",
    finishes: ["Mirror Polish", "Honed", "Natural Cleft", "Flamed"],
    thicknesses: ["10mm", "12mm", "15mm", "20mm", "22mm"],
    applications: ["Commercial Flooring", "Bathroom Lining", "Exterior Walkways", "Pool Decks"],
    density: "2,550 – 2,800 kg/m³",
    waterAbsorption: "< 0.8%",
  },
  "stone-blocks": {
    geology: "Wire-saw squared raw quarry blocks for industrial gangsaw processing",
    origin: "Direct Indian Quarry Benches (Andhra Pradesh, Rajasthan, Karnataka)",
    finishes: ["6-Side Wire-Saw Dressed", "Rough Quarry Dressed"],
    thicknesses: ["Raw Dressed Monolithic Dimensions"],
    applications: ["Gangsaw Slab Sawing", "Monumental Sculptures", "Break-Bulk Vessel Export"],
    density: "2,600 – 2,850 kg/m³",
    waterAbsorption: "< 0.3%",
  },
  "decorative-stone": {
    geology: "Computerized 5-axis CNC-machined and hand-carved architectural stone",
    origin: "Dholpur & Jodhpur (Rajasthan)",
    finishes: ["Honed", "Natural Cleft", "Sandblasted", "Carved"],
    thicknesses: ["25mm", "30mm", "50mm", "75mm"],
    applications: ["Ventilated Jaali Facades", "Wall Reliefs", "Columns & Cornices", "Temple Craft"],
    density: "2,350 – 2,550 kg/m³",
    waterAbsorption: "< 1.5%",
  },
  "custom-stone-products": {
    geology: "Bespoke cut-to-size elements engineered to architectural BOQ drawings",
    origin: "Certified Indian Fabrication Facilities",
    finishes: ["Custom Specified Finish Matrix"],
    thicknesses: ["Engineered to Project BOQ"],
    applications: ["Curved Cladding", "Stair Treads & Risers", "Pool Copings", "Bespoke Portals"],
    density: "2,400 – 2,800 kg/m³",
    waterAbsorption: "< 1.0%",
  },
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: "Category Not Found" };
  }

  const title = category.seo_title || `${category.name} Slabs & Tiles — Wholesale Indian Factory Direct`;
  const description =
    category.seo_description ||
    category.description ||
    `Source factory-direct ${category.name} gangsaw slabs, cut-to-size blocks, and calibrated tiles from verified Indian quarries and manufacturers.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/categories/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/categories/${slug}`,
      type: "website",
      images: [
        {
          url: category.image_url || getCategoryFallbackImage(slug),
          alt: `${category.name} Natural Stone`,
        },
      ],
    },
  };
}

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const [subCategories, { products, total }] = await Promise.all([
    getActiveCategories(category.id),
    getProducts({ category: slug, pageSize: 12 }),
  ]);

  const archData = CATEGORY_ARCHITECTURAL_DATA[slug.toLowerCase()];
  const fallbackImage = category.image_url || getCategoryFallbackImage(slug);

  const collectionPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} Natural Stone Slabs & Tiles`,
    description: category.description || `Wholesale ${category.name} from verified quarries.`,
    url: `https://stonesdekho.com/categories/${slug}`,
    breadcrumb: {
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
        {
          "@type": "ListItem",
          position: 3,
          name: category.name,
          item: `https://stonesdekho.com/categories/${slug}`,
        },
      ],
    },
  };

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      <div className="container-wide space-y-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            { label: category.name },
          ]}
        />

        {/* Category Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-stone-800 bg-stone-950 text-white shadow-2xl">
          <div className="absolute inset-0 z-0">
            <Image
              src={fallbackImage}
              alt={`${category.name} texture backdrop`}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-30 brightness-75 filter blur-[1px]"
              unoptimized={!fallbackImage.includes(".supabase.co")}
            />
            <div className="absolute inset-0 bg-stone-950/70" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-12">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
                <span>Verified Natural Stone Family</span>
                <span>•</span>
                <span>Factory Wholesale Lots</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                {category.name}
              </h1>
              <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-normal">
                {category.description ||
                  `Direct quarry connections for ${category.name}. Calibrated gangsaw slabs, project tiles, and custom cut blocks for architectural and commercial developments.`}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href={`/request-quote?category=${slug}`}
                  className="btn-accent px-6 py-2.5 text-sm font-semibold shadow-md shadow-amber-600/30"
                >
                  Request Bulk Quotation
                </Link>
                <Link
                  href={`/products?category=${slug}`}
                  className="btn-secondary border-stone-700 bg-stone-900/80 text-stone-200 hover:bg-stone-800 px-6 py-2.5 text-sm font-semibold"
                >
                  Filter {category.name} Slabs
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Geological & Architectural Properties Matrix */}
        {archData && (
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card">
            <div className="border-b border-stone-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-stone-900">
                Architectural & Engineering Specifications for {category.name}
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Standard technical benchmarks and quarry origins verified across Indian manufacturing units.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Primary Quarry Origin
                </span>
                <p className="mt-1 text-xs text-stone-700 leading-relaxed font-medium">
                  {archData.origin}
                </p>
              </div>

              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Commercial Finishes
                </span>
                <p className="mt-1 text-xs text-stone-700 leading-relaxed font-medium">
                  {archData.finishes.join(" · ")}
                </p>
              </div>

              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Standard Thicknesses
                </span>
                <p className="mt-1 text-xs text-stone-700 leading-relaxed font-medium">
                  {archData.thicknesses.join(" · ")}
                </p>
              </div>

              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Technical Metrics
                </span>
                <p className="mt-1 text-xs text-stone-700 leading-relaxed font-medium">
                  Density: {archData.density}
                  <br />
                  Absorption: {archData.waterAbsorption}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2 text-xs text-stone-600">
              <span className="font-semibold text-stone-800">Recommended Applications:</span>
              {archData.applications.map((app) => (
                <span
                  key={app}
                  className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700 border border-stone-200/60"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Subcategories (if any) */}
        {subCategories.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-stone-900 mb-4">
              Sub-Types & Formats
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {subCategories.map((sub) => (
                <CategoryCard
                  key={sub.id}
                  name={sub.name}
                  slug={sub.slug}
                  description={sub.description}
                  imageUrl={sub.image_url}
                />
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                {category.name} Available Lots ({total})
              </h2>
              <p className="text-xs text-stone-500">
                Factory lots with confirmed thickness, gangsaw dimensions, and quarry origin
              </p>
            </div>
            {total > 12 && (
              <Link
                href={`/products?category=${slug}`}
                className="text-sm font-semibold text-amber-700 hover:text-amber-800"
              >
                View all in {category.name} →
              </Link>
            )}
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
              <EmptyState
                title={`No products in ${category.name} currently listed`}
                description="Verified manufacturers are preparing their factory inventory for display."
                action={
                  <Link href={`/request-quote?category=${slug}`} className="btn-accent text-sm">
                    Post RFQ for {category.name}
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

        {/* Category-Specific Direct RFQ CTA */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-stone-900">
              Looking for custom dimensions or project cut sizes in {category.name}?
            </h3>
            <p className="text-xs sm:text-sm text-stone-600">
              Submit your architectural Bill of Quantities (BOQ). Verified manufacturers will send direct factory quotations with fumigated crate packaging and shipping terms.
            </p>
          </div>
          <Link
            href={`/request-quote?category=${slug}`}
            className="btn-accent px-6 py-2.5 text-sm font-semibold flex-shrink-0 shadow-sm"
          >
            Request Factory Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
