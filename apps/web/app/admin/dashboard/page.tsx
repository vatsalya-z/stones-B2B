import Link from "next/link";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminDashboardData } from "@/features/admin/queries";
import { MetricCard } from "@/components/admin/metric-card";
import {
  SellerStatusBadge,
  ProductModerationBadge,
  AccountStatusBadge,
  RoleBadge,
} from "@/components/admin/status-badges";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const ctx = await getAdminContext();
  const { metrics, recentRegistrations, recentAuditLogs, pendingSellers, pendingProducts } =
    await getAdminDashboardData(ctx);

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Administrator Overview</h1>
          <p className="mt-1 text-xs text-stone-400">
            Real-time platform governance, seller verifications, catalogue moderation & activity logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900 px-3 py-1.5 text-[11px] font-mono text-stone-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live DB Sync
          </span>
          <Link
            href="/admin/reports"
            className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-700 hover:text-white"
          >
            Analytics & Reports →
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metrics.users.toLocaleString("en-IN")}
          deltaText={`+${metrics.users_7d} in last 7 days`}
          deltaType={metrics.users_7d > 0 ? "positive" : "neutral"}
          subtitle={`${metrics.buyers} buyers, ${metrics.seller_accounts} sellers`}
          accent="blue"
          href="/admin/users"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Verified Sellers"
          value={metrics.sellers_verified.toLocaleString("en-IN")}
          deltaText={metrics.sellers_pending > 0 ? `${metrics.sellers_pending} pending verification` : "All verified"}
          deltaType={metrics.sellers_pending > 0 ? "negative" : "positive"}
          subtitle={`${metrics.sellers} total registered`}
          accent="amber"
          href="/admin/sellers"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          }
        />

        <MetricCard
          title="Approved Products"
          value={metrics.products_approved.toLocaleString("en-IN")}
          deltaText={metrics.products_pending > 0 ? `${metrics.products_pending} waiting moderation` : "Queue clear"}
          deltaType={metrics.products_pending > 0 ? "negative" : "positive"}
          subtitle={`${metrics.products} total products`}
          accent="emerald"
          href="/admin/products"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        />

        <MetricCard
          title="Enquiries & RFQs"
          value={metrics.enquiries.toLocaleString("en-IN")}
          deltaText={`${metrics.rfqs} custom RFQs`}
          deltaType="neutral"
          subtitle={`${metrics.quotations} quotes (${metrics.quotations_accepted} accepted)`}
          accent="purple"
          href="/admin/enquiries"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          }
        />
      </div>

      {/* Action Queues Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Seller Approvals Queue */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Pending Seller Verifications</h2>
              {pendingSellers.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  {metrics.sellers_pending}
                </span>
              )}
            </div>
            <Link
              href="/admin/sellers?status=submitted"
              className="text-xs text-amber-500 hover:text-amber-400 font-medium"
            >
              View All ({metrics.sellers_pending}) →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-stone-800">
            {pendingSellers.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">
                No seller verifications pending review.
              </p>
            ) : (
              pendingSellers.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-xs font-medium text-white">{s.business_name}</p>
                    <p className="text-[11px] text-stone-400">
                      {s.city || "India"}, {s.state || ""} • {new Date(s.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SellerStatusBadge status={s.verification_status} />
                    <Link
                      href={`/admin/sellers/${s.id}`}
                      className="rounded-lg bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-200 hover:bg-amber-600 hover:text-white transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Product Approvals Queue */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Pending Product Moderation</h2>
              {pendingProducts.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  {metrics.products_pending}
                </span>
              )}
            </div>
            <Link
              href="/admin/products?status=pending_review"
              className="text-xs text-amber-500 hover:text-amber-400 font-medium"
            >
              View All ({metrics.products_pending}) →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-stone-800">
            {pendingProducts.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">
                No products waiting for moderation.
              </p>
            ) : (
              pendingProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="truncate text-xs font-medium text-white">{p.name}</p>
                    <p className="truncate text-[11px] text-stone-400">
                      by {p.seller_name} • {new Date(p.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProductModerationBadge status={p.moderation_status} />
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="rounded-lg bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-200 hover:bg-amber-600 hover:text-white transition-colors"
                    >
                      Moderate
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity & Registrations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Audit Activity */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-white">Recent Admin Activity</h2>
            <Link href="/admin/audit" className="text-xs text-amber-500 hover:text-amber-400 font-medium">
              Full Audit Trail →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-stone-800">
            {recentAuditLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">No recent audit log entries.</p>
            ) : (
              recentAuditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-amber-400 font-semibold">{log.action}</span>
                    <span className="ml-2 text-stone-400">on {log.entity_type}</span>
                    <p className="text-[11px] text-stone-500 font-mono">
                      by {log.actor?.email || "Admin"} • {new Date(log.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-400 font-mono">
                    {log.entity_id ? log.entity_id.slice(0, 8) : "global"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-white">Recent User Registrations</h2>
            <Link href="/admin/users" className="text-xs text-amber-500 hover:text-amber-400 font-medium">
              Manage Users →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-stone-800">
            {recentRegistrations.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">No users found.</p>
            ) : (
              recentRegistrations.map((u) => {
                const roles = u.roles ?? [];
                return (
                  <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-white">{u.full_name || "New User"}</p>
                      <p className="text-[11px] text-stone-400 font-mono">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {roles.map((r) => (
                          <RoleBadge key={r} role={r} />
                        ))}
                      </div>
                      <AccountStatusBadge status={u.account_status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
