import { getAdminContext } from "@/features/admin/guard";
import { getAdminAuditLogs } from "@/features/admin/queries";
import { AdminFilters } from "@/components/admin/admin-filters";
import { Pagination } from "@/components/ui/pagination";
import { AuditClient, type AuditLogRow } from "./audit-client";

export const dynamic = "force-dynamic";

interface AuditPageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entityType?: string;
    search?: string;
  }>;
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const ctx = await getAdminContext();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const action = params.action || "all";
  const entityType = params.entityType || "all";
  const search = params.search || "";

  const { logs, total, totalPages } = await getAdminAuditLogs(
    { page, limit: 20, action, entityType, search },
    ctx,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Governance Audit Trail</h1>
          <p className="mt-1 text-xs text-stone-400">
            Immutable, append-only security logs of all administrative reviews, moderation, role grants, and settings.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-mono">
          Total Audit Events: <span className="text-white font-bold">{total}</span>
        </div>
      </div>

      <AdminFilters
        searchPlaceholder="Filter action name e.g. seller.review, product.moderate..."
        filters={[
          {
            key: "entityType",
            label: "Entity Type",
            defaultValue: "all",
            options: [
              { label: "All Entity Types", value: "all" },
              { label: "Seller Profile", value: "seller_profile" },
              { label: "Product", value: "product" },
              { label: "Category", value: "category" },
              { label: "User", value: "user" },
              { label: "Platform Setting", value: "platform_setting" },
            ],
          },
        ]}
      />

      <AuditClient logs={logs as unknown as AuditLogRow[]} />

      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} totalPages={totalPages} baseUrl="/admin/audit" />
        </div>
      )}
    </div>
  );
}
