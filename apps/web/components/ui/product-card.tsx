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
  thickness?: number | null;
  length?: number | null;
  width?: number | null;
  minimumOrderQuantity?: number | null;
  stockStatus?: string | null;
  leadTime?: number | null;
  isFavourited?: boolean;
  onToggleFavourite?: (productId: string) => void;
}

function formatUnit(unit: string): string {
  const map: Record<string, string> = {
    sq_ft: "sq.ft.",
    sq_m: "sq.m.",
    metric_ton: "metric ton",
    ton: "ton",
    piece: "pc",
    slab: "slab",
    box: "box",
    custom: "unit",
  };
  return map[unit] || unit;
}

function PriceDisplay({
  priceType,
  price,
  currency,
  unit,
}: Pick<ProductCardProps, "priceType" | "price" | "currency" | "unit">) {
  if (priceType === "on_request" || price === null) {
    return (
      <div className="space-y-0.5">
        <span className="text-[11px] font-medium text-stone-500 block uppercase tracking-wider">
          Wholesale Rate
        </span>
        <p className="text-sm font-bold text-stone-700 italic">Price on Request</p>
      </div>
    );
  }

  const symbol = currency === "INR" ? "₹" : currency;
  const unitLabel = formatUnit(unit);

  return (
    <div className="space-y-0.5">
      <span className="text-[11px] font-medium text-stone-500 block uppercase tracking-wider">
        Wholesale Rate
      </span>
      <p className="text-sm sm:text-base font-bold text-stone-950 font-mono tracking-tight">
        {priceType === "starting" && (
          <span className="mr-1 text-xs font-normal text-stone-500 font-sans">From</span>
        )}
        <span className="text-stone-900">{symbol} {price.toLocaleString("en-IN")}</span>
        <span className="ml-1 text-xs font-normal text-stone-500 font-sans">/ {unitLabel}</span>
        {priceType === "negotiable" && (
          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-sans">
            Negotiable
          </span>
        )}
      </p>
    </div>
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
  thickness,
  length,
  width,
  minimumOrderQuantity,
  stockStatus,
  leadTime,
  onToggleFavourite,
  isFavourited = false,
}: ProductCardProps) {
  const resolvedImage = primaryImage || getProductFallbackImage(slug, materialType);
  const formattedUnit = formatUnit(unit);

  // Technical specification line
  const hasDimensions = Boolean(length && width);
  const hasThickness = Boolean(thickness);
  const hasMoq = Boolean(minimumOrderQuantity && minimumOrderQuantity > 0);

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs transition-all duration-300 hover:border-stone-300 hover:shadow-md">
      <div>
        {/* Image Area */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
          <Link href={`/products/${slug}`} className="block h-full w-full" tabIndex={-1} aria-hidden="true">
            {resolvedImage ? (
              <Image
                src={resolvedImage}
                alt={name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                unoptimized={!resolvedImage.includes(".supabase.co")}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-stone-100">
                <span className="text-xs text-stone-400 font-medium">Natural Architectural Stone</span>
              </div>
            )}
          </Link>

          {/* Badges on Top Left */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 pointer-events-none">
            {materialType && (
              <Badge variant="default" className="text-[11px] font-semibold bg-stone-900/90 text-white backdrop-blur-xs shadow-xs">
                {materialType}
              </Badge>
            )}
            {stockStatus === "in_stock" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xs shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                In Stock
              </span>
            )}
            {stockStatus === "made_to_order" && (
              <span className="inline-flex items-center rounded-full bg-stone-800/80 px-2 py-0.5 text-[10px] font-semibold text-amber-200 backdrop-blur-xs shadow-xs">
                Cut-to-Size
              </span>
            )}
          </div>

          {/* Favourite Button on Top Right */}
          <div className="absolute right-3 top-3 z-10">
            {onToggleFavourite ? (
              <button
                type="button"
                onClick={() => onToggleFavourite(id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-colors",
                  isFavourited
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-white/90 text-stone-600 hover:bg-white hover:text-red-500",
                )}
                aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill={isFavourited ? "currentColor" : "none"}
                  strokeWidth={2}
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
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Supplier & Origin Line */}
          <div className="flex items-center justify-between text-xs text-stone-500 gap-2">
            <Link
              href={`/suppliers/${sellerSlug}`}
              className="flex items-center gap-1.5 truncate font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <span className="truncate">{sellerName}</span>
              {isVerifiedSeller && <VerifiedBadge />}
            </Link>

            {stoneOrigin && (
              <span className="shrink-0 text-[11px] text-stone-500 flex items-center gap-0.5">
                <svg className="h-3 w-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {stoneOrigin.split(",")[0]}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-stone-950 leading-snug">
            <Link
              href={`/products/${slug}`}
              className="transition-colors hover:text-amber-800 focus:outline-none focus:underline"
            >
              {name}
            </Link>
          </h3>

          {/* Material Specs Strip */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {finish && (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                {finish}
              </span>
            )}
            {colour && (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                {colour}
              </span>
            )}
            {hasThickness && (
              <span className="rounded-md bg-amber-50/80 px-2 py-0.5 text-[11px] font-medium text-amber-900 border border-amber-200/60">
                {thickness} mm
              </span>
            )}
            {hasDimensions && (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-mono text-stone-600">
                {length}×{width} mm
              </span>
            )}
          </div>

          {/* Commercial Attributes (MOQ & Lead Time) */}
          {(hasMoq || (leadTime && leadTime > 0)) && (
            <div className="flex items-center gap-3 text-[11px] text-stone-500 border-t border-stone-100 pt-2 font-medium">
              {hasMoq && (
                <span>
                  MOQ: <strong className="text-stone-800">{minimumOrderQuantity} {formattedUnit}</strong>
                </span>
              )}
              {hasMoq && leadTime ? <span className="text-stone-300">•</span> : null}
              {leadTime && leadTime > 0 ? (
                <span>
                  Lead: <strong className="text-stone-800">{leadTime} days</strong>
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Price + Actions */}
      <div className="border-t border-stone-100 bg-stone-50/60 p-4 sm:p-5 space-y-3">
        <PriceDisplay
          priceType={priceType}
          price={price}
          currency={currency}
          unit={unit}
        />

        {/* Dual Actions: View Details + Request Quote */}
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/products/${slug}`}
            className="flex-1 rounded-lg border border-stone-300 bg-white py-2 text-center text-xs font-semibold text-stone-700 shadow-2xs transition-colors hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900"
          >
            View Details
          </Link>
          <Link
            href={`/request-quote?product=${slug}&supplier=${sellerSlug}`}
            className="flex-1 rounded-lg bg-amber-700 py-2 text-center text-xs font-semibold text-white shadow-xs transition-colors hover:bg-amber-800"
          >
            Request Quote
          </Link>
        </div>
      </div>
    </article>
  );
}
