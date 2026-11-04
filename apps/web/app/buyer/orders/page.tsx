import type { Metadata } from "next";
import Link from "next/link";
import { ORDER_STATUSES } from "@stone/types";
import { Card, CardBody, EmptyState, SectionHeading } from "@stone/ui";
import {
  formatShortDate,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/seller/status-badges";
import { formatMoneyAmount } from "@/features/buyer/buyer-meta";
import { getBuyerOrders } from "@/features/buyer/queries";

export const metadata: Metadata = {
  title: "My Orders",
};

interface BuyerOrdersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function BuyerOrdersPage({ searchParams }: BuyerOrdersPageProps) {
  const sp = await searchParams;
  const result = await getBuyerOrders({
    search: sp.search ?? "",
    status: sp.status ?? "all",
    page: Number(sp.page) || 1,
    limit: 15,
  });

  const buildPageHref = (nextPage: number) => {
    const q = new URLSearchParams();
    if (sp.search) q.set("search", sp.search);
    if (sp.status && sp.status !== "all") q.set("status", sp.status);
    q.set("page", String(nextPage));
    return `/buyer/orders?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeading
          title={`My Orders (${result.total})`}
          subtitle="Track your stone procurement orders, commercial pro-forma statuses, and delivery dispatch."
        />
      </div>

      {/* Model B Architecture Notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 flex items-start gap-3">
        <svg
          className="h-5 w-5 shrink-0 text-amber-700 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="space-y-1">
          <p className="font-bold text-amber-900">Payment Model B Architecture Notice</p>
          <p className="text-stone-700 leading-relaxed text-[11px]">
            Platform payment integration is pending. No payment should be made using unverified platform
            payment instructions. Payment confirmation will become available after the authorized payment
            provider integration is activated. Commercial settlement will be processed through StoneB2B Payment
            Model B after the authorized Payment Aggregator integration is activated.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <Card>
        <CardBody className="p-4">
          <form method="GET" action="/buyer/orders" className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                name="search"
                defaultValue={sp.search ?? ""}
                placeholder="Search by order number (ORD-...) or location..."
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div className="min-w-[180px]">
              <select
                name="status"
                defaultValue={sp.status ?? "all"}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 shadow-xs"
            >
              Filter Orders
            </button>
            {(sp.search || (sp.status && sp.status !== "all")) && (
              <Link
                href="/buyer/orders"
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Clear Filters
              </Link>
            )}
          </form>
        </CardBody>
      </Card>

      {/* Orders List */}
      {result.orders.length === 0 ? (
        <Card>
          <CardBody className="p-10">
            <EmptyState
              title="No orders found"
              description="You have not initiated any orders yet, or no orders match your search criteria."
              action={
                <Link
                  href="/buyer/quotes"
                  className="inline-flex rounded-xl bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  View Received Quotations
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {result.orders.map((ord) => {
            const totalFormatted = formatMoneyAmount(ord.totalAmount, ord.currency);
            return (
              <Card
                key={ord.id}
                className="overflow-hidden hover:border-amber-400 transition-colors"
              >
                <CardBody className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-stone-900 font-mono">
                          {ord.orderNumber}
                        </h3>
                        <OrderStatusBadge status={ord.status} />
                      </div>
                      <p className="text-xs text-stone-500">
                        Initiated on {formatShortDate(ord.createdAt)} • Supplier:{" "}
                        <strong className="text-stone-800">{ord.sellerBusinessName}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:text-right">
                      <div>
                        <p className="text-xs text-stone-500">Total Commercial Value</p>
                        <p className="text-lg font-extrabold text-amber-800">{totalFormatted}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-600">
                    <div>
                      <span className="font-semibold text-stone-700 block">Delivery Location:</span>
                      <span>{ord.deliveryLocation}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-700 block">Order Scope:</span>
                      <span>
                        {ord.itemsCount} {ord.itemsCount === 1 ? "Line Item" : "Line Items"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-700 block">Payment State:</span>
                      <PaymentStatusBadge status={ord.paymentStatus} />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Link
                      href={`/buyer/orders/${ord.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 shadow-xs"
                    >
                      View Order Details &amp; Commercial Terms →
                    </Link>
                  </div>
                </CardBody>
              </Card>
            );
          })}

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-stone-500">
                Showing page {result.page} of {result.totalPages} ({result.total} orders total)
              </p>
              <div className="flex items-center gap-2">
                {result.page > 1 && (
                  <Link
                    href={buildPageHref(result.page - 1)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={buildPageHref(result.page + 1)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
