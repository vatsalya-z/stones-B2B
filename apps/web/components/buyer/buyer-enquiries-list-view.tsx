import Link from "next/link";
import { ENQUIRY_STATUSES } from "@stone/types";
import { Badge, Card, CardBody, EmptyState, SectionHeading, VerifiedBadge } from "@stone/ui";
import {
  EnquiryStatusBadge,
  formatShortDate,
} from "@/components/seller/status-badges";
import { ENQUIRY_STATUS_LABELS } from "@/features/seller/seller-meta";
import { formatUnitLabel } from "@/features/buyer/buyer-meta";
import type { PaginatedBuyerEnquiries } from "@/features/buyer/queries";

export interface BuyerEnquiriesListViewProps {
  mode: "enquiries" | "rfqs";
  result: PaginatedBuyerEnquiries;
  filters: {
    search: string;
    status: string;
    dateFrom: string;
    dateTo: string;
    sort: "newest" | "oldest";
  };
}

export function BuyerEnquiriesListView({
  mode,
  result,
  filters,
}: BuyerEnquiriesListViewProps) {
  const basePath = mode === "rfqs" ? "/buyer/rfqs" : "/buyer/enquiries";

  const buildPageHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (filters.search) sp.set("search", filters.search);
    if (filters.status && filters.status !== "all") sp.set("status", filters.status);
    if (filters.dateFrom) sp.set("from", filters.dateFrom);
    if (filters.dateTo) sp.set("to", filters.dateTo);
    if (filters.sort !== "newest") sp.set("sort", filters.sort);
    sp.set("page", String(nextPage));
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeading
          title={
            mode === "rfqs"
              ? `Requests for Quotation (${result.total})`
              : `My Enquiries (${result.total})`
          }
          subtitle={
            mode === "rfqs"
              ? "Manage formal product-specific and general custom stone RFQs sent to verified suppliers."
              : "Track all product enquiries and formal RFQs, supplier responses, and received quotations."
          }
        />

        <Link
          href="/buyer/rfqs/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 self-start sm:self-auto"
        >
          + Create New RFQ
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardBody className="p-4">
          <form method="GET" action={basePath} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="sm:col-span-2">
              <label htmlFor="enq-search" className="block text-[11px] font-semibold text-stone-600 mb-1">
                Search by Title
              </label>
              <input
                id="enq-search"
                name="search"
                type="search"
                defaultValue={filters.search}
                placeholder="Search enquiry or RFQ title…"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="enq-status" className="block text-[11px] font-semibold text-stone-600 mb-1">
                Status
              </label>
              <select
                id="enq-status"
                name="status"
                defaultValue={filters.status}
                className="input-base"
              >
                <option value="all">All Statuses</option>
                {ENQUIRY_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {ENQUIRY_STATUS_LABELS[st] ?? st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="enq-from" className="block text-[11px] font-semibold text-stone-600 mb-1">
                From Date
              </label>
              <input
                id="enq-from"
                name="from"
                type="date"
                defaultValue={filters.dateFrom}
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="enq-to" className="block text-[11px] font-semibold text-stone-600 mb-1">
                To Date
              </label>
              <input
                id="enq-to"
                name="to"
                type="date"
                defaultValue={filters.dateTo}
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="enq-sort" className="block text-[11px] font-semibold text-stone-600 mb-1">
                Sort Order
              </label>
              <div className="flex gap-2">
                <select
                  id="enq-sort"
                  name="sort"
                  defaultValue={filters.sort}
                  className="input-base flex-1"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                >
                  Apply
                </button>
              </div>
            </div>
          </form>

          {(filters.search || filters.status !== "all" || filters.dateFrom || filters.dateTo) && (
            <div className="mt-3 flex items-center justify-end">
              <Link
                href={basePath}
                className="text-xs font-semibold text-stone-500 hover:text-stone-900 underline"
              >
                Reset Filters
              </Link>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Results */}
      {result.items.length === 0 ? (
        <Card>
          <CardBody className="p-10">
            <EmptyState
              title={
                mode === "rfqs"
                  ? "No RFQs match your current criteria"
                  : "No enquiries match your current criteria"
              }
              description="Submit a product-specific enquiry from the marketplace or create a detailed custom stone RFQ."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/buyer/rfqs/new"
                    className="inline-flex rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Create New RFQ
                  </Link>
                  <Link
                    href="/products"
                    className="inline-flex rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Browse Stone Catalogue
                  </Link>
                </div>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Desktop Table (lg+) */}
          <Card className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-5 py-3.5">Ref &amp; Title</th>
                    <th className="px-4 py-3.5">Product / Scope</th>
                    <th className="px-4 py-3.5">Supplier</th>
                    <th className="px-4 py-3.5">Quantity</th>
                    <th className="px-4 py-3.5">Delivery</th>
                    <th className="px-4 py-3.5">Quotes</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {result.items.map((item) => {
                    const detailHref =
                      mode === "rfqs" || item.isRfq
                        ? `/buyer/rfqs/${item.id}`
                        : `/buyer/enquiries/${item.id}`;
                    return (
                      <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-5 py-4 max-w-[240px]">
                          <p className="font-mono text-[11px] font-semibold text-stone-400">
                            {item.referenceCode}
                          </p>
                          <Link
                            href={detailHref}
                            className="mt-0.5 block truncate font-bold text-stone-900 hover:text-amber-700"
                          >
                            {item.enquiryTitle}
                          </Link>
                        </td>
                        <td className="px-4 py-4 max-w-[180px]">
                          {item.product ? (
                            <Link
                              href={`/products/${item.product.slug}`}
                              className="block truncate text-xs font-medium text-stone-800 hover:text-amber-700"
                            >
                              {item.product.name}
                            </Link>
                          ) : (
                            <Badge variant="outline">Custom Stone RFQ</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-stone-800">
                              {item.seller.businessName}
                            </span>
                            {item.seller.isVerified && <VerifiedBadge />}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold text-stone-900">
                          {item.quantity.toLocaleString("en-IN")} {formatUnitLabel(item.unit)}
                        </td>
                        <td className="px-4 py-4 max-w-[160px] truncate text-xs text-stone-600">
                          {item.deliveryLocation || "—"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {item.quotationsCount > 0 ? (
                            <Badge variant="success">
                              {item.quotationsCount} Quote{item.quotationsCount > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-xs text-stone-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <EnquiryStatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-stone-500">
                          {formatShortDate(item.createdAt)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <Link
                            href={detailHref}
                            className="inline-flex rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile & Tablet Stacked Cards (< lg) */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {result.items.map((item) => {
              const detailHref =
                mode === "rfqs" || item.isRfq
                  ? `/buyer/rfqs/${item.id}`
                  : `/buyer/enquiries/${item.id}`;
              return (
                <Card key={item.id}>
                  <CardBody className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-stone-400">
                          {item.referenceCode}
                        </span>
                        <Link
                          href={detailHref}
                          className="mt-0.5 block text-sm font-bold text-stone-900 hover:text-amber-700"
                        >
                          {item.enquiryTitle}
                        </Link>
                      </div>
                      <EnquiryStatusBadge status={item.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                      <div>
                        <span className="text-stone-400 block">Supplier</span>
                        <span className="font-semibold text-stone-800">
                          {item.seller.businessName}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Quantity</span>
                        <span className="font-semibold text-stone-800">
                          {item.quantity.toLocaleString("en-IN")} {formatUnitLabel(item.unit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Product / Scope</span>
                        <span className="font-medium text-stone-800 truncate block">
                          {item.product?.name ?? "Custom Stone RFQ"}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Delivery</span>
                        <span className="font-medium text-stone-800 truncate block">
                          {item.deliveryLocation || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs">
                      <span className="text-stone-500">
                        {formatShortDate(item.createdAt)} • {item.quotationsCount} quotation(s)
                      </span>
                      <Link
                        href={detailHref}
                        className="font-semibold text-amber-700 hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-600">
              <span>
                Page <strong>{result.page}</strong> of <strong>{result.totalPages}</strong> ({result.total} records)
              </span>
              <div className="flex items-center gap-2">
                {result.page > 1 && (
                  <Link
                    href={buildPageHref(result.page - 1)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    ← Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={buildPageHref(result.page + 1)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

