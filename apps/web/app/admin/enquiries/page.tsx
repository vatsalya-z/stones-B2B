import Link from "next/link";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminEnquiries } from "@/features/admin/queries";
import { AdminFilters } from "@/components/admin/admin-filters";
import { EnquiryStatusBadge } from "@/components/admin/status-badges";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

interface EnquiriesPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    type?: "all" | "rfq" | "direct";
    search?: string;
  }>;
}

export default async function AdminEnquiriesPage({ searchParams }: EnquiriesPageProps) {
  const ctx = await getAdminContext();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = params.status || "all";
  const type = params.type || "all";
  const search = params.search || "";

  const { enquiries, total, totalPages } = await getAdminEnquiries(
    { page, limit: 15, status, type, search },
    ctx,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Enquiries & RFQ Monitoring</h1>
          <p className="mt-1 text-xs text-stone-400">
            Read-only platform oversight for architectural RFQs and direct stone enquiries.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-mono">
          Total Enquiries: <span className="text-white font-bold">{total}</span>
        </div>
      </div>

      <AdminFilters
        searchPlaceholder="Search enquiry details, specifications..."
        filters={[
          {
            key: "type",
            label: "Enquiry Type",
            defaultValue: "all",
            options: [
              { label: "All Types", value: "all" },
              { label: "Custom RFQ", value: "rfq" },
              { label: "Direct Product Enquiry", value: "direct" },
            ],
          },
          {
            key: "status",
            label: "Status",
            defaultValue: "all",
            options: [
              { label: "All Statuses", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Quoted", value: "quoted" },
              { label: "Closed", value: "closed" },
              { label: "Rejected", value: "rejected" },
            ],
          },
        ]}
      />

      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Type & Requirement</th>
                <th className="py-3.5 px-4 font-semibold">Buyer</th>
                <th className="py-3.5 px-4 font-semibold">Seller</th>
                <th className="py-3.5 px-4 font-semibold">Quantity</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-stone-500">
                    No enquiries found.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => {
                  const isRfq = !enq.product_id;
                  const quotesCount = enq.quotes_count;

                  return (
                    <tr key={enq.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {isRfq ? "Custom Architectural RFQ" : enq.product?.name || "Product Enquiry"}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase font-mono ${
                              isRfq
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                                : "bg-stone-800 text-stone-400"
                            }`}
                          >
                            {isRfq ? "RFQ" : "Product"}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-[11px] text-stone-500">
                          {enq.description}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-200">
                          {enq.buyer?.full_name || "Buyer"}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {[enq.buyer?.city, enq.buyer?.state].filter(Boolean).join(", ") || "Direct Buyer"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-300">
                        {enq.seller_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {enq.quantity} {enq.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        <EnquiryStatusBadge status={enq.status} />
                        {quotesCount > 0 && (
                          <div className="mt-0.5 text-[10px] text-stone-500 font-mono">
                            {quotesCount} {quotesCount === 1 ? "quote" : "quotes"}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-400 font-mono text-[11px]">
                        {new Date(enq.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/enquiries/${enq.id}`}
                          className="inline-flex items-center rounded-lg border border-stone-700 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-200 hover:border-amber-500/50 hover:bg-stone-700 hover:text-white transition-colors"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} totalPages={totalPages} baseUrl="/admin/enquiries" />
        </div>
      )}
    </div>
  );
}
