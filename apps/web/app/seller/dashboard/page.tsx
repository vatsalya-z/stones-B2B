import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Card, CardBody, CardHeader, EmptyState } from "@stone/ui";
import {
  EnquiryStatusBadge,
  formatSellerPrice,
  formatShortDate,
  ModerationStatusBadge,
  VerificationStatusBadge,
} from "@/components/seller/status-badges";
import {
  getSellerContext,
  getSellerDashboardData,
  type SellerDashboardMetrics,
} from "@/features/seller/queries";
import { checkVerificationReadiness, UNIT_LABELS } from "@/features/seller/seller-meta";

export const metadata: Metadata = {
  title: "Dashboard",
};

const EMPTY_METRICS: SellerDashboardMetrics = {
  totalProducts: 0,
  publishedProducts: 0,
  pendingProducts: 0,
  rejectedProducts: 0,
  draftProducts: 0,
  archivedProducts: 0,
  totalEnquiries: 0,
  newEnquiries: 0,
  respondedEnquiries: 0,
  totalQuotations: 0,
};

export default async function SellerDashboardPage() {
  const ctx = await getSellerContext();
  const seller = ctx.sellerProfile;

  const dashboard = seller
    ? await getSellerDashboardData(seller.id)
    : {
        metrics: EMPTY_METRICS,
        recentProducts: [],
        recentEnquiries: [],
        productPerformance: [],
        recentActivity: [],
        documentCount: 0,
      };

  const readiness = checkVerificationReadiness(seller, dashboard.documentCount);
  const completedChecks = readiness.checks.filter((c) => c.complete).length;

  const metricCards = [
    {
      label: "Total Products",
      value: dashboard.metrics.totalProducts,
      sub: `${dashboard.metrics.draftProducts} draft`,
      href: "/seller/products",
      tone: "text-stone-900",
    },
    {
      label: "Published Products",
      value: dashboard.metrics.publishedProducts,
      sub: "Live in marketplace",
      href: "/seller/products?status=approved",
      tone: "text-green-700",
    },
    {
      label: "Pending Products",
      value: dashboard.metrics.pendingProducts,
      sub: "Awaiting admin review",
      href: "/seller/products?status=pending_review",
      tone: "text-amber-700",
    },
    {
      label: "Rejected Products",
      value: dashboard.metrics.rejectedProducts,
      sub: "Needs revision",
      href: "/seller/products?status=rejected",
      tone: dashboard.metrics.rejectedProducts > 0 ? "text-red-600" : "text-stone-900",
    },
    {
      label: "Total Enquiries",
      value: dashboard.metrics.totalEnquiries,
      sub: "Buyer RFQs received",
      href: "/seller/enquiries",
      tone: "text-stone-900",
    },
    {
      label: "New Enquiries",
      value: dashboard.metrics.newEnquiries,
      sub: "Unread buyer requests",
      href: "/seller/enquiries?status=submitted",
      tone: dashboard.metrics.newEnquiries > 0 ? "text-amber-700" : "text-stone-900",
    },
    {
      label: "Responded Enquiries",
      value: dashboard.metrics.respondedEnquiries,
      sub: "In discussion or quoted",
      href: "/seller/enquiries",
      tone: "text-green-700",
    },
    {
      label: "Total Quotations",
      value: dashboard.metrics.totalQuotations,
      sub: "Draft & issued quotes",
      href: "/seller/quotes",
      tone: "text-stone-900",
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. OVERVIEW HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            {seller?.business_name
              ? `Welcome back, ${seller.business_name}`
              : `Welcome${ctx.userProfile?.full_name ? `, ${ctx.userProfile.full_name}` : ""}`}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Manage your natural stone catalogue, respond to architectural buyer RFQs, and issue
            commercial quotations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/seller/products/new" className="btn-primary">
            + Add Product
          </Link>
          <Link href="/seller/quotes/new" className="btn-secondary">
            Create Quotation
          </Link>
        </div>
      </section>

      {/* Onboarding Banner if seller_profiles row not created yet */}
      {!seller && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-amber-950">
                Step 1: Complete Your Seller Onboarding Profile
              </h2>
              <p className="mt-1 text-sm text-amber-900/90">
                Set up your factory/quarry details, GSTIN, capabilities, and brand imagery to
                unlock product listings and verification.
              </p>
            </div>
            <Link href="/seller/profile" className="btn-accent flex-shrink-0">
              Complete Profile →
            </Link>
          </div>
        </div>
      )}

      {/* 8 REAL SUPABASE METRIC CARDS */}
      <section aria-label="Seller Key Metrics">
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
          {metricCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition-all hover:border-amber-400 hover:shadow-sm"
            >
              <p className="text-xs font-medium text-stone-500 group-hover:text-stone-700">
                {card.label}
              </p>
              <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${card.tone}`}>
                {card.value}
              </p>
              <p className="mt-1 text-xs text-stone-500">{card.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* QUICK ACTIONS + VERIFICATION STATUS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Quick Actions */}
        <Card className="lg:col-span-7">
          <CardHeader className="border-b border-stone-100 pb-4">
            <h2 className="text-base font-semibold text-stone-900">Quick Actions</h2>
            <p className="text-xs text-stone-500">
              Direct shortcuts to core seller workflows
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/seller/products/new"
                className="flex items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition-colors hover:border-amber-400 hover:bg-amber-50/30"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white text-sm font-bold">
                  +
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-900">Add Stone Product</p>
                  <p className="text-xs text-stone-500">
                    Upload Ultra-HD slab photos &amp; technical specs
                  </p>
                </div>
              </Link>

              <Link
                href="/seller/enquiries"
                className="flex items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition-colors hover:border-amber-400 hover:bg-amber-50/30"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-sm font-bold">
                  ✉
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-900">Review Buyer Enquiries</p>
                  <p className="text-xs text-stone-500">
                    {dashboard.metrics.newEnquiries > 0
                      ? `${dashboard.metrics.newEnquiries} new RFQ(s) awaiting response`
                      : "Check incoming trade RFQs"}
                  </p>
                </div>
              </Link>

              <Link
                href="/seller/quotes/new"
                className="flex items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition-colors hover:border-amber-400 hover:bg-amber-50/30"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-800 text-sm font-bold">
                  ₹
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-900">Prepare Quotation</p>
                  <p className="text-xs text-stone-500">
                    Send itemized pricing, GST &amp; freight terms
                  </p>
                </div>
              </Link>

              <Link
                href="/seller/store"
                className="flex items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition-colors hover:border-amber-400 hover:bg-amber-50/30"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-800 text-sm font-bold">
                  ★
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-900">Customize Storefront</p>
                  <p className="text-xs text-stone-500">
                    Manage public logo, cover banner &amp; catalogue
                  </p>
                </div>
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* Verification Status */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Verification Status</h2>
              <p className="text-xs text-stone-500">Required for public marketplace visibility</p>
            </div>
            <VerificationStatusBadge status={seller?.verification_status ?? "draft"} />
          </CardHeader>
          <CardBody className="space-y-4">
            {seller?.verification_status === "rejected" && seller.verification_reason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <p className="font-semibold">Admin Review Feedback:</p>
                <p className="mt-0.5">{seller.verification_reason}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-stone-600">
                <span>Readiness Checklist</span>
                <span>
                  {completedChecks} / {readiness.checks.length} complete
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full bg-amber-600 transition-all"
                  style={{
                    width: `${Math.round((completedChecks / readiness.checks.length) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <ul className="space-y-1.5">
              {readiness.checks.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-xs text-stone-700">
                  <span
                    className={
                      item.complete
                        ? "font-bold text-green-600"
                        : "font-bold text-stone-300"
                    }
                  >
                    {item.complete ? "✓" : "○"}
                  </span>
                  <span className={item.complete ? "text-stone-700" : "text-stone-500"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="pt-1">
              <Link
                href={seller ? "/seller/verification" : "/seller/profile"}
                className="btn-secondary w-full !py-2 !text-xs"
              >
                {seller?.verification_status === "verified"
                  ? "View Verification Record"
                  : seller?.verification_status === "rejected"
                    ? "Resolve Feedback & Re-Submit"
                    : "Manage Verification Documents"}
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* RECENT PRODUCTS & RECENT ENQUIRIES */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Recent Products</h2>
              <p className="text-xs text-stone-500">Latest catalogue updates</p>
            </div>
            <Link
              href="/seller/products"
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              View All →
            </Link>
          </CardHeader>
          <CardBody>
            {dashboard.recentProducts.length === 0 ? (
              <EmptyState
                title="No stone products yet"
                description="Create your first slab, tile, or block listing to build your catalogue."
                className="py-10"
                action={
                  <Link href="/seller/products/new" className="btn-primary !py-2 !text-xs">
                    + Add First Product
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-stone-100">
                {dashboard.recentProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                        {prod.thumbnailUrl ? (
                          <Image
                            src={prod.thumbnailUrl}
                            alt={prod.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] font-medium text-stone-400">
                            No Img
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/seller/products/${prod.id}/edit`}
                          className="block truncate text-sm font-semibold text-stone-900 hover:text-amber-700"
                        >
                          {prod.name}
                        </Link>
                        <p className="truncate text-xs text-stone-500">
                          {prod.categoryName || "Uncategorized"} •{" "}
                          {formatSellerPrice(
                            prod.price_type,
                            prod.price,
                            prod.currency,
                            prod.unit,
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <ModerationStatusBadge status={prod.moderation_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Enquiries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Recent Enquiries</h2>
              <p className="text-xs text-stone-500">Incoming buyer RFQs</p>
            </div>
            <Link
              href="/seller/enquiries"
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              Open Inbox →
            </Link>
          </CardHeader>
          <CardBody>
            {dashboard.recentEnquiries.length === 0 ? (
              <EmptyState
                title="No enquiries received yet"
                description="Once your seller profile and stone listings are verified and published, buyer RFQs will appear here."
                className="py-10"
              />
            ) : (
              <div className="divide-y divide-stone-100">
                {dashboard.recentEnquiries.map((enq) => {
                  const unitLabel =
                    UNIT_LABELS[enq.unit as keyof typeof UNIT_LABELS] ?? enq.unit;
                  return (
                    <div
                      key={enq.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/seller/enquiries/${enq.id}`}
                          className="block truncate text-sm font-semibold text-stone-900 hover:text-amber-700"
                        >
                          {enq.enquiry_title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-stone-600">
                          {enq.buyerName} • {Number(enq.quantity).toLocaleString("en-IN")}{" "}
                          {unitLabel}
                          {enq.delivery_location ? ` • ${enq.delivery_location}` : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-stone-400">
                          {formatShortDate(enq.created_at)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <EnquiryStatusBadge status={enq.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* PRODUCT PERFORMANCE & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Product Performance */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Product Performance</h2>
              <p className="text-xs text-stone-500">
                Real buyer enquiries &amp; quotations generated per listing
              </p>
            </div>
            <Link
              href="/seller/analytics"
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              Full Analytics →
            </Link>
          </CardHeader>
          <CardBody>
            {dashboard.productPerformance.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-500">
                Add products to track enquiry &amp; quotation engagement across your catalogue.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-100 text-left text-sm">
                  <thead>
                    <tr className="text-xs font-medium uppercase tracking-wider text-stone-500">
                      <th className="pb-2.5 pr-3">Product</th>
                      <th className="pb-2.5 px-3">Status</th>
                      <th className="pb-2.5 px-3 text-right">Enquiries</th>
                      <th className="pb-2.5 pl-3 text-right">Quotes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {dashboard.productPerformance.map((item) => (
                      <tr key={item.productId}>
                        <td className="py-2.5 pr-3 font-medium text-stone-900">
                          <Link
                            href={`/seller/products/${item.productId}/edit`}
                            className="line-clamp-1 hover:text-amber-700"
                          >
                            {item.productName}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3">
                          <ModerationStatusBadge status={item.moderationStatus} />
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-stone-800">
                          {item.enquiryCount}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold text-stone-800">
                          {item.quotationCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-5">
          <CardHeader className="border-b border-stone-100 pb-4">
            <h2 className="text-base font-semibold text-stone-900">Recent Activity</h2>
            <p className="text-xs text-stone-500">Chronological workspace timeline</p>
          </CardHeader>
          <CardBody>
            {dashboard.recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-500">
                No workspace activity recorded yet.
              </p>
            ) : (
              <ol className="space-y-3.5">
                {dashboard.recentActivity.map((act) => (
                  <li key={act.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={act.href}
                        className="block truncate text-xs font-semibold text-stone-900 hover:text-amber-700"
                      >
                        {act.title}
                      </Link>
                      <p className="truncate text-xs text-stone-500">{act.subtitle}</p>
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
  );
}

