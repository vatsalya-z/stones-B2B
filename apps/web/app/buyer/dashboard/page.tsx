import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, EmptyState } from "@stone/ui";
import {
  EnquiryStatusBadge,
  formatPriceTypeShort,
  formatShortDate,
  QuotationStatusBadge,
} from "@/components/seller/status-badges";
import {
  formatCountryName,
  formatMoneyAmount,
  formatUnitLabel,
} from "@/features/buyer/buyer-meta";
import { getBuyerContext, getBuyerDashboardData } from "@/features/buyer/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function BuyerDashboardPage() {
  const ctx = await getBuyerContext();
  const data = await getBuyerDashboardData(ctx.user.id);

  const buyerDisplayName =
    ctx.profile?.full_name || ctx.user.email?.split("@")[0] || "Stone Buyer";
  const locationSummary = [
    ctx.profile?.city,
    ctx.profile?.state,
    ctx.profile?.country ? formatCountryName(ctx.profile.country) : null,
  ]
    .filter(Boolean)
    .join(", ");

  const metricCards = [
    {
      label: "Total Enquiries",
      value: data.metrics.totalEnquiries,
      hint: "All product & custom RFQs",
      href: "/buyer/enquiries",
    },
    {
      label: "Active Enquiries",
      value: data.metrics.activeEnquiries,
      hint: "Open in procurement pipeline",
      href: "/buyer/enquiries",
    },
    {
      label: "Pending Responses",
      value: data.metrics.pendingResponses,
      hint: "Awaiting supplier quote",
      href: "/buyer/enquiries?status=submitted",
    },
    {
      label: "Received Quotations",
      value: data.metrics.receivedQuotations,
      hint: "Formal commercial offers",
      href: "/buyer/quotes",
    },
    {
      label: "Accepted Quotations",
      value: data.metrics.acceptedQuotations,
      hint: "Approved supplier quotes",
      href: "/buyer/quotes?status=accepted",
    },
    {
      label: "Rejected / Closed",
      value: data.metrics.rejectedOrClosedEnquiries,
      hint: "Concluded or withdrawn",
      href: "/buyer/enquiries",
    },
  ];

  const quickActions = [
    {
      label: "Create New RFQ",
      description: "Send custom stone & BOQ requirements",
      href: "/buyer/rfqs/new",
      accent: true,
    },
    {
      label: "Browse Products",
      description: "Explore verified slabs, tiles & blocks",
      href: "/products",
      accent: false,
    },
    {
      label: "View Suppliers",
      description: "Connect with verified Indian factories",
      href: "/suppliers",
      accent: false,
    },
    {
      label: "My Enquiries",
      description: "Track sent enquiries & timelines",
      href: "/buyer/enquiries",
      accent: false,
    },
    {
      label: "Compare Quotations",
      description: "Side-by-side price & terms review",
      href: "/buyer/quotes/compare",
      accent: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* SECTION A — OVERVIEW (Welcome + Account Summary) */}
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">Buyer Procurement Workspace</Badge>
                {ctx.user.emailVerified ? (
                  <Badge variant="success">Verified Email</Badge>
                ) : (
                  <Badge variant="warning">Email Unverified</Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
                Welcome back, {buyerDisplayName}
              </h1>
              <p className="text-sm text-stone-600">
                {ctx.extendedAddress.companyName
                  ? `${ctx.extendedAddress.companyName} • `
                  : ""}
                {locationSummary || "Complete your delivery profile for faster supplier quotations."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/buyer/rfqs/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-amber-700"
              >
                + Create New RFQ
              </Link>
              <Link
                href="/buyer/profile"
                className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50"
              >
                Manage Profile
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 6 Real Supabase KPI Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {metricCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-2xl border border-stone-200 bg-white p-4 shadow-xs transition-all hover:border-amber-400/60 hover:shadow-sm"
          >
            <p className="text-xs font-medium text-stone-500 group-hover:text-stone-700">
              {card.label}
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {card.value}
            </p>
            <p className="mt-1 text-[11px] text-stone-400 truncate">{card.hint}</p>
          </Link>
        ))}
      </div>

      {/* SECTION D — QUICK ACTIONS */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-stone-900">Quick Procurement Actions</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickActions.map((act) => (
              <Link
                key={act.label}
                href={act.href}
                className={`rounded-xl border p-3.5 transition-all ${
                  act.accent
                    ? "border-amber-300 bg-amber-50/70 hover:bg-amber-50"
                    : "border-stone-200 bg-stone-50/50 hover:border-stone-300 hover:bg-white"
                }`}
              >
                <p className="text-sm font-bold text-stone-900">{act.label} →</p>
                <p className="mt-1 text-xs text-stone-500">{act.description}</p>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* SECTION B & SECTION C — RECENT ENQUIRIES & RECENT QUOTATIONS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* B. My Recent Enquiries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900">My Recent Enquiries</h2>
              <p className="text-xs text-stone-500">Latest product enquiries and custom RFQs</p>
            </div>
            <Link
              href="/buyer/enquiries"
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              View All →
            </Link>
          </CardHeader>
          <CardBody>
            {data.recentEnquiries.length === 0 ? (
              <EmptyState
                title="No enquiries submitted yet"
                description="Browse verified natural stone products or create a custom RFQ to start receiving factory quotations."
                action={
                  <Link
                    href="/buyer/rfqs/new"
                    className="inline-flex rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    Create Your First RFQ
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-stone-200">
                {data.recentEnquiries.map((enq) => {
                  const detailHref = enq.isRfq
                    ? `/buyer/rfqs/${enq.id}`
                    : `/buyer/enquiries/${enq.id}`;
                  return (
                    <div key={enq.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={detailHref}
                          className="text-sm font-bold text-stone-900 hover:text-amber-700 line-clamp-1"
                        >
                          {enq.enquiryTitle}
                        </Link>
                        <EnquiryStatusBadge status={enq.status} />
                      </div>
                      <p className="text-xs text-stone-600">
                        {enq.product ? (
                          <span>Product: {enq.product.name} • </span>
                        ) : (
                          <span>Custom RFQ • </span>
                        )}
                        Supplier: <strong>{enq.seller.businessName}</strong>
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                        <span>
                          Qty: {enq.quantity.toLocaleString("en-IN")} {formatUnitLabel(enq.unit)} •{" "}
                          {formatShortDate(enq.createdAt)}
                        </span>
                        <Link
                          href={detailHref}
                          className="font-semibold text-amber-700 hover:underline"
                        >
                          View details →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* C. Recent Quotations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900">Recent Quotations</h2>
              <p className="text-xs text-stone-500">Latest commercial offers from suppliers</p>
            </div>
            <Link
              href="/buyer/quotes"
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              All Quotes →
            </Link>
          </CardHeader>
          <CardBody>
            {data.recentQuotations.length === 0 ? (
              <EmptyState
                title="No quotations received yet"
                description="Once verified suppliers respond to your enquiries with formal pricing, their quotations appear here."
                action={
                  <Link
                    href="/products"
                    className="inline-flex rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Browse Stone Catalogue
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-stone-200">
                {data.recentQuotations.map((q) => (
                  <div key={q.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/buyer/quotes/${q.id}`}
                          className="text-sm font-bold text-stone-900 hover:text-amber-700"
                        >
                          {q.quoteNumber}
                        </Link>
                        <QuotationStatusBadge status={q.status} />
                      </div>
                      <span className="text-sm font-extrabold text-stone-900">
                        {formatMoneyAmount(q.totalAmount, q.currency)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 line-clamp-1">
                      Supplier: <strong>{q.seller.businessName}</strong> • {q.enquiryTitle}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                      <span>
                        Validity:{" "}
                        {q.validUntil ? formatShortDate(q.validUntil) : "As per terms"} (
                        {q.currency})
                      </span>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/buyer/quotes/compare?enquiry=${q.enquiryId}`}
                          className="font-medium text-stone-600 hover:text-stone-900 hover:underline"
                        >
                          Compare
                        </Link>
                        <Link
                          href={`/buyer/quotes/${q.id}`}
                          className="font-semibold text-amber-700 hover:underline"
                        >
                          View Quote →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* SECTION E — SAVED PRODUCTS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-stone-900">Saved Products</h2>
                <p className="text-xs text-stone-500">Shortlisted natural stone slabs &amp; tiles</p>
              </div>
              <Link
                href="/buyer/favourites"
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                View All Saved →
              </Link>
            </CardHeader>
            <CardBody>
              {data.savedProducts.length === 0 ? (
                <EmptyState
                  title="No saved stone products"
                  description="Click the heart icon on any marketplace product to shortlist materials for upcoming projects."
                  action={
                    <Link
                      href="/products"
                      className="inline-flex rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                    >
                      Explore Stone Slabs
                    </Link>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {data.savedProducts.map((item) => (
                    <div
                      key={item.favouriteId}
                      className="flex items-center gap-3 rounded-xl border border-stone-200 p-3"
                    >
                      {item.product?.primaryImage ? (
                        <div className="relative h-14 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                          <Image
                            src={item.product.primaryImage}
                            alt={item.product.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized={!item.product.primaryImage.includes(".supabase.co")}
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] text-stone-400">
                          Archived
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {item.isAvailable && item.product ? (
                          <>
                            <Link
                              href={`/products/${item.product.slug}`}
                              className="block truncate text-xs font-bold text-stone-900 hover:text-amber-700"
                            >
                              {item.product.name}
                            </Link>
                            <p className="mt-0.5 text-[11px] text-stone-500">
                              {formatPriceTypeShort(item.product.priceType)}
                            </p>
                            <Link
                              href={`/products/${item.product.slug}`}
                              className="mt-1 inline-block text-[11px] font-semibold text-amber-700 hover:underline"
                            >
                              View product →
                            </Link>
                          </>
                        ) : (
                          <>
                            <p className="truncate text-xs font-semibold text-stone-500">
                              Product Currently Unavailable
                            </p>
                            <Link
                              href="/buyer/favourites"
                              className="mt-1 inline-block text-[11px] font-medium text-stone-600 underline"
                            >
                              Manage in Favourites
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recent Activity Feed */}
        <div className="xl:col-span-5">
          <Card className="h-full">
            <CardHeader>
              <h2 className="text-base font-bold text-stone-900">Recent Activity</h2>
              <p className="text-xs text-stone-500">Live updates from your procurement records</p>
            </CardHeader>
            <CardBody>
              {data.recentActivity.length === 0 ? (
                <p className="text-xs text-stone-500 py-4">
                  Your enquiry and quotation activity timeline will appear here as you source stone
                  products.
                </p>
              ) : (
                <ol className="space-y-3.5">
                  {data.recentActivity.map((act) => (
                    <li
                      key={act.id}
                      className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={act.href}
                          className="block truncate text-xs font-bold text-stone-900 hover:text-amber-700"
                        >
                          {act.title}
                        </Link>
                        <p className="mt-0.5 truncate text-[11px] text-stone-500">
                          {act.subtitle}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-[11px] text-stone-400">
                        {formatShortDate(act.timestamp)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

