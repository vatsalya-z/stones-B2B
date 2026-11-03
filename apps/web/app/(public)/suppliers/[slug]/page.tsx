import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumb, VerifiedBadge, Badge, SectionHeading, EmptyState } from "@stone/ui";
import { ProductCard } from "@/components/ui/product-card";
import { ContactSupplierModal } from "@/features/enquiry/contact-supplier-modal";
import { decodeSellerDescription } from "@/features/seller/seller-meta";
import { getCurrentUserFavouriteIds } from "@/features/buyer/queries";
import { getCurrentUser } from "@/lib/auth";
import { getSellerBySlug, getProductsBySellerId } from "@/lib/db";
import { getSupplierFallbackCover, getSupplierFallbackLogo } from "@/lib/images";

interface SupplierStorefrontProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: SupplierStorefrontProps): Promise<Metadata> {
  const { slug } = await params;
  const seller = await getSellerBySlug(slug);

  if (!seller) {
    return { title: "Supplier Not Found" };
  }

  return {
    title: `${seller.businessName} — Stone Factory & Exporter`,
    description:
      seller.description ||
      `Direct inventory and company profile for ${seller.businessName}. Slabs, tiles, and custom natural stone products.`,
    alternates: {
      canonical: `/suppliers/${slug}`,
    },
    openGraph: {
      title: `${seller.businessName} — Stone Factory & Exporter`,
      description: seller.description || undefined,
      url: `/suppliers/${slug}`,
      type: "website",
      images: seller.coverImageUrl ? [{ url: seller.coverImageUrl }] : [],
    },
  };
}

