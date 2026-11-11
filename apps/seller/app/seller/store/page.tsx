import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Card, CardBody, CardHeader, EmptyState } from "@stone/ui";
import {
  formatSellerPrice,
  ModerationStatusBadge,
  VerificationStatusBadge,
} from "@/components/seller/status-badges";
import { STONE_MATERIAL_SUGGESTIONS } from "@/features/seller/seller-meta";
import {
  getAllCategoriesHierarchy,
  getSellerContext,
  getSellerProducts,
} from "@/features/seller/queries";
import { StoreSettingsForm } from "./store-settings-form";

export const metadata: Metadata = {
  title: "Store Settings",
};

export default async function SellerStorePage() {
  const [ctx, categories] = await Promise.all([
    getSellerContext(),
    getAllCategoriesHierarchy(),
  ]);

  const seller = ctx.sellerProfile;
  const categoryNames =
    categories.parents.length > 0
      ? categories.parents.map((c) => c.name)
      : [...STONE_MATERIAL_SUGGESTIONS];

  const cataloguePreview = seller
    ? await getSellerProducts(seller.id, { pageSize: 6 })
    : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Public Storefront
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Seller Store Settings
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Configure how architects, developers, and stone importers experience your public
          StonesDekho storefront.
        </p>
      </div>

      {!seller ? (
        <Card>
          <CardBody className="py-12 text-center">
            <h2 className="text-lg font-semibold text-stone-900">
              Complete Business Onboarding First
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
              Create your seller business profile before customizing storefront settings.
            </p>
            <div className="mt-6">
              <Link href="/seller/profile" className="btn-primary">
                Setup Business Profile →
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Store Visibility Information Card */}
          <Card>
            <CardHeader className="flex flex-col gap-2 border-b border-stone-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Store Visibility &amp; Marketplace Rules
                </h2>
                <p className="text-xs text-stone-500">
                  Controlled automatically by Supabase `public_seller_profiles` &amp; RLS
                </p>
              </div>
              <VerificationStatusBadge status={seller.verification_status} />
            </CardHeader>
            <CardBody className="space-y-2 text-xs text-stone-700">
              {seller.verification_status === "verified" ? (
                <p>
                  ✓ Your storefront is <strong>Live</strong> in the Supplier Directory at{" "}
                  <Link
                    href={`/suppliers/${seller.slug}`}
                    className="font-semibold text-amber-700 hover:underline"
                  >
                    /suppliers/{seller.slug}
                  </Link>
                  . All products with <strong>Published</strong> status appear in your public
                  catalogue.
                </p>
              ) : (
                <p>
                  • Your storefront URL will be{" "}
                  <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono">
                    /suppliers/{seller.slug}
                  </code>
                  . It remains hidden from anonymous visitors until your{" "}
                  <Link
                    href="/seller/verification"
                    className="font-semibold text-amber-700 hover:underline"
                  >
                    Seller Verification
                  </Link>{" "}
                  is approved by an admin.
                </p>
              )}
              <p className="text-stone-500">
                • Private compliance fields (GSTIN, street address, PIN code, personal phone,
                and email) are excluded at the database view layer and are never exposed on
                your public storefront.
              </p>
            </CardBody>
          </Card>

          <StoreSettingsForm seller={seller} categoryNames={categoryNames} />

          {/* Product Catalogue Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Storefront Catalogue Preview
                </h2>
                <p className="text-xs text-stone-500">
                  {cataloguePreview?.statusCounts.approved ?? 0} Published •{" "}
                  {cataloguePreview?.statusCounts.pending_review ?? 0} Pending Review •{" "}
                  {cataloguePreview?.statusCounts.draft ?? 0} Draft
                </p>
              </div>
              <Link
                href="/seller/products"
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                Manage All Products →
              </Link>
            </CardHeader>
            <CardBody>
              {!cataloguePreview || cataloguePreview.products.length === 0 ? (
                <EmptyState
                  title="No products in your catalogue yet"
                  description="Add stone products so buyers visiting your storefront can browse your slabs, blocks, and tiles."
                  className="py-10"
                  action={
                    <Link href="/seller/products/new" className="btn-primary !py-2 !text-xs">
                      + Add Product
                    </Link>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cataloguePreview.products.map((prod) => (
                    <div
                      key={prod.id}
                      className="overflow-hidden rounded-xl border border-stone-200 bg-white"
                    >
                      <div className="relative aspect-[4/3] w-full bg-stone-100">
                        {prod.thumbnailUrl ? (
                          <Image
                            src={prod.thumbnailUrl}
                            alt={prod.name}
                            fill
                            sizes="(max-width: 640px) 100vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-stone-400">
                            No Image
                          </div>
                        )}
                        <div className="absolute left-2.5 top-2.5">
                          <ModerationStatusBadge status={prod.moderationStatus} />
                        </div>
                      </div>
                      <div className="p-3.5">
                        <p className="truncate text-sm font-bold text-stone-900">{prod.name}</p>
                        <p className="mt-0.5 text-xs font-medium text-stone-600">
                          {formatSellerPrice(
                            prod.priceType,
                            prod.price,
                            prod.currency,
                            prod.unit,
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

