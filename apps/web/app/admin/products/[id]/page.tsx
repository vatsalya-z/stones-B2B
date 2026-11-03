import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminProductDetail } from "@/features/admin/queries";
import { ProductModerationBadge } from "@/components/admin/status-badges";
import { ProductActionsPanel } from "./product-actions-panel";

export const dynamic = "force-dynamic";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductDetailPage({ params }: ProductDetailPageProps) {
  const ctx = await getAdminContext();
  const { id } = await params;

  const data = await getAdminProductDetail(id, ctx);
  if (!data) {
    notFound();
  }

  const { product, specifications, images, auditHistory, seller, category } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Products
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{product.name}</h1>
              <ProductModerationBadge status={product.moderation_status} />
            </div>
            <p className="mt-1 text-xs text-stone-400 font-mono">
              Slug: /{product.slug} • Added {new Date(product.created_at).toLocaleDateString("en-IN")}
            </p>
          </div>

          {product.moderation_status === "approved" && (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-200 hover:text-amber-400"
            >
              <span>View on Marketplace</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Moderation Controls Panel */}
      <ProductActionsPanel productId={product.id} currentStatus={product.moderation_status} />

      {/* Rejection / Moderator note if present */}
      {product.rejection_reason && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-xs font-semibold text-red-400">Rejection Reason / Moderator Feedback:</p>
          <p className="mt-1 text-xs text-red-200 leading-relaxed">{product.rejection_reason}</p>
        </div>
      )}

      {/* Gallery & Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gallery */}
        <div className="lg:col-span-2 rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
            Product Image Gallery ({images.length} images)
          </h2>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.length === 0 ? (
              <p className="col-span-full py-8 text-center text-xs text-stone-500">
                No product images uploaded.
              </p>
            ) : (
              images.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-stone-800 bg-stone-950"
                >
                  <Image
                    src={img.storage_path}
                    alt={img.alt_text || product.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                  {img.is_primary && (
                    <span className="absolute top-2 left-2 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-black uppercase">
                      Primary
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pricing & Supplier */}
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
            <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
              Commercial Details
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-stone-500">Price per Unit</span>
                <p className="mt-0.5 text-xl font-bold font-mono text-white">
                  ₹{Number(product.price || 0).toLocaleString("en-IN")}{" "}
                  <span className="text-xs text-stone-400 font-sans">/ {product.unit}</span>
                </p>
              </div>
              <div>
                <span className="text-stone-500">Minimum Order Quantity</span>
                <p className="mt-0.5 font-medium text-stone-200">
                  {product.minimum_order_quantity || 1} {product.unit}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Category</span>
                <p className="mt-0.5 font-medium text-stone-200">{category?.name || "Uncategorized"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
            <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
              Supplier Info
            </h2>
            {seller ? (
              <div className="mt-4 space-y-2 text-xs">
                <Link
                  href={`/admin/sellers/${seller.id}`}
                  className="font-medium text-white hover:text-amber-400 text-sm block"
                >
                  {seller.business_name}
                </Link>
                <p className="text-stone-400">Owner: {seller.owner_name || "—"}</p>
                <p className="text-stone-400">
                  {seller.city ? `${seller.city}, ${seller.state || "India"}` : "India"}
                </p>
                <div className="pt-2">
                  <Link
                    href={`/admin/sellers/${seller.id}`}
                    className="text-xs text-amber-500 hover:text-amber-400"
                  >
                    View Supplier Profile →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-stone-500">Supplier information unavailable.</p>
            )}
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
          Stone Technical Specifications
        </h2>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-stone-500">Material Type</span>
            <p className="mt-0.5 font-medium text-stone-200">{product.material_type || "—"}</p>
          </div>
          <div>
            <span className="text-stone-500">Colour</span>
            <p className="mt-0.5 font-medium text-stone-200">{product.colour || "—"}</p>
          </div>
          <div>
            <span className="text-stone-500">Surface Finish</span>
            <p className="mt-0.5 font-medium text-stone-200">{product.finish || "—"}</p>
          </div>
          <div>
            <span className="text-stone-500">Origin Quarry / State</span>
            <p className="mt-0.5 font-medium text-stone-200">{product.stone_origin || "India"}</p>
          </div>

          {specifications.map((spec) => (
            <div key={spec.id}>
              <span className="text-stone-500">{spec.specification_name}</span>
              <p className="mt-0.5 font-medium text-stone-200">{spec.specification_value}</p>
            </div>
          ))}
        </div>

        {product.description && (
          <div className="mt-6 pt-4 border-t border-stone-800 text-xs">
            <span className="text-stone-500">Product Description</span>
            <p className="mt-1 leading-relaxed text-stone-300">{product.description}</p>
          </div>
        )}
      </div>

      {/* Audit History */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
          Product Moderation History
        </h2>

        <div className="mt-4 divide-y divide-stone-800 max-h-60 overflow-y-auto">
          {auditHistory.length === 0 ? (
            <p className="py-4 text-center text-xs text-stone-500">No audit events recorded.</p>
          ) : (
            auditHistory.map((item) => (
              <div key={item.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-amber-400">{item.action}</span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {new Date(item.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-stone-400 font-mono">
                  by {item.actor?.email || item.admin_user_id || "System"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