export default async function SupplierStorefrontPage({
  params,
}: SupplierStorefrontProps) {
  const { slug } = await params;
  const seller = await getSellerBySlug(slug);

  if (!seller) {
    notFound();
  }

  const [products, favouriteIds, currentUser] = await Promise.all([
    getProductsBySellerId(seller.id, 24),
    getCurrentUserFavouriteIds(),
    getCurrentUser(),
  ]);
  const location = [seller.city, seller.state, seller.country].filter(Boolean).join(", ");
  const coverImage = seller.coverImageUrl || getSupplierFallbackCover(seller.slug, seller.businessType);
  const logoImage = seller.logoUrl || getSupplierFallbackLogo(seller.slug);
  const decoded = decodeSellerDescription(seller.description);
  const cleanDescription = decoded.cleanDescription || seller.description;

  const materialsSupplied = Array.from(
    new Set(
      products
        .map((p) => p.materialType)
        .filter((m): m is string => Boolean(m))
    )
  ).sort();

  // Manufacturing and supply capabilities dynamically extracted from seller profile
  const capabilities: string[] = [];
  if (decoded.hasManufacturing || seller.businessType === "manufacturer") {
    capabilities.push("In-House Processing Unit");
  }
  if (decoded.hasQuarry || seller.businessType === "mine_owner") {
    capabilities.push("Direct Quarry / Mine Ownership");
  }
  if (decoded.hasExport || seller.businessType === "exporter") {
    capabilities.push("Sea-Worthy Crate Export");
  }

  // Organization structured data for SEO
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": seller.businessName,
    "description": cleanDescription || `${seller.businessName} — natural stone manufacturer and exporter`,
    ...(logoImage ? { "logo": logoImage } : {}),
    ...(seller.city ? {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": seller.city,
        "addressRegion": seller.state || undefined,
        "addressCountry": seller.country || "IN",
      }
    } : {}),
    ...(seller.verifiedAt ? { "foundingDate": seller.verifiedAt.split("T")[0] } : {}),
  };

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Organization Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      {/* Cover Image / Hero Banner */}
      <div className="relative h-72 sm:h-96 lg:h-[480px] w-full overflow-hidden bg-stone-900 shadow-inner">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={`${seller.businessName} processing facility`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
            unoptimized={!coverImage.includes(".supabase.co")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-900">
            <span className="text-xl sm:text-2xl font-semibold text-stone-600 uppercase tracking-widest">
              Stone Production Facility
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-stone-950/20 pointer-events-none" />
      </div>

      {/* Main Content Container */}
      <div className="container-wide py-6 sm:py-8 space-y-8">
        {/* Navigation Breadcrumbs */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Suppliers", href: "/suppliers" },
            { label: seller.businessName },
          ]}
        />

        {/* Profile Card Header */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              {/* Logo */}
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-stone-100 shadow-md">
                {logoImage ? (
                  <Image
                    src={logoImage}
                    alt={seller.businessName}
                    fill
                    sizes="96px"
                    className="object-cover"
                    unoptimized={!logoImage.includes(".supabase.co")}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-200 text-stone-600 font-bold text-xl">
                    {seller.businessName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                    {seller.businessName}
                  </h1>
                  {seller.verifiedAt && <VerifiedBadge label="Verified Supplier" />}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-600">
                  <Badge variant="secondary" className="capitalize">
                    {seller.businessType.replace(/_/g, " ")}
                  </Badge>
                  {location && <span>• {location}</span>}
                  {seller.yearsInBusiness && (
                    <span>• {seller.yearsInBusiness}+ years in business</span>
                  )}
                </div>

                {/* Materials Supplied Badges (P1) */}
                {materialsSupplied.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                      Materials Supplied:
                    </span>
                    {materialsSupplied.map((m) => (
                      <a
                        key={m}
                        href="#catalogue"
                        className="inline-flex items-center rounded-lg bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-800 ring-1 ring-inset ring-stone-200 transition-colors hover:bg-stone-200 hover:text-stone-900"
                        title={`View ${m} in factory catalogue`}
                      >
                        {m}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
              <ContactSupplierModal
                sellerId={seller.id}
                sellerSlug={seller.slug}
                sellerName={seller.businessName}
                materialsSupplied={materialsSupplied}
                initialUserName={currentUser?.email ? currentUser.email.split("@")[0] : null}
                initialUserEmail={currentUser?.email ?? null}
              />
              <Link
                href={`/request-quote?supplier=${encodeURIComponent(seller.slug)}`}
                className="btn-accent px-5 py-2.5 text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
              >
                Request Custom Quotation (RFQ)
              </Link>
            </div>
          </div>

          {/* Description */}
          {cleanDescription && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Factory Overview
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed max-w-3xl whitespace-pre-line">
                {cleanDescription}
              </p>
            </div>
          )}

          {/* Manufacturing & Processing Capabilities Highlights (P1) */}
          <div className="mt-6 border-t border-stone-100 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/80 p-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                ✓
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900">
                  {capabilities[0] || "Direct Quarry & Factory Sourcing"}
                </p>
                <p className="text-[11px] text-stone-500 truncate">Quarry direct lots & cut-to-size slabs</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/80 p-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                📦
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900">Fumigated Crate Packing</p>
                <p className="text-[11px] text-stone-500 truncate">Sea-worthy export wooden crates</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/80 p-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                🛡️
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900">Verified Trade Entity</p>
                <p className="text-[11px] text-stone-500 truncate">Quality inspected by StonesDekho</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Catalog */}
        <div id="catalogue" className="space-y-6">
          <SectionHeading
            title={`Factory Catalogue (${products.length})`}
            subtitle={`Live inventory lots, slabs, and stone products manufactured by ${seller.businessName}`}
          />

          {products.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
              <EmptyState
                title="No products listed by this factory yet"
                description="This supplier is in the process of adding their current gangsaw slabs and tile inventory."
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
                  isFavourited={favouriteIds.has(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: seller.businessName,
            description: seller.description,
            logo: seller.logoUrl,
            address: {
              "@type": "PostalAddress",
              addressLocality: seller.city,
              addressRegion: seller.state,
              addressCountry: seller.country,
            },
          }),
        }}
      />
    </div>
  );
}

