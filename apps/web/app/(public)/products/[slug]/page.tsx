import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumb, Badge, VerifiedBadge, SectionHeading } from "@stone/ui";
import { ProductGallery } from "@/components/ui/product-gallery";
import { ProductCard } from "@/components/ui/product-card";
import { FavouriteButton } from "@/components/buyer/favourite-button";
import { StartConversationButton } from "@/components/messaging/start-conversation-button";
import { EnquiryForm } from "@/features/enquiry/enquiry-form";
import { getCurrentUserFavouriteIds } from "@/features/buyer/queries";
import { getCurrentUser } from "@/lib/auth";
import { getProductBySlug, getRelatedProducts } from "@/lib/db";
import { getProductFallbackImage, getProductGalleryImages } from "@/lib/images";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const primaryImage =
    product.images.find((i) => i.is_primary)?.src ||
    product.images[0]?.src ||
    getProductFallbackImage(product.slug, product.material_type);

  const seoTitleSpec = product.specifications.find(
    (s) => s.specification_name.toLowerCase() === "seo title",
  )?.specification_value;
  const seoDescSpec = product.specifications.find(
    (s) => s.specification_name.toLowerCase() === "seo description",
  )?.specification_value;

  const metaTitle = seoTitleSpec || `${product.name} — ${product.seller.business_name}`;
  const metaDesc =
    seoDescSpec ||
    product.description ||
    `Buy ${product.name} directly from verified manufacturer ${product.seller.business_name}. Slabs, tiles, and custom specifications available.`;

  return {
    title: metaTitle,
    description: metaDesc,
    alternates: {
      canonical: `/products/${slug}`,
    },
    openGraph: {
      title: metaTitle,
      description: metaDesc || undefined,
      url: `/products/${slug}`,
      type: "website",
      images: primaryImage ? [{ url: primaryImage }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [relatedProducts, favouriteIds, currentUser] = await Promise.all([
    product.category_id
      ? getRelatedProducts(product.category_id, product.id, 3)
      : Promise.resolve([]),
    getCurrentUserFavouriteIds(),
    getCurrentUser(),
  ]);

  const primaryImage =
    product.images.find((i) => i.is_primary)?.src ||
    product.images[0]?.src;

  const uploadedGallery = [...product.images]
    .filter((i) => Boolean(i.src))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
    .map((i) => ({
      src: i.src,
      altText: i.alt_text || product.name,
      isPrimary: i.is_primary,
    }));

  const galleryImages =
    uploadedGallery.length > 0
      ? uploadedGallery
      : getProductGalleryImages(product.slug, product.material_type, primaryImage);

  const visibleSpecifications = product.specifications.filter(
    (s) => !["seo title", "seo description"].includes(s.specification_name.toLowerCase()),
  );

  const location = [product.seller.city, product.seller.state, product.seller.country]
    .filter(Boolean)
    .join(", ");

  const formatPrice = () => {
    if (product.price_type === "on_request" || product.price === null) {
      return "Price On Request";
    }
    const symbol = product.currency === "INR" ? "₹" : product.currency;
    const prefix = product.price_type === "starting" ? "From " : "";
    const suffix = product.price_type === "negotiable" ? " (Negotiable)" : "";
    return `${prefix}${symbol} ${product.price.toLocaleString("en-IN")}${suffix}`;
  };

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-wide space-y-12">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Products", href: "/products" },
            ...(product.category
              ? [{ label: product.category.name, href: `/categories/${product.category.slug}` }]
              : []),
            { label: product.name },
          ]}
        />

        {/* Product Overview Layout: Gallery + Specs/Enquiry */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column: Gallery & Description (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <ProductGallery
              images={galleryImages}
              productName={product.name}
            />

            {/* Description */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-stone-900 mb-4">About this Stone</h2>
              <p className="text-sm sm:text-base leading-relaxed text-stone-600 whitespace-pre-line">
                {product.description ||
                  "Natural stone with unique geological veining and mineral patterning. Cut and finished to architectural standard with full quality control."}
              </p>

              {/* Physical Specifications Grid */}
              <div className="mt-8 border-t border-stone-100 pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-4">
                  Standard Dimensions & Properties
                </h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {product.material_type && (
                    <div>
                      <dt className="text-xs text-stone-400">Material</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-900">
                        {product.material_type}
                      </dd>
                    </div>
                  )}
                  {product.colour && (
                    <div>
                      <dt className="text-xs text-stone-400">Primary Colour</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-900">
                        {product.colour}
                      </dd>
                    </div>
                  )}
                  {product.finish && (
                    <div>
                      <dt className="text-xs text-stone-400">Surface Finish</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-900">
                        {product.finish}
                      </dd>
                    </div>
                  )}
                  {product.stone_origin && (
                    <div>
                      <dt className="text-xs text-stone-400">Quarry Origin</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-900">
                        {product.stone_origin}
                      </dd>
                    </div>
                  )}
                  {product.thickness !== null && (
                    <div>
                      <dt className="text-xs text-stone-400">Thickness</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-900">
                        {product.thickness} mm
                      </dd>
                    </div>
                  )}
                  {product.length && product.width ? (
                    <div>
                      <dt className="text-xs text-stone-400">Dimensions (L × W)</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-900">
                        {product.length} × {product.width} mm
                      </dd>
                    </div>
                  ) : null}
                  {product.minimum_order_quantity !== null && (
                    <div>
                      <dt className="text-xs text-stone-400">Minimum Order</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-900">
                        {product.minimum_order_quantity} {product.unit}
                      </dd>
                    </div>
                  )}
                  {product.lead_time !== null && (
                    <div>
                      <dt className="text-xs text-stone-400">Lead Time</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-900">
                        {product.lead_time} days
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Custom Technical Specifications */}
              {visibleSpecifications.length > 0 && (
                <div className="mt-8 border-t border-stone-100 pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-4">
                    Laboratory & Technical Specifications
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-stone-200">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-stone-200">
                        {visibleSpecifications.map((spec) => (
                          <tr key={spec.id} className="hover:bg-stone-50">
                            <td className="px-4 py-3 font-medium text-stone-700 bg-stone-50/50 w-1/2">
                              {spec.specification_name}
                            </td>
                            <td className="px-4 py-3 text-stone-900">
                              {spec.specification_value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pricing, Seller Info, & Direct Enquiry Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Header info card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {product.material_type && (
                  <Badge variant="default">{product.material_type}</Badge>
                )}
                {product.finish && (
                  <Badge variant="outline">{product.finish}</Badge>
                )}
                {product.colour && (
                  <Badge variant="secondary">{product.colour}</Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                {product.name}
              </h1>

              {/* Price Block */}
              <div className="mt-6 rounded-xl bg-stone-50 p-4 border border-stone-200/80">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                    {formatPrice()}
                  </span>
                  {product.price !== null && (
                    <span className="text-sm text-stone-500 font-medium">
                      / {product.unit}
                    </span>
                  )}
                </div>
                {product.minimum_order_quantity && (
                  <p className="mt-1 text-xs text-stone-500">
                    MOQ: {product.minimum_order_quantity} {product.unit} • FOB / Ex-factory
                  </p>
                )}
              </div>

              {/* Verified Seller Box */}
              <div className="mt-6 flex items-start gap-4 rounded-xl border border-stone-200 p-4 bg-stone-50/40">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-stone-200 border border-stone-200">
                  {product.seller.logo_url ? (
                    <Image
                      src={product.seller.logo_url}
                      alt={product.seller.business_name}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized={!product.seller.logo_url.includes(".supabase.co")}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-600 font-bold text-sm">
                      {product.seller.business_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/suppliers/${product.seller.slug}`}
                      className="text-sm font-bold text-stone-900 hover:text-amber-700 transition-colors"
                    >
                      {product.seller.business_name}
                    </Link>
                    {product.seller.verification_status === "verified" && <VerifiedBadge />}
                  </div>

                  <p className="mt-0.5 text-xs text-stone-500">{location}</p>

                  <div className="mt-2 flex items-center gap-3 text-xs text-stone-600">
                    {product.seller.years_in_business && (
                      <span>{product.seller.years_in_business}+ yrs experience</span>
                    )}
                    <Link
                      href={`/suppliers/${product.seller.slug}`}
                      className="font-semibold text-amber-600 hover:text-amber-700"
                    >
                      View Storefront →
                    </Link>
                  </div>
                </div>
              </div>

              {/* B2B Buyer Actions: Formal RFQ & Save Product */}
              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                    B2B Procurement Actions
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Factory-Direct Quotations
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <Link
                    href={`/request-quote?product=${encodeURIComponent(product.slug)}&supplier=${encodeURIComponent(product.seller.slug)}`}
                    className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl bg-amber-700 px-4 py-2 text-center text-sm font-semibold text-white shadow-xs transition-colors hover:bg-amber-800"
                  >
                    Request Bulk Quotation
                  </Link>
                  <FavouriteButton
                    productId={product.id}
                    initialFavourited={favouriteIds.has(product.id)}
                    variant="button"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Link
                    href={`/buyer/rfqs/new?product=${encodeURIComponent(product.slug)}`}
                    className="inline-flex min-h-[38px] flex-1 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-center text-xs font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Attach BOQ / Custom Dimensions
                  </Link>
                </div>
                <StartConversationButton
                  sellerId={product.seller.id || product.seller_id}
                  productId={product.id}
                  subject={`Product Discussion: ${product.name}`}
                  isAuthenticated={Boolean(currentUser)}
                  label={`Message ${product.seller.business_name}`}
                  variant="outline"
                  fullWidth
                />
              </div>

              {/* Direct Enquiry Form */}
              <div className="mt-8 border-t border-stone-100 pt-6">
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  Request Factory Quotation
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  Send your project requirements directly to {product.seller.business_name}.
                </p>

                <EnquiryForm
                  productId={product.id}
                  productName={product.name}
                  unit={product.unit}
                  sellerName={product.seller.business_name}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="pt-8 border-t border-stone-200">
            <SectionHeading
              title="Related Stone Slabs & Tiles"
              subtitle={`Explore similar options from our ${product.category?.name || "natural stone"} collection`}
            />
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((p) => (
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
          </div>
        )}
      </div>

      {/* JSON-LD Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Product",
                name: product.name,
                description: product.description,
                image: product.images.map((i) => i.src),
                category: product.category?.name,
                offers:
                  product.price !== null
                    ? {
                        "@type": "Offer",
                        price: product.price,
                        priceCurrency: product.currency,
                        availability: "https://schema.org/InStock",
                        seller: {
                          "@type": "Organization",
                          name: product.seller.business_name,
                        },
                      }
                    : undefined,
              },
              {
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
                    name: "Products",
                    item: "https://stonesdekho.com/products",
                  },
                  ...(product.category
                    ? [
                        {
                          "@type": "ListItem",
                          position: 3,
                          name: product.category.name,
                          item: `https://stonesdekho.com/categories/${product.category.slug}`,
                        },
                        {
                          "@type": "ListItem",
                          position: 4,
                          name: product.name,
                          item: `https://stonesdekho.com/products/${product.slug}`,
                        },
                      ]
                    : [
                        {
                          "@type": "ListItem",
                          position: 3,
                          name: product.name,
                          item: `https://stonesdekho.com/products/${product.slug}`,
                        },
                      ]),
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}

