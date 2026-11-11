import Link from "next/link";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminQuotations } from "@/features/admin/queries";
import { AdminFilters } from "@/components/admin/admin-filters";
import { QuotationStatusBadge } from "@/components/admin/status-badges";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

interface QuotationsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function AdminQuotationsPage({ searchParams }: QuotationsPageProps) {
  const ctx = await getAdminContext();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = params.status || "all";
  const search = params.search || "";

  const { quotations, total, totalPages } = await getAdminQuotations(
    { page, limit: 15, status, search },
    ctx,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Quotation Oversight</h1>
          <p className="mt-1 text-xs text-stone-400">
            Strictly read-only monitoring of supplier commercial offers, pricing transparency, and acceptance rates.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-mono">
          Total Quotes: <span className="text-white font-bold">{total}</span>
        </div>
      </div>

      <AdminFilters
        searchPlaceholder="Search quotation number..."
        filters={[
          {
            key: "status",
            label: "Quotation Status",
            defaultValue: "all",
            options: [
              { label: "All Statuses", value: "all" },
              { label: "Sent to Buyer", value: "sent" },
              { label: "Accepted", value: "accepted" },
              { label: "Rejected", value: "rejected" },
              { label: "Expired", value: "expired" },
              { label: "Draft", value: "draft" },
            ],
          },
        ]}
      />

      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Quote Number</th>
                <th className="py-3.5 px-4 font-semibold">Supplier</th>
                <th className="py-3.5 px-4 font-semibold">Buyer</th>
                <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Validity</th>
                <th className="py-3.5 px-4 font-semibold text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-stone-500">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      #{q.quote_number}
                    </td>
                    <td className="py-3.5 px-4">
                      {q.seller_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{q.buyer?.full_name || "Buyer"}</div>
                      <div className="text-[11px] text-stone-500">
                        {q.buyer?.email || "—"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                      ₹{Number(q.total_amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      <QuotationStatusBadge status={q.status} />
                    </td>
                    <td className="py-3.5 px-4 text-stone-400 font-mono text-[11px]">
                      {q.valid_until ? new Date(q.valid_until).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/quotes/${q.id}`}
                        className="inline-flex items-center rounded-lg border border-stone-700 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-200 hover:border-amber-500/50 hover:bg-stone-700 hover:text-white transition-colors"
                      >
                        Inspect Terms →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} totalPages={totalPages} baseUrl="/admin/quotes" />
        </div>
      )}
    </div>
  );
}
