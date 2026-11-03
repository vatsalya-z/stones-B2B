import Link from "next/link";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminSellers } from "@/features/admin/queries";
import { AdminFilters } from "@/components/admin/admin-filters";
import { SellerStatusBadge } from "@/components/admin/status-badges";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

interface SellersPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function AdminSellersPage({ searchParams }: SellersPageProps) {
  const ctx = await getAdminContext();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = params.status || "all";
  const search = params.search || "";

  const { sellers, total, totalPages } = await getAdminSellers(
    { page, limit: 15, status, search },
    ctx,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Seller Administration</h1>
          <p className="mt-1 text-xs text-stone-400">
            Verify B2B supplier onboarding, GST/PAN documentation, and platform access status.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-mono">
          Total Suppliers: <span className="text-white font-bold">{total}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <AdminFilters
        searchPlaceholder="Search company, GSTIN, city or state..."
        filters={[
          {
            key: "status",
            label: "Verification Status",
            defaultValue: "all",
            options: [
              { label: "All Statuses", value: "all" },
              { label: "Pending Review", value: "submitted" },
              { label: "Under Review", value: "under_review" },
              { label: "Verified", value: "verified" },
              { label: "Rejected", value: "rejected" },
              { label: "Suspended", value: "suspended" },
              { label: "Draft", value: "draft" },
            ],
          },
        ]}
      />

      {/* Sellers Table */}
      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Business / Legal Name</th>
                <th className="py-3.5 px-4 font-semibold">Location</th>
                <th className="py-3.5 px-4 font-semibold">GSTIN / PAN</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Registered</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {sellers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-stone-500">
                    No suppliers match the current criteria.
                  </td>
                </tr>
              ) : (
                sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{s.business_name}</div>
                      {s.owner_name && (
                        <div className="text-[11px] text-stone-400">Owner: {s.owner_name}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.city ? `${s.city}, ${s.state || "India"}` : "Not specified"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div>{s.gst_number || "—"}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <SellerStatusBadge status={s.verification_status} />
                    </td>
                    <td className="py-3.5 px-4 text-stone-400">
                      {new Date(s.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/sellers/${s.id}`}
                        className="inline-flex items-center rounded-lg border border-stone-700 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-200 hover:border-amber-500/50 hover:bg-stone-700 hover:text-white transition-colors"
                      >
                        Inspect & Review →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} totalPages={totalPages} baseUrl="/admin/sellers" />
        </div>
      )}
    </div>
  );
}
