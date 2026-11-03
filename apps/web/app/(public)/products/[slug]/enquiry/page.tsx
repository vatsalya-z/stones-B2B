import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumb, SectionHeading, VerifiedBadge } from "@stone/ui";
import { EnquiryForm } from "@/features/enquiry/enquiry-form";
import { getProductBySlug } from "@/lib/db";

interface EnquiryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: EnquiryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  return {
    title: `Request Quote: ${product.name} — ${product.seller.business_name}`,
    description: `Send an enquiry for ${product.name} directly to verified manufacturer ${product.seller.business_name}.`,
  };
}

export default async function ProductEnquiryPage({ params }: EnquiryPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const primaryImage = product.images.find((i) => i.is_primary)?.src || product.images[0]?.src;

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-narrow space-y-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Products", href: "/products" },
            { label: product.name, href: `/products/${product.slug}` },
            { label: "Send Enquiry" },
          ]}
        />

        <SectionHeading
          title={`Request Quotation for ${product.name}`}
          subtitle={`Direct communication with verified supplier ${product.seller.business_name}.`}
        />

        {/* Product Snapshot Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
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
              <span className="text-xs text-stone-500">Supplier: {product.seller.business_name}</span>
              {product.seller.verification_status === "verified" && <VerifiedBadge />}
            </div>
            {product.price !== null && (
              <p className="mt-1 text-xs font-semibold text-stone-900">
                ₹{product.price.toLocaleString("en-IN")} / {product.unit}
              </p>
            )}
          </div>
        </div>

        {/* Enquiry Form */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
          <EnquiryForm
            productId={product.id}
            productName={product.name}
            unit={product.unit}
            sellerName={product.seller.business_name}
          />
        </div>
      </div>
    </div>
  );
}

