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
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-stone-900 text-xs sm:text-sm font-extrabold text-[#E8BD78]">
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
    <article className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs transition-all duration-300 hover:border-amber-500/50 hover:shadow-lg hover:-translate-y-0.5">
      {/* ── 1. Top Cover Banner ─────────────────────────────────── */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-stone-900 flex-shrink-0">
        <Image
          src={resolvedCover}
          alt={`${businessName} facility`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          unoptimized={!resolvedCover.includes(".supabase.co")}
        />
        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
          <span className="inline-flex items-center rounded-md bg-stone-950/80 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#E8BD78] border border-amber-500/30 backdrop-blur-xs">
            {formattedType}
          </span>

          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[9.5px] font-bold text-white shadow-xs backdrop-blur-xs">
              <ShieldCheck className="h-3 w-3" />
              <span>Verified</span>
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Card Content Body ────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4 pt-0 space-y-3">
        {/* Logo Overlapping Cover Banner */}
        <div className="flex items-end justify-between -mt-6 relative z-10">
          <div className="relative h-12 w-12 sm:h-13 sm:w-13 flex-shrink-0 overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
            {resolvedLogo ? (
              <Image
                src={resolvedLogo}
                alt={`${businessName} logo`}
                fill
                sizes="52px"
                className="object-cover"
                unoptimized={!resolvedLogo.includes(".supabase.co")}
              />
            ) : (
              <LogoFallback name={businessName} />
            )}
          </div>

          {/* Product Count Pill */}
          {productCount !== undefined && productCount > 0 ? (
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
              <span>📦</span>
              <span>{productCount} {productCount === 1 ? "Lot" : "Lots"} Listed</span>
            </div>
          ) : (
            <span className="text-[10px] font-semibold text-stone-400">Direct Quarry Unit</span>
          )}
        </div>

        {/* Title & QA Badge */}
        <div>
          <Link
            href={`/suppliers/${slug}`}
            className="block text-sm sm:text-base font-extrabold text-stone-900 transition-colors hover:text-amber-700 line-clamp-1 tracking-tight"
            title={businessName}
          >
            {businessName}
          </Link>

          {(businessName.includes("[TEST]") || slug.includes("test")) && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-200 animate-pulse" />
              QA TEST RECORD
            </span>
          )}
        </div>

        {/* Location & Operational Experience */}
        <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 pt-0.5">
          {location && (
            <div className="flex items-center gap-1.5 min-w-0" title={location}>
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
              <span className="truncate font-medium">{location}</span>
            </div>
          )}
          {yearsInBusiness !== null && yearsInBusiness > 0 && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-stone-400" />
              <span className="truncate font-medium">{yearsInBusiness}+ yrs active</span>
            </div>
          )}
        </div>

        {/* Material Capabilities Chips */}
        {materialCapabilities && materialCapabilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {materialCapabilities.slice(0, 3).map((mat) => (
              <span
                key={mat}
                className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700 border border-stone-200/80"
              >
                {mat}
              </span>
            ))}
            {materialCapabilities.length > 3 && (
              <span className="text-[10px] font-bold text-stone-400">
                +{materialCapabilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="line-clamp-2 text-xs text-stone-600 leading-relaxed font-normal">
            {description}
          </p>
        )}
      </div>

      {/* ── 3. Touch-Friendly CTAs ─────────────────────────────── */}
      <div className="p-3.5 pt-0 mt-auto">
        <div className="pt-3 border-t border-stone-100 grid grid-cols-2 gap-2">
          <Link
            href={`/suppliers/${slug}`}
            className="flex h-10 items-center justify-center rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-800 transition-all hover:bg-stone-50 hover:border-stone-400 active:scale-98 text-center"
          >
            <span>Storefront</span>
          </Link>
          <Link
            href={`/request-quote?supplier=${encodeURIComponent(slug)}`}
            className="flex h-10 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-xs font-bold text-white shadow-xs transition-all hover:from-amber-500 hover:to-amber-600 active:scale-98 text-center"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Get Quote</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
