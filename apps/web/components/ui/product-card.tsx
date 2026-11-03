"use client";

import Link from "next/link";
import Image from "next/image";
import { cn, VerifiedBadge, Badge } from "@stone/ui";
import { getProductFallbackImage } from "@/lib/images";
import { FavouriteButton } from "@/components/buyer/favourite-button";

export interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  primaryImage: string | null;
  materialType: string | null;
  colour: string | null;
  finish: string | null;
  priceType: "fixed" | "starting" | "on_request" | "negotiable" | "range";
  price: number | null;
  currency: string;
  unit: string;
  sellerName: string;
  sellerSlug: string;
  isVerifiedSeller: boolean;
  stoneOrigin: string | null;
  isFavourited?: boolean;
  onToggleFavourite?: (productId: string) => void;
}

function PriceDisplay({
  priceType,
  price,
  currency,
  unit,
}: Pick<ProductCardProps, "priceType" | "price" | "currency" | "unit">) {
  if (priceType === "on_request" || price === null) {
    return (
      <p className="text-sm font-medium text-stone-600 italic">On Request</p>
    );
  }

  const symbol = currency === "INR" ? "₹" : currency;

  return (
    <p className="text-sm font-semibold text-stone-900">
      {priceType === "starting" && (
        <span className="mr-1 text-xs font-normal text-stone-500">From</span>
      )}
      {symbol} {price.toLocaleString("en-IN")}
      <span className="ml-1 text-xs font-normal text-stone-500">/ {unit}</span>
      {priceType === "negotiable" && (
        <span className="ml-1.5 text-[11px] font-medium text-amber-700">(Negotiable)</span>
      )}
    </p>
  );
}

export function ProductCard({
  id,
  slug,
  name,
  primaryImage,
  materialType,
  colour,
  finish,
  priceType,
  price,
  currency,
  unit,
  sellerName,
  sellerSlug,
  isVerifiedSeller,
  stoneOrigin,
  onToggleFavourite,
  isFavourited = false,
}: ProductCardProps) {
  const resolvedImage = primaryImage || getProductFallbackImage(slug, materialType);

  return (
    <article className="card-base group overflow-hidden">
      {/* Image area */}
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-stone-100">
        {resolvedImage ? (
          <Image
            src={resolvedImage}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            unoptimized={!resolvedImage.includes(".supabase.co")}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-stone-400">Natural Stone</span>
          </div>
        )}

        {/* Material type badge — top left */}
        {materialType && (
          <div className="absolute left-2.5 top-2.5">
            <Badge variant="default" className="text-[11px]">
              {materialType}
            </Badge>
          </div>
        )}

        {/* Favourite button — top right */}
        {onToggleFavourite ? (
          <button
            type="button"
            onClick={() => onToggleFavourite(id)}
            className={cn(
              "absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              isFavourited
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white/90 text-stone-500 hover:bg-white hover:text-red-500",
            )}
            aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isFavourited ? "currentColor" : "none"}
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              />
            </svg>
          </button>
        ) : (
          <FavouriteButton
            productId={id}
            initialFavourited={isFavourited}
            variant="overlay"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        {/* Product name */}
        <Link
          href={`/products/${slug}`}
          className="line-clamp-2 text-sm font-semibold text-stone-900 transition-colors hover:text-amber-700"
        >
          {name}
        </Link>

        {/* Seller */}
        <div className="flex items-center gap-1.5">
          <Link
            href={`/suppliers/${sellerSlug}`}
            className="text-xs text-stone-500 transition-colors hover:text-stone-700"
          >
            {sellerName}
          </Link>
          {isVerifiedSeller && <VerifiedBadge />}
        </div>

        {/* Details row */}
        {(colour || finish || stoneOrigin) && (
          <div className="flex flex-wrap gap-1">
            {colour && (
              <span className="badge-category">{colour}</span>
            )}
            {finish && (
              <span className="badge-category">{finish}</span>
            )}
            {stoneOrigin && (
              <span className="badge-category">{stoneOrigin}</span>
            )}
          </div>
        )}

        {/* Price & Quick Actions */}
        <div className="mt-1 border-t border-stone-100 pt-3 flex items-center justify-between gap-2">
          <PriceDisplay
            priceType={priceType}
            price={price}
            currency={currency}
            unit={unit}
          />
          <Link
            href={`/request-quote?product=${slug}&supplier=${sellerSlug}`}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-md transition-colors"
          >
            Quote
          </Link>
        </div>
      </div>
    </article>
  );
}
