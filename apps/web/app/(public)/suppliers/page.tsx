import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SectionHeading, Breadcrumb, EmptyState } from "@stone/ui";
import { SupplierCard } from "@/components/ui/supplier-card";
import { Pagination } from "@/components/ui/pagination";
import { getPublicSellers } from "@/lib/db";

export const metadata: Metadata = {
  title: "Verified Indian Stone Suppliers, Quarry Owners & Exporters",
  description:
    "Directory of verified Indian natural stone manufacturers, quarry owners, gangsaw processors, and certified exporters from Rajasthan, Gujarat, Andhra Pradesh, and Karnataka.",
  alternates: {
    canonical: "/suppliers",
  },
  openGraph: {
    title: "Verified Natural Stone Suppliers & Exporters | StonesDekho B2B",
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

const BUSINESS_TYPES = [
  { value: "", label: "All Business Types" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "exporter", label: "Exporter" },
  { value: "quarry_owner", label: "Quarry Owner" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "processor", label: "Stone Processor" },
];

const MAJOR_STATES = [
  { value: "", label: "All States & Quarry Hubs" },
  { value: "Rajasthan", label: "Rajasthan (Makrana, Jodhpur, Kota)" },
  { value: "Gujarat", label: "Gujarat (Ambaji, Morbi)" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh (Ongole / Black Galaxy)" },
  { value: "Karnataka", label: "Karnataka (Bangalore, Ilkal)" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Telangana", label: "Telangana" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh (Gwalior)" },
  { value: "Maharashtra", label: "Maharashtra" },
];

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
      <div className="container-wide space-y-8">
        <div>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Suppliers" },
            ]}
          />
          <SectionHeading
            className="mt-4"
            title="Verified Stone Suppliers & Exporters"
            subtitle={
              total > 0
                ? `Showing ${sellers.length} of ${total} verified natural stone manufacturers, quarry owners, and processing factories.`
                : "Directory of certified Indian manufacturers and exporters."
            }
            action={
              <Link href="/register/seller" className="btn-accent text-sm shadow-sm">
                Register as Supplier
              </Link>
            }
          />
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <form method="GET" action="/suppliers" className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <input
                type="search"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Search by factory name, city, stone specialty..."
                className="input-base w-full"
                aria-label="Search suppliers"
              />
            </div>
            <div className="sm:col-span-3">
              <select
                name="type"
                defaultValue={sp.type ?? ""}
                className="input-base w-full"
                aria-label="Filter by business type"
              >
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4 flex gap-2">
              <select
                name="state"
                defaultValue={sp.state ?? ""}
                className="input-base flex-1"
                aria-label="Filter by state"
              >
                {MAJOR_STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn-primary text-xs font-semibold px-4"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Supplier Cards Grid */}
        {sellers.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-card">
            <EmptyState
              title="No suppliers match your criteria"
              description="Try clearing your search terms or expanding your state and business type filter."
              action={
                <Link href="/suppliers" className="btn-secondary text-sm">
                  View All Suppliers
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {sellers.map((s) => (
                <SupplierCard
                  key={s.id}
                  id={s.id}
                  slug={s.slug}
                  businessName={s.businessName}
                  businessType={s.businessType}
                  logoUrl={s.logoUrl}
                  city={s.city}
                  state={s.state}
                  description={s.description}
                  yearsInBusiness={s.yearsInBusiness}
                  verifiedAt={s.verifiedAt}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="pt-4">
              <Suspense>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  baseUrl="/suppliers"
                  searchParams={sp}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* B2B Sourcing Banner */}
        <div className="rounded-2xl border border-stone-200 bg-gradient-to-r from-stone-900 to-stone-800 p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
              Quarry Verification Program
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Are you an Indian Natural Stone Quarry Owner or Processor?
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Join StonesDekho to showcase your live slab inventory directly to global importers, architects, and commercial contractors without broker intermediaries.
            </p>
          </div>
          <Link
            href="/register/seller"
            className="btn-accent px-6 py-3 text-sm font-semibold flex-shrink-0 shadow-md shadow-amber-600/30"
          >
            Apply for Factory Verification
          </Link>
        </div>
      </div>
    </div>
  );
}
