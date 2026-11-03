import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, CardHeader, EmptyState } from "@stone/ui";
import {
  formatShortDate,
  ModerationStatusBadge,
} from "@/components/seller/status-badges";
import {
  ENQUIRY_STATUS_LABELS,
  MODERATION_STATUS_LABELS,
  type ModerationStatus,
} from "@/features/seller/seller-meta";
import {
  getSellerAnalyticsData,
  getSellerContext,
} from "@/features/seller/queries";
import {
  SvgDonutChart,
  SvgBarChart,
} from "@/components/admin/simple-charts";

export const metadata: Metadata = {
  title: "Seller Analytics",
};

export default async function SellerAnalyticsPage() {
  const ctx = await getSellerContext();
  const seller = ctx.sellerProfile;

  const analytics = seller ? await getSellerAnalyticsData(seller.id) : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Insights
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Seller Analytics &amp; Funnel Performance
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          100% live commercial metrics computed directly from your Supabase catalogue,
          enquiries, and quotations.
        </p>
      </div>

      {/* Explicit Transparency Notice on Product-View Telemetry Dependency */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-700 shadow-xs">
        <p className="font-semibold text-stone-900">
          Data Integrity &amp; View-Tracking Telemetry Note
        </p>
        <p className="mt-1 leading-relaxed text-stone-600">
          All figures below reflect real transactional records in PostgreSQL. Anonymous page
          impression / product-view event tracking (<code className="font-mono">product_views</code>)
          is not yet enabled in the database schema and is scheduled for future telemetry
          instrumentation—no synthetic or estimated view counts are displayed here.
        </p>
      </div>

      {!seller || !analytics ? (
        <EmptyState
          title="Complete Seller Onboarding to Unlock Analytics"
          description="Set up your business profile and add products to measure real buyer RFQ and quotation conversions."
          action={
            <Link href="/seller/profile" className="btn-primary !py-2 !text-xs">
              Complete Profile →
            </Link>
          }
        />
      ) : (
        <>
          {/* Headline KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardBody>
                <p className="text-xs font-medium text-stone-500">Published Products</p>
                <p className="mt-2 text-2xl font-bold text-green-700 sm:text-3xl">
                  {analytics.totalPublishedProducts}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  of {analytics.totalProducts} total listings
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-xs font-medium text-stone-500">Total Enquiries</p>
                <p className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">
                  {analytics.totalEnquiries}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Response rate:{" "}
                  {analytics.responseRatePct !== null ? `${analytics.responseRatePct}%` : "—"}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-xs font-medium text-stone-500">RFQ → Quote Conversion</p>
                <p className="mt-2 text-2xl font-bold text-amber-700 sm:text-3xl">
                  {analytics.quoteCoverageRatePct !== null
                    ? `${analytics.quoteCoverageRatePct}%`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {analytics.totalQuotationsSent} formal quote(s) issued
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-xs font-medium text-stone-500">Quote Acceptance Rate</p>
                <p className="mt-2 text-2xl font-bold text-green-700 sm:text-3xl">
                  {analytics.quoteAcceptanceRatePct !== null
                    ? `${analytics.quoteAcceptanceRatePct}%`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {analytics.totalQuotationsAccepted} accepted • ₹
                  {analytics.acceptedValueInr.toLocaleString("en-IN")}
                </p>
              </CardBody>
            </Card>
          </div>

          {/* ── Performance Visualizations ────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-stone-900">
              Performance Visualizations
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Chart 1 — Enquiry Funnel (DonutChart) */}
              <Card>
                <CardBody className="p-0">
                  <SvgDonutChart
                    title="Enquiry Funnel"
                    subtitle="Status distribution across all enquiries"
                    totalLabel="Enquiries"
                    data={[
                      { label: "Submitted", total: analytics.enquiryStatusBreakdown.submitted },
                      { label: "Viewed", total: analytics.enquiryStatusBreakdown.viewed },
                      { label: "Responding", total: analytics.enquiryStatusBreakdown.responding },
                      { label: "Quoted", total: analytics.enquiryStatusBreakdown.quoted },
                      { label: "Accepted", total: analytics.enquiryStatusBreakdown.accepted },
                      { label: "Closed", total: analytics.enquiryStatusBreakdown.closed },
                      { label: "Rejected", total: analytics.enquiryStatusBreakdown.rejected },
                      { label: "Cancelled", total: analytics.enquiryStatusBreakdown.cancelled },
                    ].filter((seg) => seg.total > 0)}
                  />
                </CardBody>
              </Card>

              {/* Chart 2 — Product Performance Distribution (BarChart) */}
              <Card>
                <CardBody className="p-0">
                  <SvgBarChart
                    title="Product Status Distribution"
                    subtitle="Count of products by moderation status"
                    data={[
                      { label: "Published", value: analytics.productStatusBreakdown.approved },
                      { label: "Pending", value: analytics.productStatusBreakdown.pending_review },
                      { label: "Rejected", value: analytics.productStatusBreakdown.rejected },
                      { label: "Draft", value: analytics.productStatusBreakdown.draft },
                      { label: "Archived", value: analytics.productStatusBreakdown.archived },
                    ]}
                    barColor="fill-amber-500"
                    valueFormatter={(v) => v.toLocaleString("en-IN")}
                  />
                </CardBody>
              </Card>

              {/* Chart 3 — Quotation Conversion (DonutChart)
                  Note: The SellerAnalyticsData return type does not include a
                  per-status quotation breakdown (pending / expired / rejected
                  counts). Only aggregate totals are available, so we show
                  Accepted vs Pending (not yet accepted) vs Other. */}
              <Card>
                <CardBody className="p-0">
                  <SvgDonutChart
                    title="Quotation Conversion"
                    subtitle="Accepted vs pending formal quotes sent"
                    totalLabel="Quotes"
                    data={[
                      {
                        label: "Accepted",
                        total: analytics.totalQuotationsAccepted,
                        color: "#10b981",
                      },
                      {
                        label: "Other / Pending",
                        total: Math.max(
                          0,
                          analytics.totalQuotationsSent - analytics.totalQuotationsAccepted,
                        ),
                        color: "#f59e0b",
                      },
                    ].filter((seg) => seg.total > 0)}
                  />
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Catalogue Distribution + Enquiry Funnel */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b border-stone-100 pb-4">
                <h2 className="text-base font-semibold text-stone-900">
                  Catalogue Moderation Distribution
                </h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {(Object.keys(MODERATION_STATUS_LABELS) as ModerationStatus[]).map((st) => {
                  const count = analytics.productStatusBreakdown[st] ?? 0;
                  const pct =
                    analytics.totalProducts > 0
                      ? Math.round((count / analytics.totalProducts) * 100)
                      : 0;
                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-stone-700">
                          {MODERATION_STATUS_LABELS[st]}
                        </span>
                        <span className="font-semibold text-stone-900">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full bg-stone-800 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="border-b border-stone-100 pb-4">
                <h2 className="text-base font-semibold text-stone-900">
                  Enquiry Pipeline Breakdown
                </h2>
                <p className="text-xs text-stone-500">
                  Quoted pipeline (INR): ₹{analytics.quotedValueInr.toLocaleString("en-IN")}
                </p>
              </CardHeader>
              <CardBody className="space-y-2.5">
                {(
                  Object.keys(ENQUIRY_STATUS_LABELS) as Array<
                    keyof typeof ENQUIRY_STATUS_LABELS
                  >
                ).map((st) => {
                  const count = analytics.enquiryStatusBreakdown[st] ?? 0;
                  const pct =
                    analytics.totalEnquiries > 0
                      ? Math.round((count / analytics.totalEnquiries) * 100)
                      : 0;
                  return (
                    <div key={st} className="flex items-center justify-between gap-3 text-xs">
                      <span className="w-32 flex-shrink-0 font-medium text-stone-700">
                        {ENQUIRY_STATUS_LABELS[st]}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full bg-amber-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-semibold text-stone-900">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          </div>

          {/* Product Performance & Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader className="border-b border-stone-100 pb-4">
                <h2 className="text-base font-semibold text-stone-900">
                  Product Enquiry &amp; Quote Performance
                </h2>
              </CardHeader>
              <CardBody>
                {analytics.productPerformance.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-500">
                    No products available to report performance.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-stone-100 text-left text-sm">
                      <thead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        <tr>
                          <th className="pb-2.5 pr-3">Product</th>
                          <th className="pb-2.5 px-2">Status</th>
                          <th className="pb-2.5 px-2 text-right">RFQs</th>
                          <th className="pb-2.5 px-2 text-right">Quoted</th>
                          <th className="pb-2.5 pl-2 text-right">Accepted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {analytics.productPerformance.slice(0, 15).map((item) => (
                          <tr key={item.productId}>
                            <td className="py-2.5 pr-3 font-medium text-stone-900">
                              <Link
                                href={`/seller/products/${item.productId}/edit`}
                                className="line-clamp-1 hover:text-amber-700"
                              >
                                {item.name}
                              </Link>
                            </td>
                            <td className="py-2.5 px-2">
                              <ModerationStatusBadge status={item.moderationStatus} />
                            </td>
                            <td className="py-2.5 px-2 text-right font-semibold text-stone-800">
                              {item.enquiriesCount}
                            </td>
                            <td className="py-2.5 px-2 text-right text-stone-700">
                              {item.quotedEnquiriesCount}
                            </td>
                            <td className="py-2.5 pl-2 text-right font-semibold text-green-700">
                              {item.acceptedQuotesCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader className="border-b border-stone-100 pb-4">
                <h2 className="text-base font-semibold text-stone-900">Recent Activity</h2>
              </CardHeader>
              <CardBody>
                {analytics.recentActivity.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-500">
                    No activity events yet.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {analytics.recentActivity.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={item.href}
                            className="block truncate text-xs font-semibold text-stone-900 hover:text-amber-700"
                          >
                            {item.title}
                          </Link>
                          <p className="truncate text-xs text-stone-500">{item.subtitle}</p>
                        </div>
                        <span className="flex-shrink-0 text-[11px] text-stone-400">
                          {formatShortDate(item.timestamp)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

