import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge, Card, CardBody, EmptyState, SectionHeading, VerifiedBadge } from "@stone/ui";
import {
  formatSellerPrice,
  formatShortDate,
} from "@/components/seller/status-badges";
import { getBuyerContext, getBuyerFavourites } from "@/features/buyer/queries";
import { RemoveFavouriteButton } from "./remove-favourite-button";

export const metadata: Metadata = {
  title: "Saved Products",
};

export default async function BuyerFavouritesPage() {
  const ctx = await getBuyerContext();
  const favourites = await getBuyerFavourites(ctx.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeading
          title={`Saved Stone Products (${favourites.length})`}
          subtitle="Shortlisted natural stone slabs, tiles, and architectural materials for your upcoming projects."
        />

        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 self-start sm:self-auto"
        >
          Browse Stone Catalogue ↗
        </Link>
      </div>

      {favourites.length === 0 ? (
        <Card>
          <CardBody className="p-10">
            <EmptyState
              title="Your saved products shortlist is empty"
              description="Explore verified marble, granite, sandstone, and quartzite listings and click the heart icon to save materials."
              action={
                <Link
                  href="/products"
                  className="inline-flex rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                >
                  Explore Marketplace Products
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favourites.map((item) => {
            if (!item.isAvailable || !item.product) {
              return (
                <Card key={item.favouriteId} className="overflow-hidden border-dashed">
                  <div className="flex aspect-[3/2] w-full items-center justify-center bg-stone-100 px-6 text-center">
                    <div className="space-y-1">
                      <Badge variant="outline">Archived / Unpublished</Badge>
                      <p className="text-xs text-stone-500">
                        This product is no longer publicly listed by the supplier.
                      </p>
                    </div>
                  </div>
                  <CardBody className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-700">
                        Unavailable Stone Listing
                      </p>
                      <p className="text-[11px] text-stone-400">
                        Saved on {formatShortDate(item.savedAt)}
                      </p>
                    </div>
                    <RemoveFavouriteButton productId={item.productId} />
                  </CardBody>
                </Card>
              );
            }

            const p = item.product;
            const seller = item.seller;

            return (
              <Card key={item.favouriteId} className="overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[3/2] w-full overflow-hidden bg-stone-100">
                    {p.primaryImage ? (
                      <Image
                        src={p.primaryImage}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        unoptimized={!p.primaryImage.includes(".supabase.co")}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-stone-400">
                        Natural Stone
                      </div>
                    )}
                    <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
                      {p.materialType && <Badge variant="default">{p.materialType}</Badge>}
                      {p.categoryName && <Badge variant="secondary">{p.categoryName}</Badge>}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <Link
                      href={`/products/${p.slug}`}
                      className="line-clamp-2 text-base font-bold text-stone-900 hover:text-amber-700"
                    >
                      {p.name}
                    </Link>

                    {seller && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-600">
                        {seller.slug ? (
                          <Link
                            href={`/suppliers/${seller.slug}`}
                            className="font-medium hover:text-stone-900"
                          >
                            {seller.businessName}
                          </Link>
                        ) : (
                          <span>{seller.businessName}</span>
                        )}
                        {seller.isVerified && <VerifiedBadge />}
                      </div>
                    )}

                    <p className="text-sm font-bold text-stone-900 pt-1">
                      {formatSellerPrice(p.priceType, p.price, p.currency, p.unit)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-stone-100 px-4 py-3 flex items-center justify-between gap-2 bg-stone-50/50">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/products/${p.slug}`}
                      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
                    >
                      View Product
                    </Link>
                    <Link
                      href={`/buyer/rfqs/new?product=${encodeURIComponent(p.slug)}`}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Request RFQ
                    </Link>
                  </div>
                  <RemoveFavouriteButton productId={p.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

