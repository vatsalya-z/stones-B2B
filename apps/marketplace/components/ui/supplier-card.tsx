import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, ShieldCheck, FileText } from "lucide-react";
import { getSupplierFallbackLogo, getSupplierFallbackCover } from "@/lib/images";

export interface SupplierCardProps {
  id: string;
  slug: string;
  businessName: string;
  businessType: string;
  logoUrl: string | null;
  coverImageUrl?: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  yearsInBusiness: number | null;
  verifiedAt: string | null;
  productCount?: number;
  materialCapabilities?: string[];
}

function LogoFallback({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg sm:rounded-xl bg-stone-900 text-[10px] sm:text-xs font-extrabold text-[#E8BD78]">
      {initials}
    </div>
  );
}

export function SupplierCard({
  slug,
  businessName,
  businessType,
  logoUrl,
  coverImageUrl,
  city,
  state,
  description,
  yearsInBusiness,
  verifiedAt,
  productCount,
  materialCapabilities,
}: SupplierCardProps) {
  const location = [city, state].filter(Boolean).join(", ");
  const isVerified = Boolean(verifiedAt);
  const resolvedLogo = logoUrl || getSupplierFallbackLogo(slug);
  const resolvedCover = coverImageUrl || getSupplierFallbackCover(slug, businessType);
  const formattedType = businessType.replace(/_/g, " ");

  return (
    <article className="group flex h-full flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-stone-200/90 bg-white shadow-2xs transition-all duration-300 hover:border-amber-500/50 hover:shadow-md hover:-translate-y-0.5">
      {/* ── 1. Top Cover Banner ─────────────────────────────────── */}
      <div className="relative h-20 sm:h-32 w-full overflow-hidden bg-stone-900 flex-shrink-0">
        <Image
          src={resolvedCover}
          alt={`${businessName} facility`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          unoptimized={!resolvedCover.includes(".supabase.co")}
        />
        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-1.5 sm:top-2.5 inset-x-1.5 sm:inset-x-2.5 flex items-center justify-between z-10">
          <span className="inline-flex items-center rounded sm:rounded-md bg-stone-950/80 px-1.5 py-0.5 text-[8px] sm:text-[9.5px] font-bold uppercase tracking-wider text-[#E8BD78] border border-amber-500/30 backdrop-blur-xs truncate max-w-[65%]">
            {formattedType}
          </span>

          {isVerified && (
            <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[8px] sm:text-[9.5px] font-bold text-white shadow-xs backdrop-blur-xs">
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden sm:inline">Verified</span>
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Card Content Body ────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-4 pt-0 space-y-1.5 sm:space-y-3">
        {/* Logo Overlapping Cover Banner */}
        <div className="flex items-end justify-between -mt-4.5 sm:-mt-6 relative z-10">
          <div className="relative h-9 w-9 sm:h-12 sm:w-12 flex-shrink-0 overflow-hidden rounded-lg sm:rounded-xl border sm:border-2 border-white bg-white shadow-sm">
            {resolvedLogo ? (
              <Image
                src={resolvedLogo}
                alt={`${businessName} logo`}
                fill
                sizes="48px"
                className="object-cover"
                unoptimized={!resolvedLogo.includes(".supabase.co")}
              />
            ) : (
              <LogoFallback name={businessName} />
            )}
          </div>

          {/* Product Count Pill */}
          {productCount !== undefined && productCount > 0 ? (
            <div className="inline-flex items-center gap-1 text-[9.5px] sm:text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg shadow-2xs">
              <span>📦</span>
              <span>{productCount} {productCount === 1 ? "Lot" : "Lots"}</span>
            </div>
          ) : (
            <span className="text-[9px] sm:text-[10px] font-semibold text-stone-400">Direct Unit</span>
          )}
        </div>

        {/* Title */}
        <div>
          <Link
            href={`/suppliers/${slug}`}
            className="block text-xs sm:text-base font-extrabold text-stone-900 transition-colors hover:text-amber-700 line-clamp-1 tracking-tight"
            title={businessName}
          >
            {businessName}
          </Link>
        </div>

        {/* Location & Experience */}
        <div className="flex flex-col gap-0.5 sm:grid sm:grid-cols-2 sm:gap-2 text-[10px] sm:text-xs text-stone-500 pt-0.5">
          {location && (
            <div className="flex items-center gap-1 min-w-0" title={location}>
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-amber-600" />
              <span className="truncate font-medium">{location}</span>
            </div>
          )}
          {yearsInBusiness !== null && yearsInBusiness > 0 && (
            <div className="flex items-center gap-1 min-w-0">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-stone-400" />
              <span className="truncate font-medium">{yearsInBusiness}+ yrs</span>
            </div>
          )}
        </div>

        {/* Material Capabilities Chips */}
        {materialCapabilities && materialCapabilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {materialCapabilities.slice(0, 2).map((mat) => (
              <span
                key={mat}
                className="inline-flex items-center rounded bg-stone-100 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-semibold text-stone-700 border border-stone-200"
              >
                {mat}
              </span>
            ))}
            {materialCapabilities.length > 2 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-stone-400">
                +{materialCapabilities.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Description (Visible on tablet/desktop) */}
        {description && (
          <p className="hidden sm:block line-clamp-2 text-xs text-stone-600 leading-relaxed font-normal">
            {description}
          </p>
        )}
      </div>

      {/* ── 3. Touch-Friendly CTAs ─────────────────────────────── */}
      <div className="p-2 sm:p-3.5 pt-0 mt-auto">
        <div className="pt-2 sm:pt-3 border-t border-stone-100 flex flex-col sm:grid sm:grid-cols-2 gap-1.5 sm:gap-2">
          <Link
            href={`/suppliers/${slug}`}
            className="hidden sm:flex h-9 sm:h-10 items-center justify-center rounded-lg sm:rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-800 transition-all hover:bg-stone-50 hover:border-stone-400 active:scale-98 text-center"
          >
            <span>Storefront</span>
          </Link>
          <Link
            href={`/request-quote?supplier=${encodeURIComponent(slug)}`}
            className="flex h-7.5 sm:h-10 w-full items-center justify-center gap-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-[10.5px] sm:text-xs font-bold text-white shadow-xs transition-all hover:from-amber-500 hover:to-amber-600 active:scale-98 text-center"
          >
            <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Get Quote</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
