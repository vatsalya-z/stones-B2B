import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, cn, EmptyState } from "@stone/ui";
import { Pagination } from "@/components/ui/pagination";
import {
  formatShortDate,
  QuotationStatusBadge,
} from "@/components/seller/status-badges";
import { getSellerContext, getSellerQuotations } from "@/features/seller/queries";

export const metadata: Metadata = {
  title: "Quotations",
};

interface SellerQuotesPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

const QUOTE_TABS = [
  { key: "all", label: "All Quotes" },
  { key: "draft", label: "Drafts" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Declined" },
  { key: "revised", label: "Revised" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default async function SellerQuotesPage({ searchParams }: SellerQuotesPageProps) {
  const sp = await searchParams;
  const ctx = await getSellerContext();
  const seller = ctx.sellerProfile;

  const listing = seller
    ? await getSellerQuotations(seller.id, {
        status: sp.status,
        page: sp.page,
      })
    : { quotations: [], total: 0, totalPages: 0, page: 1 };

  const activeStatus = sp.status && sp.status !== "all" ? sp.status : "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Commercial Proposals
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Quotation Management
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Create itemized proforma quotations with deterministic GST, discount, and freight
            calculations.
          </p>
        </div>

        <Link href="/seller/quotes/new" className="btn-primary self-start sm:self-auto">
          + Create Quotation
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {QUOTE_TABS.map((tab) => {
          const selected = activeStatus === tab.key;
          const href =
            tab.key === "all" ? "/seller/quotes" : `/seller/quotes?status=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "inline-flex flex-shrink-0 items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                selected
                  ? "bg-stone-900 text-white"
                  : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {listing.quotations.length === 0 ? (
        <EmptyState
          title={
            activeStatus !== "all"
              ? "No quotations in this status"
              : "No quotations created yet"
          }
          description="Prepare your first commercial quotation for an authorized buyer enquiry."
          action={
            <Link href="/seller/quotes/new" className="btn-primary !py-2 !text-xs">
              + Create Quotation
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {listing.quotations.map((q) => (
            <Card key={q.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/seller/quotes/${q.id}`}
                      className="text-base font-bold text-stone-900 hover:text-amber-700"
                    >
                      {q.quote_number}
                    </Link>
                    <QuotationStatusBadge status={q.status} />
                  </div>
                  <p className="truncate text-xs text-stone-600">
                    <strong>Enquiry:</strong> {q.enquiryTitle} • <strong>Buyer:</strong>{" "}
                    {q.buyerName}
                  </p>
                  <p className="text-xs text-stone-500">
                    {q.itemCount} line item{q.itemCount === 1 ? "" : "s"} • Created{" "}
                    {formatShortDate(q.created_at)}
                    {q.valid_until ? ` • Valid until ${formatShortDate(q.valid_until)}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-stone-500">Grand Total</p>
                    <p className="text-base font-extrabold text-stone-900">
                      {q.currency} {Number(q.total_amount).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <Link
                    href={`/seller/quotes/${q.id}`}
                    className="btn-secondary !px-3.5 !py-2 !text-xs"
                  >
                    {q.status === "draft" ? "Edit / Send" : "View Details"}
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={listing.page}
        totalPages={listing.totalPages}
        baseUrl="/seller/quotes"
        searchParams={{
          status: activeStatus !== "all" ? activeStatus : undefined,
        }}
      />
    </div>
  );
}

