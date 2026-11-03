import type { Metadata } from "next";
import Link from "next/link";
import { ORDER_STATUSES } from "@stone/types";
import { Card, CardBody, EmptyState, SectionHeading } from "@stone/ui";
import {
  formatShortDate,
  OrderStatusBadge,
} from "@/components/seller/status-badges";
import { formatMoneyAmount } from "@/features/buyer/buyer-meta";
import { getAdminOrders } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: "Order Monitoring",
};

interface AdminOrdersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const sp = await searchParams;
  const result = await getAdminOrders({
    search: sp.search ?? "",
    status: sp.status ?? "all",
    page: Number(sp.page) || 1,
    limit: 25,
  });

  const buildPageHref = (nextPage: number) => {
    const q = new URLSearchParams();
    if (sp.search) q.set("search", sp.search);
    if (sp.status && sp.status !== "all") q.set("status", sp.status);
    q.set("page", String(nextPage));
    return `/admin/orders?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeading
          title={`Platform Orders (${result.total})`}
          subtitle="Monitor marketplace purchase orders, commercial commitments, offline settlements, and fulfillment."
        />
      </div>

      {/* Search & Filter Controls */}
      <Card>
        <CardBody className="p-4">
          <form method="GET" action="/admin/orders" className="flex flex-wrap items-center gap-3">
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
                href="/admin/orders"
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Clear Filters
              </Link>
            )}
          </form>
        </CardBody>
      </Card>

      {/* Orders Table */}
      {result.orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No purchase orders match your filter criteria."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 border-b border-stone-200">Order #</th>
                <th className="p-3.5 border-b border-stone-200">Date</th>
                <th className="p-3.5 border-b border-stone-200">Buyer</th>
                <th className="p-3.5 border-b border-stone-200">Supplier</th>
                <th className="p-3.5 border-b border-stone-200">Amount</th>
                <th className="p-3.5 border-b border-stone-200">Status</th>
                <th className="p-3.5 border-b border-stone-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {result.orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-stone-50/50">
                  <td className="p-3.5 font-bold font-mono text-stone-900">{ord.orderNumber}</td>
                  <td className="p-3.5 text-stone-500">{formatShortDate(ord.createdAt)}</td>
                  <td className="p-3.5 text-stone-800 font-medium">{ord.buyerFullName}</td>
                  <td className="p-3.5 text-stone-800 font-medium">{ord.sellerBusinessName}</td>
                  <td className="p-3.5 font-bold font-mono text-amber-900">
                    {formatMoneyAmount(ord.totalAmount, ord.currency)}
                  </td>
                  <td className="p-3.5">
                    <OrderStatusBadge status={ord.status} />
                  </td>
                  <td className="p-3.5 text-right">
                    <Link
                      href={`/admin/orders/${ord.id}`}
                      className="inline-flex rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-stone-800"
                    >
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
  );
}
