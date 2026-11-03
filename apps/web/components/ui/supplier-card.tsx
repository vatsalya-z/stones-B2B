import Link from "next/link";
import Image from "next/image";
import { VerifiedBadge, Badge } from "@stone/ui";
import { getSupplierFallbackLogo } from "@/lib/images";

export interface SupplierCardProps {
  id: string;
  slug: string;
  businessName: string;
  businessType: string;
  logoUrl: string | null;
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
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-stone-200 text-sm font-semibold text-stone-600">
      {initials}
    </div>
  );
}

export function SupplierCard({
  slug,
  businessName,
  businessType,
  logoUrl,
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
  const formattedType = businessType.replace(/_/g, " ");

  return (
    <article className="card-base flex h-full flex-col justify-between p-5 gap-4 transition-all duration-200 hover:border-stone-300 hover:shadow-card">
      <div className="space-y-3.5">
        {/* Header: logo + name + badges */}
        <div className="flex items-start gap-3">
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200/80 bg-stone-100 shadow-2xs">
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

          <div className="min-w-0 flex-1">
            <Link
              href={`/suppliers/${slug}`}
              className="block truncate text-sm font-bold text-stone-900 transition-colors hover:text-amber-700"
              title={businessName}
            >
              {businessName}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isVerified && <VerifiedBadge label="Verified" />}
              <Badge variant="secondary" className="text-[10px] capitalize font-medium">
                {formattedType}
              </Badge>
            </div>
          </div>
        </div>

        {/* Location & Experience */}
        <div className="flex flex-col gap-1 text-xs text-stone-500">
          {location && (
            <div className="flex items-center gap-1.5 truncate">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 flex-shrink-0 text-stone-400"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433 1.22-.756 2.943-2.052 3.667-4.208.332-.999.508-2.056.508-3.141 0-4.142-3.358-7.5-7.5-7.5S2.5 5.858 2.5 10c0 1.085.176 2.142.508 3.141.724 2.156 2.447 3.452 3.667 4.208.31.193.571.337.757.433a5.755 5.755 0 0 0 .281.14l.018.008.006.003ZM10 11.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="truncate">{location}</span>
            </div>
          )}
          {yearsInBusiness !== null && yearsInBusiness > 0 && (
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 flex-shrink-0 text-stone-400"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{yearsInBusiness}+ years operating</span>
            </div>
          )}
        </div>

        {/* Material Capabilities Chips */}
        {materialCapabilities && materialCapabilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {materialCapabilities.slice(0, 3).map((mat) => (
              <span
                key={mat}
                className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700 ring-1 ring-inset ring-stone-200"
              >
                {mat}
              </span>
            ))}
            {materialCapabilities.length > 3 && (
              <span className="text-[10px] font-semibold text-stone-400">
                +{materialCapabilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="line-clamp-2 text-xs text-stone-600 leading-relaxed">{description}</p>
        )}

        {/* Product Count Pill */}
        {productCount !== undefined && productCount > 0 && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-600 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200/70">
            <span className="text-amber-700 font-bold">📦</span>
            <span>{productCount} {productCount === 1 ? "Product" : "Products"} Listed</span>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 mt-auto">
        <Link
          href={`/suppliers/${slug}`}
          className="btn-secondary text-xs py-2 px-2.5 justify-center text-center font-semibold"
        >
          Storefront
        </Link>
        <Link
          href={`/request-quote?supplier=${encodeURIComponent(slug)}`}
          className="btn-accent text-xs py-2 px-2.5 justify-center text-center font-semibold shadow-2xs hover:shadow-xs"
        >
          Request Quote
        </Link>
      </div>
    </article>
  );
}
