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

function CommercialCtaLabel() {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] sm:text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
        Direct Quarry Quote
      </span>
      <span className="text-[11px] sm:text-xs font-medium text-stone-600">
        Custom Cut &amp; Bulk Lots
      </span>
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
  priceType: _priceType,
  price: _price,
  currency: _currency,
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
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3 flex flex-wrap gap-1 sm:gap-1.5 pointer-events-none">
            {(name.includes("[TEST]") || slug.startsWith("test-")) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                QA TEST
              </span>
            )}
            {materialType && (
              <Badge variant="default" className="text-[10px] sm:text-[11px] font-semibold bg-stone-900/90 text-white backdrop-blur-xs shadow-xs px-1.5 sm:px-2 py-0.5">
                {materialType}
              </Badge>
            )}
            {stockStatus === "in_stock" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700/90 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xs shadow-xs">
                <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-300" />
                <span className="hidden sm:inline">In Stock</span>
                <span className="sm:hidden">Stock</span>
              </span>
            )}
            {stockStatus === "made_to_order" && (
              <span className="inline-flex items-center rounded-full bg-stone-800/80 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-200 backdrop-blur-xs shadow-xs">
                Custom
              </span>
            )}
          </div>

          {/* Favourite Button on Top Right */}
          <div className="absolute right-2 top-2 sm:right-3 sm:top-3 z-10">
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
        <div className="p-2.5 sm:p-5 space-y-2 sm:space-y-3">
          {/* Supplier & Origin Line */}
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-stone-500 gap-1.5">
            <Link
              href={`/suppliers/${sellerSlug}`}
              className="flex items-center gap-1 truncate font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <span className="truncate">{sellerName}</span>
              {isVerifiedSeller && <VerifiedBadge />}
            </Link>

            {stoneOrigin && (
              <span className="shrink-0 text-[10px] sm:text-[11px] text-stone-500 flex items-center gap-0.5">
                <svg className="h-3 w-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate max-w-[65px] sm:max-w-none">{stoneOrigin.split(",")[0]}</span>
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3 className="line-clamp-2 text-xs sm:text-base font-bold text-stone-950 leading-snug">
            <Link
              href={`/products/${slug}`}
              className="transition-colors hover:text-amber-800 focus:outline-none focus:underline"
            >
              {name}
            </Link>
          </h3>

          {/* Material Specs Strip */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5">
            {finish && (
              <span className="rounded-md bg-stone-100 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-stone-700">
                {finish}
              </span>
            )}
            {colour && (
              <span className="rounded-md bg-stone-100 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-stone-700">
                {colour}
              </span>
            )}
            {hasThickness && (
              <span className="rounded-md bg-amber-50/80 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-amber-900 border border-amber-200/60">
                {thickness} mm
              </span>
            )}
            {hasDimensions && (
              <span className="rounded-md bg-stone-100 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-mono text-stone-600">
                {length}×{width} mm
              </span>
            )}
          </div>

          {/* Commercial Attributes (MOQ & Lead Time) */}
          {(hasMoq || (leadTime && leadTime > 0)) && (
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-stone-500 border-t border-stone-100 pt-1.5 sm:pt-2 font-medium">
              {hasMoq && (
                <span className="truncate">
                  MOQ: <strong className="text-stone-800">{minimumOrderQuantity} {formattedUnit}</strong>
                </span>
              )}
              {hasMoq && leadTime ? <span className="text-stone-300">•</span> : null}
              {leadTime && leadTime > 0 ? (
                <span className="shrink-0">
                  <strong className="text-stone-800">{leadTime}d</strong>
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Commercial Quote CTA + Actions */}
      <div className="border-t border-stone-100 bg-stone-50/60 p-2.5 sm:p-5 space-y-2 sm:space-y-3">
        <CommercialCtaLabel />

        {/* Dual Actions: View Details + Request Quote */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-1">
          <Link
            href={`/products/${slug}`}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-3 py-2 sm:py-2.5 text-xs font-semibold text-stone-700 shadow-2xs transition-all duration-150 hover:border-stone-300 hover:bg-stone-100/80 hover:text-stone-900 active:scale-[0.98]"
          >
            <svg className="h-3.5 w-3.5 text-stone-500 shrink-0 hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="sm:hidden">Details</span>
            <span className="hidden sm:inline">View Details</span>
          </Link>
          <Link
            href={`/request-quote?product=${slug}&supplier=${sellerSlug}`}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-b from-amber-600 to-amber-700 px-3 py-2 sm:py-2.5 text-xs font-semibold text-white shadow-sm shadow-amber-900/15 transition-all duration-150 hover:from-amber-700 hover:to-amber-800 hover:shadow active:scale-[0.98]"
          >
            <svg className="h-3.5 w-3.5 text-amber-100 shrink-0 hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
            <span className="sm:hidden">Quote</span>
            <span className="hidden sm:inline">Request Quote</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
