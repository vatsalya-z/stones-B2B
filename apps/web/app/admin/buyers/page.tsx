import Link from "next/link";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminBuyers } from "@/features/admin/queries";
import { AdminFilters } from "@/components/admin/admin-filters";
import { AccountStatusBadge } from "@/components/admin/status-badges";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

interface BuyersPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function AdminBuyersPage({ searchParams }: BuyersPageProps) {
  const ctx = await getAdminContext();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = params.status || "all";
  const search = params.search || "";

  const { buyers, total, totalPages } = await getAdminBuyers(
    { page, limit: 15, status, search },
    ctx,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Buyer Administration</h1>
          <p className="mt-1 text-xs text-stone-400">
            Monitor registered buyers, architectural contractors, company details & account states.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-mono">
          Total Buyers: <span className="text-white font-bold">{total}</span>
        </div>
      </div>

      <AdminFilters
        searchPlaceholder="Search buyer name, company, email..."
        filters={[
          {
            key: "status",
            label: "Account Status",
            defaultValue: "all",
            options: [
              { label: "All Account States", value: "all" },
              { label: "Active", value: "active" },
              { label: "Suspended", value: "suspended" },
            ],
          },
        ]}
      />

      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Buyer Name</th>
                <th className="py-3.5 px-4 font-semibold">Company / Firm</th>
                <th className="py-3.5 px-4 font-semibold">Contact</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold">Registered</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-stone-500">
                    No buyers found matching criteria.
                  </td>
                </tr>
              ) : (
                buyers.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">{b.full_name || "Anonymous Buyer"}</td>
                    <td className="py-3.5 px-4 text-stone-300">
                      {b.city ? `${b.city}, ${b.state || "India"}` : "Individual"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div>{b.email}</div>
                      <div className="text-stone-500">{b.phone || ""}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <AccountStatusBadge status={b.account_status} />
                    </td>
                    <td className="py-3.5 px-4 text-stone-400 font-mono text-[11px]">
                      {new Date(b.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/buyers/${b.id}`}
                        className="inline-flex items-center rounded-lg border border-stone-700 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-200 hover:border-amber-500/50 hover:bg-stone-700 hover:text-white transition-colors"
                      >
                        Inspect Buyer →
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
          <Pagination page={page} totalPages={totalPages} baseUrl="/admin/buyers" />
        </div>
      )}
    </div>
  );
}
