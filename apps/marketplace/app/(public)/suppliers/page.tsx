import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SupplierCard } from "@/components/ui/supplier-card";
import { Pagination } from "@/components/ui/pagination";
import { getPublicSellers } from "@/lib/db";
import { SupplierFilterBar } from "@/components/suppliers/supplier-filter-bar";

export const metadata: Metadata = {
  title: "Verified Indian Stone Suppliers, Quarry Owners & Exporters | StonesDekho",
  description:
    "Discover verified Indian natural stone manufacturers, quarry owners, gangsaw processors, and certified exporters from Rajasthan, Gujarat, Andhra Pradesh, and Karnataka.",
  alternates: {
    canonical: "/suppliers",
  },
  openGraph: {
    title: "Verified Natural Stone Suppliers & Exporters | StonesDekho",
    description:
      "Connect with certified Indian stone processing factories and quarry owners. Direct wholesale pricing, gangsaw capacity, and export crate dispatch.",
    url: "/suppliers",
    type: "website",
  },
};

interface SuppliersPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    state?: string;
    page?: string;
  }>;
}


export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { sellers, total, totalPages } = await getPublicSellers({
    q: sp.q,
    type: sp.type,
    state: sp.state,
    page,
    pageSize: 16,
  });

  const hasActiveFilters = Boolean(sp.q?.trim() || sp.type || sp.state);

  const suppliersJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: "Verified Natural Stone Suppliers & Exporters Directory",
        description: "Certified Indian stone manufacturers, quarry owners, and export processing units.",
        url: "https://stonesdekho.com/suppliers",
        numberOfItems: sellers.length,
        itemListElement: sellers.map((s, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: s.businessName,
          url: `https://stonesdekho.com/suppliers/${s.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://stonesdekho.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Suppliers",
            item: "https://stonesdekho.com/suppliers",
          },
        ],
      },
    ],
  };


  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(suppliersJsonLd) }}
      />

      <div className="container-wide space-y-5 sm:space-y-8">
        {/* Editorial Header Section */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-8 shadow-xs text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-5 max-w-3xl mx-auto">
            <div className="space-y-2 sm:space-y-2.5 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold text-amber-800 border border-amber-200/70">
                <span className="text-amber-700">✓</span>
                <span>Verified Direct Quarry &amp; Processing Network</span>
              </div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight text-center">
                Verified Indian Stone Quarries &amp; Processors
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal text-center max-w-2xl">
                Discover certified marble, granite, sandstone, and limestone manufacturers across India.
                Connect directly with factory commercial desks and quarry owners without broker intermediaries.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 shrink-0 w-full sm:w-auto">
              <Link
                href="/request-quote"
                className="btn-accent h-10 sm:h-11 rounded-xl px-4 sm:px-6 py-2 text-center text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center"
              >
                Broadcast RFQ
              </Link>
              <Link
                href="/register/seller"
                className="btn-secondary h-10 sm:h-11 rounded-xl px-4 sm:px-6 py-2 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center"
              >
                Join as Supplier
              </Link>
            </div>
          </div>

          {/* Trust Markers Row (Sleek 3-column micro-grid on mobile, full detail on desktop) */}
          <div className="mt-4 sm:mt-6 pt-3.5 sm:pt-5 border-t border-stone-100 grid grid-cols-3 gap-1.5 sm:gap-4 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-3 p-1.5 sm:p-0 rounded-xl bg-stone-50 sm:bg-transparent">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold">
                ✓
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-stone-900 leading-tight">GSTIN &amp; Lease</p>
                <p className="hidden sm:block text-[11px] text-stone-500">
                  Government validated credentials
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-3 p-1.5 sm:p-0 rounded-xl bg-stone-50 sm:bg-transparent">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-100 text-amber-800 text-xs sm:text-sm font-bold">
                ⚡
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-stone-900 leading-tight">Factory-Direct Rates</p>
                <p className="hidden sm:block text-[11px] text-stone-500">
                  Zero intermediary broker markups
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-3 p-1.5 sm:p-0 rounded-xl bg-stone-50 sm:bg-transparent">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-100 text-blue-800 text-xs sm:text-sm font-bold">
                📑
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-stone-900 leading-tight">Commercial RFQ Desk</p>
                <p className="hidden sm:block text-[11px] text-stone-500">
                  Pro-forma &amp; lot inspection
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <SupplierFilterBar
          initialSearch={sp.q}
          initialType={sp.type}
          initialState={sp.state}
          totalResults={total}
        />

        {/* Directory Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-600 px-1">
          <div>
            {total > 0 ? (
              <p>
                Showing <strong className="text-stone-900 font-bold">{sellers.length}</strong> of{" "}
                <strong className="text-stone-900 font-bold">{total}</strong> verified natural stone
                manufacturers, quarry owners, and processors.
              </p>
            ) : hasActiveFilters ? (
              <p className="text-stone-600">
                0 verified suppliers found matching your active filter criteria.
              </p>
            ) : (
              <p className="text-stone-600">
                Indian Natural Stone Supplier &amp; Exporter Directory.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/request-quote"
              className="text-amber-700 hover:text-amber-800 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Need custom stone sourcing? Broadcast Project RFQ</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Supplier Cards Grid or Honest Data-Trust Empty State */}
        {sellers.length === 0 ? (
          hasActiveFilters ? (
            /* Empty State 1: Active filters yielded 0 results */
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-6 sm:p-12 text-center shadow-xs space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 text-2xl font-bold border border-amber-200/60">
                🔍
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                No Verified Suppliers Match Your Criteria
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                We couldn&apos;t find any verified suppliers matching your current search parameters.
                Try adjusting your search terms, clearing filters, or submit a custom project RFQ.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href="/suppliers" className="btn-secondary text-xs px-4 py-2 font-semibold">
                  Clear All Filters
                </Link>
                <Link
                  href="/request-quote"
                  className="btn-accent text-xs px-4 py-2 font-semibold shadow-xs"
                >
                  Broadcast Project RFQ
                </Link>
              </div>
            </div>
          ) : (
            /* Empty State 2: Database has 0 verified suppliers */
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-6 sm:p-12 text-center shadow-xs space-y-5">
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 text-2xl sm:text-3xl font-bold border border-amber-200/80">
                🏛️
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                  Verified Indian Stone Suppliers are Being Onboarded
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Our trade verification team is actively vetting factory credentials, quarry
                  leases, and export facilities across Rajasthan, Gujarat, Andhra Pradesh, and
                  Karnataka. Newly approved suppliers are published upon full credential inspection.
                </p>
              </div>

              <div className="rounded-xl sm:rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 sm:p-4 max-w-md mx-auto text-left space-y-1">
                <p className="text-xs font-bold text-amber-900">Immediate Sourcing Requirement?</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  You can submit your project Bill of Quantities (BOQ) directly through our platform
                  commercial desk. Our team will match your specifications with vetted offline
                  quarry owners.
                </p>
              </div>

              <div className="pt-2 sm:pt-3 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                <Link
                  href="/request-quote"
                  className="btn-accent text-xs px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider shadow-xs"
                >
                  Submit Platform-Wide RFQ
                </Link>
                <Link
                  href="/register/seller"
                  className="btn-secondary text-xs px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider"
                >
                  Apply for Verification
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sellers.map((s) => (
                <SupplierCard
                  key={s.id}
                  id={s.id}
                  slug={s.slug}
                  businessName={s.businessName}
                  businessType={s.businessType}
                  logoUrl={s.logoUrl}
                  coverImageUrl={s.coverImageUrl}
                  city={s.city}
                  state={s.state}
                  description={s.description}
                  yearsInBusiness={s.yearsInBusiness}
                  verifiedAt={s.verifiedAt}
                  productCount={s.productCount}
                  materialCapabilities={s.materialCapabilities}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-4 flex justify-center">
                <Suspense>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    baseUrl="/suppliers"
                    searchParams={sp}
                  />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {/* B2B Sourcing Program Banner */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-5 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 text-center md:text-left">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-[11px] sm:text-xs font-bold text-amber-300 border border-amber-500/30">
              Quarry Verification Program
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Are you an Indian Natural Stone Quarry Owner or Processor?
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
              Join StonesDekho to showcase your live gangsaw slab inventory directly to global
              importers, architects, and commercial contractors without broker intermediaries.
            </p>
          </div>
          <Link
            href="/register/seller"
            className="btn-accent w-full md:w-auto px-6 py-3 text-xs font-bold uppercase tracking-wider flex-shrink-0 shadow-md shadow-amber-600/30 text-center"
          >
            Apply for Factory Verification
          </Link>
        </div>
      </div>
    </div>
  );
}