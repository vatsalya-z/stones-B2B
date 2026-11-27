import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb, EmptyState } from "@stone/ui";
import { ProductCard } from "@/components/ui/product-card";
import {
  getCategoryBySlug,
  getEnabledFormsForCategory,
  getProducts,
  type ProductFormSlug,
} from "@/lib/db";
import { getCurrentUserFavouriteIds } from "@/features/buyer/queries";

interface VarietyFormPageProps {
  params: Promise<{ slug: string; variety: string; form: string }>;
}

const VALID_FORMS = new Set(["slabs", "tiles", "blocks", "articles"]);

export async function generateMetadata({ params }: VarietyFormPageProps): Promise<Metadata> {
  const { slug, variety, form } = await params;
  if (!VALID_FORMS.has(form)) {
    return { title: "Product Form Not Found", robots: { index: false, follow: false } };
  }

  const [parent, child] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryBySlug(variety),
  ]);
  if (!parent || !child) {
    return { title: "Stone Form Not Found", robots: { index: false, follow: false } };
  }

  const enabledForms = await getEnabledFormsForCategory(child.id, child.slug);
  const matchedForm = enabledForms.find((f) => f.slug === form);
  if (!matchedForm) {
    return { title: "Product Form Unavailable", robots: { index: false, follow: false } };
  }

  const title = `${child.name} ${matchedForm.name} (${parent.name}) — Direct Quarry Sourcing`;
  const description = `Source ${child.name} ${matchedForm.name} directly from verified Indian quarries and processors. Request quotes for custom thicknesses, finishes and export bulk orders.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/categories/${slug}/${variety}/${form}`,
    },
    openGraph: {
      title,
      description,
      url: `/categories/${slug}/${variety}/${form}`,
      type: "website",
    },
  };
}

export default async function VarietyFormDetailPage({ params }: VarietyFormPageProps) {
  const { slug, variety, form } = await params;
  if (!VALID_FORMS.has(form)) {
    notFound();
  }

  const [parent, child] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryBySlug(variety),
  ]);

  if (!parent || !child) {
    notFound();
  }

  const enabledForms = await getEnabledFormsForCategory(child.id, child.slug);
  const matchedForm = enabledForms.find((f) => f.slug === (form as ProductFormSlug));
  if (!matchedForm) {
    notFound();
  }

  const [{ products, total }, favouriteIds] = await Promise.all([
    getProducts({ category: child.slug, format: form, pageSize: 18 }),
    getCurrentUserFavouriteIds(),
  ]);

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-wide space-y-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            { label: parent.name, href: `/categories/${parent.slug}` },
            { label: child.name, href: `/categories/${parent.slug}/${child.slug}` },
            { label: matchedForm.name },
          ]}
        />

        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-2xs space-y-4">
          <span className="inline-block rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
            {parent.name} · {child.name} · {matchedForm.name}
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold text-stone-900">
            {child.name} {matchedForm.name}
          </h1>
          <p className="text-sm sm:text-base text-stone-600 max-w-3xl leading-relaxed">
            {matchedForm.description}. Direct B2B sourcing from verified {parent.name.toLowerCase()} processors and quarry owners in India.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {enabledForms.map((f) => (
              <Link
                key={f.slug}
                href={`/categories/${parent.slug}/${child.slug}/${f.slug}`}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors ${
                  f.slug === form
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-stone-50 text-stone-700 border-stone-200 hover:border-amber-400"
                }`}
              >
                {f.name}
              </Link>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8">
            <EmptyState
              title={`Request Quotes for ${child.name} ${matchedForm.name}`}
              description={`Verified suppliers are onboarding ${child.name} ${matchedForm.name} lots. Send your project BOQ, required dimensions, and quantity to get direct supplier quotations.`}
              action={
                <Link
                  href={`/request-quote?product=${encodeURIComponent(`${child.name} ${matchedForm.name}`)}`}
                  className="btn-accent"
                >
                  Request a Quote
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-stone-900">
              {child.name} {matchedForm.name} ({total})
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
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
          </div>
        )}
      </div>

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
              { "@type": "ListItem", position: 5, name: matchedForm.name, item: `https://stonesdekho.com/categories/${parent.slug}/${child.slug}/${matchedForm.slug}` },
            ],
          }),
        }}
      />
    </div>
  );
}
