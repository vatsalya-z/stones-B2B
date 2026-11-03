import type { Metadata } from "next";
import Link from "next/link";
import { QUOTATION_STATUSES } from "@stone/types";
import { Card, CardBody, EmptyState, SectionHeading, VerifiedBadge } from "@stone/ui";
import {
  formatShortDate,
  QuotationStatusBadge,
} from "@/components/seller/status-badges";
import { QUOTATION_STATUS_LABELS } from "@/features/seller/seller-meta";
import { formatMoneyAmount, isQuotationExpired } from "@/features/buyer/buyer-meta";
import { getBuyerContext, getBuyerQuotations } from "@/features/buyer/queries";

export const metadata: Metadata = {
  title: "Received Quotations",
};

interface BuyerQuotesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    seller?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
}

const BUYER_VISIBLE_QUOTE_STATUSES = QUOTATION_STATUSES.filter((s) => s !== "draft");

export default async function BuyerQuotationsPage({ searchParams }: BuyerQuotesPageProps) {
  const [ctx, sp] = await Promise.all([getBuyerContext(), searchParams]);
  const sort = sp.sort === "oldest" ? "oldest" : "newest";

  const result = await getBuyerQuotations(ctx.user.id, {
    search: sp.search ?? "",
    status: sp.status ?? "all",
    sellerId: sp.seller ?? "",
    dateFrom: sp.from ?? "",
    dateTo: sp.to ?? "",
    sort,
    page: Number(sp.page) || 1,
    pageSize: 10,
  });

  const buildPageHref = (nextPage: number) => {
    const q = new URLSearchParams();
    if (sp.search) q.set("search", sp.search);
    if (sp.status && sp.status !== "all") q.set("status", sp.status);
    if (sp.seller) q.set("seller", sp.seller);
    if (sp.from) q.set("from", sp.from);
    if (sp.to) q.set("to", sp.to);
    if (sort !== "newest") q.set("sort", sort);
    q.set("page", String(nextPage));
    return `/buyer/quotes?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeading
          title={`Received Quotations (${result.total})`}
          subtitle="Review itemised stone quotations, commercial breakdowns, validity dates, and supplier terms."
        />

        <Link
          href="/buyer/quotes/compare"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-xs hover:bg-stone-50 self-start sm:self-auto"
        >
          Compare Quotations ⇄
        </Link>
      </div>

      {/* Search & Filter Controls */}
      <Card>
        <CardBody className="p-4">
          <form
            method="GET"
            action="/buyer/quotes"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
          >
            <div>
              <label htmlFor="quote-search" className="block text-[11px] font-semibold text-stone-600 mb-1">
                Search Quote / Enquiry
              </label>
              <input
                id="quote-search"
                name="search"
                type="search"
                defaultValue={sp.search ?? ""}
                placeholder="Quote # or enquiry…"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="quote-status" className="block text-[11px] font-semibold text-stone-600 mb-1">
                Status
              </label>
              <select
                id="quote-status"
                name="status"
                defaultValue={sp.status ?? "all"}
                className="input-base"
              >
                <option value="all">All Statuses</option>
                {BUYER_VISIBLE_QUOTE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {QUOTATION_STATUS_LABELS[st] ?? st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quote-seller" className="block text-[11px] font-semibold text-stone-600 mb-1">
                Supplier
              </label>
              <select
                id="quote-seller"
                name="seller"
                defaultValue={sp.seller ?? ""}
                className="input-base"
              >
                <option value="">All Suppliers</option>
                {result.availableSellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quote-from" className="block text-[11px] font-semibold text-stone-600 mb-1">
                From Date
              </label>
              <input
                id="quote-from"
                name="from"
                type="date"
                defaultValue={sp.from ?? ""}
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="quote-to" className="block text-[11px] font-semibold text-stone-600 mb-1">
                To Date
              </label>
              <input
                id="quote-to"
                name="to"
                type="date"
                defaultValue={sp.to ?? ""}
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="quote-sort" className="block text-[11px] font-semibold text-stone-600 mb-1">
                Sort
              </label>
              <div className="flex gap-2">
                <select
                  id="quote-sort"
                  name="sort"
                  defaultValue={sort}
                  className="input-base flex-1"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
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

          {(sp.search ||
            (sp.status && sp.status !== "all") ||
            sp.seller ||
            sp.from ||
            sp.to) && (
            <div className="mt-3 flex items-center justify-end">
              <Link
                href="/buyer/quotes"
                className="text-xs font-semibold text-stone-500 hover:text-stone-900 underline"
              >
                Reset Filters
              </Link>
            </div>
          )}
        </CardBody>
      </Card>

      {result.items.length === 0 ? (
        <Card>
          <CardBody className="p-10">
            <EmptyState
              title="No quotations found"
              description="Formal quotations issued by verified suppliers for your enquiries will appear in this inbox."
              action={
                <Link
                  href="/buyer/rfqs/new"
                  className="inline-flex rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Create New RFQ
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Desktop Table (xl+) */}
          <Card className="hidden xl:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-stone-200 bg-stone-50/80 font-semibold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-4 py-3.5">Quote #</th>
                    <th className="px-3 py-3.5">Related Enquiry</th>
                    <th className="px-3 py-3.5">Supplier</th>
                    <th className="px-3 py-3.5 text-right">Subtotal</th>
                    <th className="px-3 py-3.5 text-right">Discount</th>
                    <th className="px-3 py-3.5 text-right">Tax</th>
                    <th className="px-3 py-3.5 text-right">Shipping</th>
                    <th className="px-3 py-3.5 text-right">Total</th>
                    <th className="px-3 py-3.5">Valid Until</th>
                    <th className="px-3 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {result.items.map((q) => {
                    const expired = isQuotationExpired(q.validUntil);
                    return (
                      <tr key={q.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Link
                            href={`/buyer/quotes/${q.id}`}
                            className="font-bold text-stone-900 hover:text-amber-700"
                          >
                            {q.quoteNumber}
                          </Link>
                          <p className="text-[11px] text-stone-400">
                            {formatShortDate(q.createdAt)} • {q.currency}
                          </p>
                        </td>
                        <td className="px-3 py-4 max-w-[180px]">
                          <Link
                            href={`/buyer/enquiries/${q.enquiryId}`}
                            className="block truncate font-medium text-stone-800 hover:text-amber-700"
                          >
                            {q.enquiryTitle}
                          </Link>
                          <span className="font-mono text-[10px] text-stone-400">
                            {q.enquiryReference}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-stone-800">
                              {q.seller.businessName}
                            </span>
                            {q.seller.isVerified && <VerifiedBadge />}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right whitespace-nowrap text-stone-700">
                          {formatMoneyAmount(q.subtotal, q.currency)}
                        </td>
                        <td className="px-3 py-4 text-right whitespace-nowrap text-stone-600">
                          {q.discountAmount > 0
                            ? `- ${formatMoneyAmount(q.discountAmount, q.currency)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-4 text-right whitespace-nowrap text-stone-600">
                          {formatMoneyAmount(q.taxAmount, q.currency)}
                        </td>
                        <td className="px-3 py-4 text-right whitespace-nowrap text-stone-600">
                          {formatMoneyAmount(q.shippingCharges, q.currency)}
                        </td>
                        <td className="px-3 py-4 text-right whitespace-nowrap font-extrabold text-stone-900">
                          {formatMoneyAmount(q.totalAmount, q.currency)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={expired ? "text-red-600 font-semibold" : "text-stone-600"}>
                            {q.validUntil ? formatShortDate(q.validUntil) : "Open"}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <QuotationStatusBadge status={q.status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/buyer/quotes/${q.id}`}
                            className="inline-flex rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold text-stone-800 hover:bg-stone-50"
                          >
                            View Quote
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile & Tablet Quotation Cards (< xl) */}
          <div className="grid grid-cols-1 gap-4 xl:hidden">
            {result.items.map((q) => (
              <Card key={q.id}>
                <CardBody className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/buyer/quotes/${q.id}`}
                        className="text-base font-bold text-stone-900 hover:text-amber-700"
                      >
                        {q.quoteNumber}
                      </Link>
                      <p className="text-xs text-stone-500">
                        {q.seller.businessName} • {q.enquiryTitle}
                      </p>
                    </div>
                    <QuotationStatusBadge status={q.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-stone-400 block">Subtotal</span>
                      <span className="font-semibold text-stone-800">
                        {formatMoneyAmount(q.subtotal, q.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Tax + Shipping</span>
                      <span className="font-semibold text-stone-800">
                        {formatMoneyAmount(q.taxAmount + q.shippingCharges, q.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Discount</span>
                      <span className="font-semibold text-stone-800">
                        {formatMoneyAmount(q.discountAmount, q.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Final Total ({q.currency})</span>
                      <span className="font-extrabold text-stone-900">
                        {formatMoneyAmount(q.totalAmount, q.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>
                      Valid until: {q.validUntil ? formatShortDate(q.validUntil) : "As per terms"}
                    </span>
                    <Link
                      href={`/buyer/quotes/${q.id}`}
                      className="font-semibold text-amber-700 hover:underline"
                    >
                      Open Quotation →
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {result.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-600">
              <span>
                Page <strong>{result.page}</strong> of <strong>{result.totalPages}</strong> ({result.total} quotations)
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

