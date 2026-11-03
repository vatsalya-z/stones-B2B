import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumb, Badge, VerifiedBadge, SectionHeading } from "@stone/ui";
import { ProductGallery } from "@/components/ui/product-gallery";
import { ProductCard } from "@/components/ui/product-card";
import { FavouriteButton } from "@/components/buyer/favourite-button";
import { StartConversationButton } from "@/components/messaging/start-conversation-button";
import { ProductEnquiryForm } from "@/features/rfq/product-enquiry-form";
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
    return { title: "Product Not Found | StoneB2B" };
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

  const metaTitle =
    seoTitleSpec ||
    `${product.name} — ${product.material_type || "Natural Stone"} Specifications | StoneB2B`;
  const metaDesc =
    seoDescSpec ||
    product.description ||
    `Architectural natural stone specifications for ${product.name}. Direct Indian quarry extraction, gangsaw slabs, and custom cut-to-size formats.`;

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

  // Detect whether this product is an editorial showcase entry vs. a live verified database product
  const isShowcase =
    !product.published_at ||
    product.id.startsWith("prod-") ||
    !product.seller.id ||
    product.seller.id.startsWith("seller-");

  const [relatedProducts, favouriteIds, currentUser] = await Promise.all([
    getRelatedProducts(product.category_id, product.id, 3, {
      materialType: product.material_type,
      finish: product.finish,
      stoneOrigin: product.stone_origin,
    }),
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

  const getStockStatusBadge = () => {
    if (product.stock_status === "in_stock") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          In Stock (Ready Lots)
        </span>
      );
    }
    if (product.stock_status === "made_to_order") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
          Cut-to-Size / Made to Order
        </span>
      );
    }
    return null;
  };

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-wide space-y-8">
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

        {/* Editorial Showcase Data Trust Disclaimer Banner */}
        {isShowcase && (
          <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-stone-50 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shadow-xs">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    Editorial Showcase Profile
                  </span>
                  <span className="text-xs font-semibold text-stone-700">
                    Authentic Indian Quarry Specifications
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  This natural stone listing is an architectural benchmark specimen illustrating genuine Indian geological characteristics. Displayed thickness, dimensions, and benchmark pricing (<strong className="text-stone-900">{formatPrice()}</strong>) reflect regional market averages. Commercial enquiries submitted for this profile are broadcast to our verified network of certified Indian stone fabricators and quarry processors.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-amber-950 font-medium">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Direct Quarry Concessions
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ISPM-15 Fumigated Wooden Crating
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Multi-Wire Gangsaw Tolerances
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Overview Layout: Gallery + Specs/Enquiry */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
          {/* Left Column: Gallery & Technical Specifications (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <ProductGallery
              images={galleryImages}
              productName={product.name}
            />

            {/* About this Stone Card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-4 border-b border-stone-100 pb-3">
                <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                  Geological Origin &amp; Application
                </h2>
                {product.stone_origin && (
                  <span className="inline-flex items-center gap-1 text-xs text-stone-500 font-medium">
                    <svg className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {product.stone_origin}
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base leading-relaxed text-stone-600 whitespace-pre-line">
                {product.description ||
                  "Architectural grade natural stone with distinct mineral banding and geological veining. Extracted directly from primary Indian quarry deposits and processed to international export tolerances."}
              </p>

              {/* Physical Specifications Grid */}
              <div className="mt-8 border-t border-stone-100 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">
                  Standard Dimensions &amp; Physical Properties
                </h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {product.material_type && (
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                      <dt className="text-xs text-stone-400">Material Family</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-900">
                        {product.material_type}
                      </dd>
                    </div>
                  )}

                  {product.colour && (
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                      <dt className="text-xs text-stone-400">Primary Colour</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-900">
                        {product.colour}
                      </dd>
                    </div>
                  )}

                  {product.finish && (
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                      <dt className="text-xs text-stone-400">Surface Finish</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-900">
                        {product.finish}
                      </dd>
                    </div>
                  )}

                  {product.thickness !== null && (
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                      <dt className="text-xs text-stone-400">Calibrated Thickness</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-900">
                        {product.thickness} mm Calibrated
                      </dd>
                    </div>
                  )}

                  {product.length && product.width ? (
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                      <dt className="text-xs text-stone-400">Slab Format (L × W)</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-900">
                        {product.length} × {product.width} mm
                      </dd>
                    </div>
                  ) : null}

                  {product.stone_origin && (
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                      <dt className="text-xs text-stone-400">Quarry Origin</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-900 truncate">
                        {product.stone_origin}
                      </dd>
                    </div>
                  )}

                  {product.minimum_order_quantity !== null && (
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                      <dt className="text-xs text-stone-400">Minimum Order (MOQ)</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-900">
                        {product.minimum_order_quantity} {product.unit}
                      </dd>
                    </div>
                  )}

                  {product.lead_time !== null && (
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                      <dt className="text-xs text-stone-400">Production Lead Time</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-900">
                        {product.lead_time} days
                      </dd>
                    </div>
                  )}

                  <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                    <dt className="text-xs text-stone-400">Packaging Standard</dt>
                    <dd className="mt-1 text-sm font-semibold text-stone-900">
                      ISPM-15 Fumigated Crates
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Custom Laboratory Technical Specifications */}
              {visibleSpecifications.length > 0 && (
                <div className="mt-8 border-t border-stone-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Laboratory &amp; Geotechnical Specifications
                    </h3>
                    <span className="text-[11px] text-stone-400">IS / ASTM Standard Testing</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-stone-200">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-stone-200">
                        {visibleSpecifications.map((spec) => (
                          <tr key={spec.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-stone-700 bg-stone-50/60 w-1/2">
                              {spec.specification_name}
                            </td>
                            <td className="px-4 py-3 font-medium text-stone-900">
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

          {/* Right Column: Pricing, Seller Info, & Direct RFQ Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Header Info & Pricing Card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
              {/* Material Chips & Stock Status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
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
                {getStockStatusBadge()}
              </div>

              {/* Product Heading */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight leading-tight">
                  {product.name}
                </h1>
                {product.sku && (
                  <p className="mt-1 text-xs font-mono text-stone-400">
                    Catalogue SKU: {product.sku}
                  </p>
                )}
              </div>

              {/* Price Block */}
              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/80">
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
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                  {product.minimum_order_quantity ? (
                    <span>MOQ: {product.minimum_order_quantity} {product.unit}</span>
                  ) : null}
                  <span>FOB Mundra / Ex-Factory India</span>
                </div>
                {isShowcase && (
                  <p className="mt-2 text-[11px] text-amber-800 bg-amber-100/60 rounded-md px-2 py-1">
                    * Benchmark quotation rate for calibrated gangsaw slabs.
                  </p>
                )}
              </div>

              {/* Supplier / Regional Processor Box */}
              <div className="flex items-start gap-4 rounded-xl border border-stone-200 p-4 bg-stone-50/50">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-stone-200 border border-stone-200 shadow-xs">
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
                    <div className="flex h-full w-full items-center justify-center text-stone-700 font-bold text-sm bg-stone-200">
                      {product.seller.business_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isShowcase ? (
                      <span className="text-sm font-bold text-stone-900">
                        {product.seller.business_name}
                      </span>
                    ) : (
                      <Link
                        href={`/suppliers/${product.seller.slug}`}
                        className="text-sm font-bold text-stone-900 hover:text-amber-700 transition-colors"
                      >
                        {product.seller.business_name}
                      </Link>
                    )}
                    {!isShowcase && product.seller.verification_status === "verified" && (
                      <VerifiedBadge />
                    )}
                  </div>

                  <p className="mt-0.5 text-xs text-stone-500">{location}</p>

                  <div className="mt-2 flex items-center gap-3 text-xs text-stone-600">
                    {product.seller.years_in_business && (
                      <span>{product.seller.years_in_business}+ yrs quarry experience</span>
                    )}
                    <span className="text-stone-300">•</span>
                    {isShowcase ? (
                      <span className="text-[11px] font-medium text-amber-800">
                        Showcase Quarry Profile
                      </span>
                    ) : (
                      <Link
                        href={`/suppliers/${product.seller.slug}`}
                        className="font-semibold text-amber-700 hover:text-amber-800"
                      >
                        View Storefront →
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Secondary Fast Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100">
                <Link
                  href={`/request-quote?product=${encodeURIComponent(product.slug)}&supplier=${encodeURIComponent(product.seller.slug)}&material=${encodeURIComponent(product.material_type || "")}`}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-amber-700 px-3 py-2 text-center text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-800"
                >
                  Custom Commercial RFQ
                </Link>
                <FavouriteButton
                  productId={product.id}
                  initialFavourited={favouriteIds.has(product.id)}
                  variant="button"
                />
              </div>

              {!isShowcase && (
                <StartConversationButton
                  sellerId={product.seller.id || product.seller_id}
                  productId={product.id}
                  subject={`Product Inquiry: ${product.name}`}
                  isAuthenticated={Boolean(currentUser)}
                  label={`Message ${product.seller.business_name}`}
                  variant="outline"
                  fullWidth
                />
              )}
            </div>

            {/* Embedded Direct RFQ Form */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
                  Request Factory Quotation
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Receive factory-direct commercial rates, slab bundle photos, and lead times.
                </p>
              </div>

              <ProductEnquiryForm
                productId={product.id}
                productSlug={product.slug}
                productName={product.name}
                materialType={product.material_type}
                finish={product.finish}
                thickness={product.thickness}
                length={product.length}
                width={product.width}
                unit={product.unit}
                moq={product.minimum_order_quantity}
                supplierId={product.seller.id}
                supplierSlug={product.seller.slug}
                supplierName={product.seller.business_name}
                isShowcase={isShowcase}
                currentUser={
                  currentUser
                    ? {
                        id: currentUser.id,
                        email: currentUser.email || "",
                        name: currentUser.email ? currentUser.email.split("@")[0] : null,
                      }
                    : null
                }
              />
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="pt-10 border-t border-stone-200">
            <SectionHeading
              title="Related Stone Slabs &amp; Tiles"
              subtitle={`Explore materials with similar geological composition and surface treatments`}
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
                material: product.material_type || undefined,
                // Only emit commercial Offer if this is a genuine database product with an active seller
                offers:
                  !isShowcase && product.price !== null
                    ? {
                        "@type": "Offer",
                        price: product.price,
                        priceCurrency: product.currency,
                        availability:
                          product.stock_status === "in_stock"
                            ? "https://schema.org/InStock"
                            : "https://schema.org/PreOrder",
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
