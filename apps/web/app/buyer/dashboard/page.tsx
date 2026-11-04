import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, EmptyState } from "@stone/ui";
import {
  EnquiryStatusBadge,
  formatPriceTypeShort,
  formatShortDate,
  OrderStatusBadge,
  PaymentStatusBadge,
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

  // 1. Pending Actions computation
  const pendingActions: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    actionLabel: string;
    severity: "warning" | "info";
  }> = [];

  const unreviewedQuotesCount = Math.max(
    0,
    data.metrics.receivedQuotations - data.metrics.acceptedQuotations,
  );
  if (unreviewedQuotesCount > 0) {
    pendingActions.push({
      id: "pending-quotes",
      title: `${unreviewedQuotesCount} Supplier Quotation${unreviewedQuotesCount > 1 ? "s" : ""} Pending Review`,
      description: "Review formal commercial offers, freight estimates, and validity terms before quotes expire.",
      href: "/buyer/quotes",
      actionLabel: "Review Quotes",
      severity: "warning",
    });
  }

  if (!ctx.extendedAddress.companyName || !ctx.profile?.phone) {
    pendingActions.push({
      id: "profile-incomplete",
      title: "Complete Company & Contact Profile",
      description: "Add your firm name, GSTIN, and direct phone number to accelerate verification from stone processors.",
      href: "/buyer/profile",
      actionLabel: "Complete Profile",
      severity: "info",
    });
  }

  if (!ctx.extendedAddress.cleanAddress && !ctx.profile?.address) {
    pendingActions.push({
      id: "address-missing",
      title: "Set Default Delivery / Project Site Address",
      description: "Save your delivery destination so factories can calculate freight rates accurately in their quotations.",
      href: "/buyer/addresses",
      actionLabel: "Add Address",
      severity: "info",
    });
  }

  const pendingPaymentOrders = (data.recentOrders ?? []).filter(
    (o) => o.status === "pending_payment",
  );
  if (pendingPaymentOrders.length > 0) {
    pendingActions.push({
      id: "pending-payment-orders",
      title: `${pendingPaymentOrders.length} Order${pendingPaymentOrders.length > 1 ? "s" : ""} Pending Payment Settlement`,
      description: "Platform payment integration is pending. Commercial settlement confirmation will activate upon authorized provider onboarding.",
      href: "/buyer/orders",
      actionLabel: "View Orders",
      severity: "warning",
    });
  }

  // 2. Summary Cards (Mandatory 4 Core KPIs + Secondary Row)
  const coreKpiCards = [
    {
      label: "Total RFQs",
      value: data.metrics.totalRfqs,
      hint: "Custom stone & BOQ requests",
      href: "/buyer/rfqs",
      accent: "text-amber-700",
    },
    {
      label: "Active RFQs",
      value: data.metrics.activeRfqs,
      hint: "Open in supplier pipeline",
      href: "/buyer/rfqs?status=submitted",
      accent: "text-blue-700",
    },
    {
      label: "Received Quotations",
      value: data.metrics.receivedQuotations,
      hint: "Formal commercial offers",
      href: "/buyer/quotes",
      accent: "text-emerald-700",
    },
    {
      label: "Active Orders",
      value: data.metrics.activeOrders,
      hint: "Processing & in transit",
      href: "/buyer/orders",
      accent: "text-stone-900",
    },
  ];

  const secondaryKpiCards = [
    {
      label: "Total Enquiries",
      value: data.metrics.totalEnquiries,
      hint: "Product leads & inquiries",
      href: "/buyer/enquiries",
    },
    {
      label: "Awaiting Supplier Quote",
      value: data.metrics.pendingResponses,
      hint: "Submitted to factories",
      href: "/buyer/enquiries?status=submitted",
    },
    {
      label: "Accepted Quotations",
      value: data.metrics.acceptedQuotations,
      hint: "Approved commercial offers",
      href: "/buyer/quotes?status=accepted",
    },
    {
      label: "Closed / Concluded",
      value: data.metrics.rejectedOrClosedEnquiries,
      hint: "Completed or withdrawn",
      href: "/buyer/enquiries",
    },
  ];

  const quickActions = [
    {
      label: "Create RFQ",
      description: "Send technical stone dimensions & BOQ",
      href: "/buyer/rfqs/new",
      accent: true,
    },
    {
      label: "Browse Catalogue",
      description: "Explore verified slabs, tiles & blocks",
      href: "/products",
      accent: false,
    },
    {
      label: "Supplier Directory",
      description: "Connect with verified Indian stone processors",
      href: "/suppliers",
      accent: false,
    },
    {
      label: "My Orders",
      description: "Track pro-forma invoices & transit dispatch",
      href: "/buyer/orders",
      accent: false,
    },
    {
      label: "Delivery Addresses",
      description: "Manage project sites & billing records",
      href: "/buyer/addresses",
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
              <Link
                href="/buyer/addresses"
                className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50"
              >
                Delivery Addresses
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* SECTION B — PENDING ACTIONS (Actionable Procurement Tasks) */}
      {pendingActions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Action Required ({pendingActions.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pendingActions.map((act) => (
              <div
                key={act.id}
                className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition-all ${
                  act.severity === "warning"
                    ? "border-amber-200 bg-amber-50/70"
                    : "border-sky-200 bg-sky-50/70"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        act.severity === "warning" ? "bg-amber-500" : "bg-sky-500"
                      }`}
                    />
                    <h3 className="text-sm font-bold text-stone-900 truncate">{act.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {act.description}
                  </p>
                </div>
                <Link
                  href={act.href}
                  className="shrink-0 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-900 border border-stone-200 shadow-2xs hover:bg-stone-50 hover:border-stone-300"
                >
                  {act.actionLabel} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION C — 4 CORE SUMMARY CARDS (Total RFQs, Active RFQs, Received Quotes, Active Orders) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {coreKpiCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition-all hover:border-amber-400/80 hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 group-hover:text-stone-700">
              {card.label}
            </p>
            <p className={`mt-2 text-3xl font-extrabold tracking-tight ${card.accent}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-stone-400 truncate">{card.hint}</p>
          </Link>
        ))}
      </div>

      {/* SECONDARY PROCUREMENT METRICS ROW */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {secondaryKpiCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5 transition-colors hover:bg-white hover:border-stone-200"
          >
            <p className="text-[11px] font-medium text-stone-500">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-stone-800">{card.value}</p>
            <p className="text-[10px] text-stone-400 truncate">{card.hint}</p>
          </Link>
        ))}
      </div>

      {/* SECTION D — ACTIVE PROCUREMENT ORDERS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900">Active Procurement Orders</h2>
            <p className="text-xs text-stone-500">
              Commercial orders currently in pending payment, processing, or freight dispatch
            </p>
          </div>
          <Link
            href="/buyer/orders"
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            All Orders ({data.metrics.activeOrders}) →
          </Link>
        </CardHeader>
        <CardBody>
          {(data.recentOrders ?? []).length === 0 ? (
            <EmptyState
              title="No active procurement orders"
              description="Once you accept formal supplier quotations, created orders, pro-forma invoices, and dispatch timelines will appear here."
              action={
                <Link
                  href="/buyer/quotes"
                  className="inline-flex rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                >
                  View Received Quotations
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-semibold">
                    <th className="py-2.5 pr-4">Order #</th>
                    <th className="py-2.5 px-4">Supplier</th>
                    <th className="py-2.5 px-4">Items / Dest</th>
                    <th className="py-2.5 px-4">Total Amount</th>
                    <th className="py-2.5 px-4">Order Status</th>
                    <th className="py-2.5 px-4">Payment</th>
                    <th className="py-2.5 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 pr-4 font-bold text-stone-900">
                        <Link href={`/buyer/orders/${ord.id}`} className="hover:text-amber-700">
                          {ord.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-stone-700 font-medium">
                        {ord.sellerBusinessName}
                        {ord.sellerCity && (
                          <span className="block text-[11px] text-stone-400">
                            {ord.sellerCity}, {ord.sellerState}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {ord.itemsCount} item{ord.itemsCount !== 1 ? "s" : ""}
                        <span className="block text-[11px] text-stone-400 truncate max-w-[140px]">
                          {ord.deliveryLocation}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-stone-900">
                        {formatMoneyAmount(ord.totalAmount, ord.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <OrderStatusBadge status={ord.status} />
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={ord.paymentStatus} />
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link
                          href={`/buyer/orders/${ord.id}`}
                          className="font-semibold text-amber-700 hover:underline"
                        >
                          Track →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* SECTION E — QUICK ACTIONS */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-stone-900">Quick Procurement Shortcuts</h2>
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

      {/* SECTION F & G — RECENT RFQS & RECENT QUOTATIONS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* F. Recent Enquiries & RFQs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900">Recent RFQs &amp; Enquiries</h2>
              <p className="text-xs text-stone-500">Custom architectural RFQs and product specifications</p>
            </div>
            <Link
              href="/buyer/rfqs"
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              View All RFQs →
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

        {/* G. Recent Quotations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900">Recent Quotations</h2>
              <p className="text-xs text-stone-500">Latest formal commercial offers from stone suppliers</p>
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

      {/* SECTION H — SAVED PRODUCTS & RECENT ACTIVITY */}
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
