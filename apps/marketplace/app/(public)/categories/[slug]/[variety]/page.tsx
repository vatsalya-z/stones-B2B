import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumb, EmptyState } from "@stone/ui";
import { CategoryCard } from "@/components/ui/category-card";
import { ProductCard } from "@/components/ui/product-card";
import {
  getActiveCategories,
  getCategoryBySlug,
  getEnabledFormsForCategory,
  getProducts,
} from "@/lib/db";
import { getCurrentUserFavouriteIds } from "@/features/buyer/queries";
import { getCategoryFallbackImage } from "@/lib/images";

interface VarietyPageProps {
  params: Promise<{ slug: string; variety: string }>;
}

export async function generateMetadata({ params }: VarietyPageProps): Promise<Metadata> {
  const { slug, variety } = await params;
  const [parent, child] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryBySlug(variety),
  ]);

  if (!parent || !child) {
    return { title: "Stone Variety Not Found" };
  }

  const title =
    child.seo_title ||
    `${child.name} ${parent.name} — Slabs, Tiles & Blocks | StonesDekho`;
  const description =
    child.seo_description ||
    child.description ||
    `Source verified ${child.name} (${parent.name}) direct from Indian quarries and stone processors. Request quotes for slabs, tiles, blocks and custom cut sizes.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/categories/${slug}/${variety}`,
    },
    openGraph: {
      title,
      description,
      url: `/categories/${slug}/${variety}`,
      type: "website",
      images: [
        {
          url: child.image_url || getCategoryFallbackImage(variety),
          alt: `${child.name} ${parent.name}`,
        },
      ],
    },
  };
}

export default async function VarietyDetailPage({ params }: VarietyPageProps) {
  const { slug, variety } = await params;
  const [parent, child] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryBySlug(variety),
  ]);

  if (!parent || !child) {
    notFound();
  }

  const [enabledForms, sisterVarieties, { products, total }, favouriteIds] = await Promise.all([
    getEnabledFormsForCategory(child.id, child.slug),
    getActiveCategories(parent.id),
    getProducts({ category: child.slug, pageSize: 18 }),
    getCurrentUserFavouriteIds(),
  ]);

  const heroImage = child.image_url || getCategoryFallbackImage(variety);

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-wide space-y-10">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            { label: parent.name, href: `/categories/${parent.slug}` },
            { label: child.name },
          ]}
        />

        {/* Variety Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="p-6 sm:p-10 lg:col-span-7 flex flex-col justify-center space-y-4">
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                <span>{parent.name} Variety</span>
                <span>•</span>
                <span>{enabledForms.length} Supply Forms</span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                {child.name}
              </h1>

              <p className="text-base text-stone-600 leading-relaxed max-w-2xl">
                {child.description ||
                  `Direct B2B sourcing of ${child.name} (${parent.name}) from verified quarry owners and export processors across India.`}
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href={`/request-quote?category=${encodeURIComponent(child.name)}`}
                  className="btn-accent"
                >
                  Request a Quote
                </Link>
                <Link
                  href={`/suppliers?category=${parent.slug}`}
                  className="btn-secondary"
                >
                  Contact Suppliers
                </Link>
              </div>
            </div>

            <div className="relative aspect-[16/10] lg:aspect-auto lg:col-span-5 bg-stone-100">
              {heroImage && (
                <Image
                  src={heroImage}
                  alt={`${child.name} ${parent.name} natural stone`}
                  fill
                  className="object-cover"
                  priority
                  unoptimized={!heroImage.includes(".supabase.co")}
                />
              )}
            </div>
          </div>
        </div>

        {/* Product Forms Selector */}
        <section className="space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Available Product Forms
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
              Browse {child.name} by Form
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {enabledForms.map((form) => (
              <Link
                key={form.slug}
                href={`/categories/${parent.slug}/${child.slug}/${form.slug}`}
                className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs hover:border-amber-400 hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    {child.name}
                  </span>
                  <h3 className="mt-2.5 text-lg font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                    {form.name}
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                    {form.description}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-800">
                  Explore {form.name} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Variety Products Grid */}
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              {child.name} Listed Lots ({total})
            </h2>
            <p className="text-xs text-stone-500">
              Verified quarry &amp; processor lots — click Request Quote for best project pricing
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-8">
              <EmptyState
                title={`Direct Sourcing for ${child.name}`}
                description={`We source ${child.name} (${parent.name}) directly from verified Indian quarries in ${enabledForms.map((f) => f.name).join(", ")}. Submit your BOQ or dimensions to receive supplier quotes.`}
                action={
                  <Link
                    href={`/request-quote?category=${encodeURIComponent(child.name)}`}
                    className="btn-accent"
                  >
                    Get Best Price / Send RFQ
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          )}
        </section>

        {/* Related Sister Varieties */}
        {sisterVarieties.length > 1 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">
                More {parent.name} Varieties
              </h2>
              <Link
                href={`/categories/${parent.slug}`}
                className="text-xs font-bold text-amber-800 hover:underline"
              >
                View all {parent.name} →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {sisterVarieties
                .filter((s) => s.slug !== child.slug)
                .slice(0, 8)
                .map((sub) => (
                  <CategoryCard
                    key={sub.id}
                    name={sub.name}
                    slug={sub.slug}
                    href={`/categories/${parent.slug}/${sub.slug}`}
                    description={sub.description}
                    imageUrl={sub.image_url}
                  />
                ))}
            </div>
          </section>
        )}
      </div>

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://stonesdekho.com" },
              { "@type": "ListItem", position: 2, name: "Categories", item: "https://stonesdekho.com/categories" },
              { "@type": "ListItem", position: 3, name: parent.name, item: `https://stonesdekho.com/categories/${parent.slug}` },
              { "@type": "ListItem", position: 4, name: child.name, item: `https://stonesdekho.com/categories/${parent.slug}/${child.slug}` },
            ],
          }),
        }}
      />
    </div>
  );
}
