import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumb, SectionHeading, VerifiedBadge } from "@stone/ui";
import { ProductEnquiryForm } from "@/features/rfq/product-enquiry-form";
import { getProductBySlug } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface EnquiryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: EnquiryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found | StoneB2B" };
  }

  return {
    title: `Request Quote: ${product.name} — ${product.seller.business_name} | StoneB2B`,
    description: `Request an architectural natural stone quotation for ${product.name}. Direct Indian factory rates and specifications.`,
  };
}

export default async function ProductEnquiryPage({ params }: EnquiryPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  const isShowcase =
    !product.published_at ||
    product.id.startsWith("prod-") ||
    !product.seller.id ||
    product.seller.id.startsWith("seller-");

  const primaryImage = product.images.find((i) => i.is_primary)?.src || product.images[0]?.src;

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-narrow space-y-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Products", href: "/products" },
            { label: product.name, href: `/products/${product.slug}` },
            { label: "Request Quotation" },
          ]}
        />

        <SectionHeading
          title={`Request Quotation for ${product.name}`}
          subtitle={
            isShowcase
              ? "Architectural quarry benchmark. Enquiries are broadcast to certified stone processors."
              : `Direct communication with verified manufacturer ${product.seller.business_name}.`
          }
        />

        {/* Product Snapshot Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          {primaryImage ? (
            <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200">
              <Image
                src={primaryImage}
                alt={product.name}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized={!primaryImage.includes(".supabase.co")}
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <Link
              href={`/products/${product.slug}`}
              className="text-base font-bold text-stone-900 hover:text-amber-700 transition-colors truncate block"
            >
              {product.name}
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-stone-500">
                {isShowcase ? "Showcase Profile: " : "Supplier: "}
                {product.seller.business_name}
              </span>
              {!isShowcase && product.seller.verification_status === "verified" && <VerifiedBadge />}
            </div>
            {product.price !== null && (
              <p className="mt-1 text-xs font-semibold text-stone-900">
                ₹{product.price.toLocaleString("en-IN")} / {product.unit}
                {isShowcase && <span className="text-stone-400 font-normal ml-1">(Benchmark)</span>}
              </p>
            )}
          </div>
        </div>

        {/* Dedicated RFQ / Quotation Form */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
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
  );
}
