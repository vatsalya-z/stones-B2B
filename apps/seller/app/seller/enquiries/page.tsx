import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, cn, EmptyState } from "@stone/ui";
import { Pagination } from "@/components/ui/pagination";
import {
  EnquiryStatusBadge,
  formatShortDate,
} from "@/components/seller/status-badges";
import { UNIT_LABELS } from "@/features/seller/seller-meta";
import { getSellerContext, getSellerEnquiries } from "@/features/seller/queries";

export const metadata: Metadata = {
  title: "Buyer Enquiries",
};

interface SellerEnquiriesPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

const ENQUIRY_TABS = [
  { key: "all", label: "All RFQs" },
  { key: "submitted", label: "New" },
  { key: "viewed", label: "Viewed" },
  { key: "responding", label: "In Discussion" },
  { key: "quoted", label: "Quoted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Declined" },
  { key: "closed", label: "Closed" },
] as const;

export default async function SellerEnquiriesPage({
  searchParams,
}: SellerEnquiriesPageProps) {
  const sp = await searchParams;
  const ctx = await getSellerContext();
  const seller = ctx.sellerProfile;

  const listing = seller
    ? await getSellerEnquiries(seller.id, {
        q: sp.q,
        status: sp.status,
        page: sp.page,
      })
    : {
        enquiries: [],
        total: 0,
        totalPages: 0,
        page: 1,
        statusCounts: { all: 0, submitted: 0 },
      };

  const activeStatus = sp.status && sp.status !== "all" ? sp.status : "all";
  const isFiltered = Boolean(sp.q?.trim() || activeStatus !== "all");

  const buildTabHref = (tabKey: string) => {
    const params = new URLSearchParams();
    if (sp.q?.trim()) params.set("q", sp.q.trim());
    if (tabKey !== "all") params.set("status", tabKey);
    const qs = params.toString();
    return qs ? `/seller/enquiries?${qs}` : "/seller/enquiries";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Trade Inbox
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Buyer Enquiries &amp; RFQs
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Review incoming architectural &amp; bulk stone enquiries, respond to buyers, and
            issue commercial quotations.
          </p>
        </div>

        <Link href="/seller/quotes" className="btn-secondary self-start sm:self-auto">
          View Sent Quotations →
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {ENQUIRY_TABS.map((tab) => {
          const selected = activeStatus === tab.key;
          const count = listing.statusCounts[tab.key] ?? 0;
          return (
            <Link
              key={tab.key}
              href={buildTabHref(tab.key)}
              className={cn(
                "inline-flex flex-shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                selected
                  ? "bg-stone-900 text-white"
                  : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
              )}
            >
              {tab.key === "submitted" && count > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              )}
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px]",
                  selected ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Search Form */}
      <form
        method="GET"
        action="/seller/enquiries"
        className="flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center"
      >
        {activeStatus !== "all" && (
          <input type="hidden" name="status" value={activeStatus} />
        )}
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search enquiries by title, stone requirement, or delivery city…"
          className="input-base flex-1 !py-2"
        />
        <div className="flex items-center gap-2">
          <button type="submit" className="btn-secondary !py-2 !text-xs">
            Search
          </button>
          {isFiltered && (
            <Link href="/seller/enquiries" className="btn-ghost !py-2 !text-xs">
              Reset
            </Link>
          )}
        </div>
      </form>

      {/* Enquiry List */}
      {listing.enquiries.length === 0 ? (
        <EmptyState
          title={isFiltered ? "No enquiries match your search" : "No buyer enquiries yet"}
          description={
            isFiltered
              ? "Try resetting your status filter or search terms."
              : "Incoming RFQs from architects, builders, and stone importers will appear here."
          }
          action={
            isFiltered ? (
              <Link href="/seller/enquiries" className="btn-secondary !py-2 !text-xs">
                Clear Filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {listing.enquiries.map((enq) => {
            const isNew = enq.status === "submitted";
            const unitLabel =
              UNIT_LABELS[enq.unit as keyof typeof UNIT_LABELS] ?? enq.unit;
            const buyerLocation = [enq.buyer.city, enq.buyer.state]
              .filter(Boolean)
              .join(", ");

            return (
              <Card
                key={enq.id}
                className={cn(
                  "transition-colors",
                  isNew && "border-amber-400 bg-amber-50/20",
                )}
              >
                <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {isNew && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          ● NEW RFQ
                        </span>
                      )}
                      <EnquiryStatusBadge status={enq.status} />
                      <span className="text-xs text-stone-400">
                        Received {formatShortDate(enq.createdAt)}
                      </span>
                    </div>

                    <Link
                      href={`/seller/enquiries/${enq.id}`}
                      className="block text-base font-bold text-stone-900 hover:text-amber-700"
                    >
                      {enq.enquiryTitle}
                    </Link>

                    <p className="line-clamp-2 text-xs text-stone-600">{enq.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-stone-700">
                      <span>
                        <strong>Buyer:</strong>{" "}
                        {enq.buyer.fullName || enq.buyer.email || "Verified Buyer"}
                        {buyerLocation ? ` (${buyerLocation})` : ""}
                      </span>
                      <span>
                        <strong>Quantity:</strong>{" "}
                        {Number(enq.quantity).toLocaleString("en-IN")} {unitLabel}
                      </span>
                      {enq.product && (
                        <span>
                          <strong>Product:</strong> {enq.product.name}
                        </span>
                      )}
                      {enq.deliveryLocation && (
                        <span>
                          <strong>Delivery:</strong> {enq.deliveryLocation}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <Link
                      href={`/seller/enquiries/${enq.id}`}
                      className="btn-primary !px-4 !py-2 !text-xs"
                    >
                      Open &amp; Respond
                    </Link>
                    {["submitted", "viewed", "responding", "quoted"].includes(enq.status) && (
                      <Link
                        href={`/seller/quotes/new?enquiryId=${enq.id}`}
                        className="btn-secondary !px-3.5 !py-1.5 !text-xs"
                      >
                        Prepare Quote
                      </Link>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={listing.page}
        totalPages={listing.totalPages}
        baseUrl="/seller/enquiries"
        searchParams={{
          q: sp.q,
          status: activeStatus !== "all" ? activeStatus : undefined,
        }}
      />
    </div>
  );
}

