import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminBuyerDetail } from "@/features/admin/queries";
import { AccountStatusBadge, RoleBadge, EnquiryStatusBadge } from "@/components/admin/status-badges";
import { BuyerActionsPanel } from "./buyer-actions-panel";

export const dynamic = "force-dynamic";

interface BuyerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBuyerDetailPage({ params }: BuyerDetailPageProps) {
  const ctx = await getAdminContext();
  const { id } = await params;

  const data = await getAdminBuyerDetail(id, ctx);
  if (!data) {
    notFound();
  }

  const { buyer, roles, enquiries, auditHistory } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/buyers"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Buyers
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {buyer.full_name || "Buyer Profile"}
              </h1>
              <AccountStatusBadge status={buyer.account_status} />
              <div className="flex gap-1">
                {roles.map((r) => (
                  <RoleBadge key={r} role={r} />
                ))}
              </div>
            </div>
            <p className="mt-1 text-xs text-stone-400 font-mono">
              User ID: {buyer.id} • Registered {new Date(buyer.created_at).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Account Status Action Panel */}
      <BuyerActionsPanel userId={buyer.id} accountStatus={buyer.account_status} />

      {/* Profile and Contact Information */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
          Buyer & Company Profile
        </h2>

        <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <div>
            <dt className="text-stone-500">Full Name</dt>
            <dd className="mt-0.5 font-medium text-stone-200">{buyer.full_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Email Address</dt>
            <dd className="mt-0.5 font-mono font-medium text-stone-200">{buyer.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Phone</dt>
            <dd className="mt-0.5 font-mono font-medium text-stone-200">{buyer.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Location</dt>
            <dd className="mt-0.5 font-medium text-stone-200">
              {[buyer.city, buyer.state, buyer.country].filter(Boolean).join(", ") || "India"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Account Status</dt>
            <dd className="mt-0.5">
              <AccountStatusBadge status={buyer.account_status} />
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Total Enquiries Placed</dt>
            <dd className="mt-0.5 font-bold text-white">{enquiries.length}</dd>
          </div>
        </dl>
      </div>

      {/* Buyer's Enquiries & RFQ Activity */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <h2 className="text-sm font-semibold text-white">Enquiries & RFQs Placed</h2>
          <span className="text-xs text-stone-400 font-mono">{enquiries.length} record(s)</span>
        </div>

        <div className="mt-4 divide-y divide-stone-800">
          {enquiries.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">No enquiries submitted by this buyer.</p>
          ) : (
            enquiries.map((enq) => {
              const isRfq = !enq.product_id;
              const quotesCount = enq.quotations_count;

              return (
                <div key={enq.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {isRfq ? "Custom Architectural RFQ" : enq.product_name || "Product Enquiry"}
                      </span>
                      <span className="rounded bg-stone-800 px-1.5 py-0.2 text-[10px] text-stone-400 uppercase font-mono">
                        {isRfq ? "RFQ" : "Direct"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      To: {enq.seller_name} • {enq.quantity}{" "}
                      {enq.unit} • {new Date(enq.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-stone-400 text-[11px] font-mono">
                      {quotesCount} {quotesCount === 1 ? "quote" : "quotes"}
                    </span>
                    <EnquiryStatusBadge status={enq.status} />
                    <Link
                      href={`/admin/enquiries/${enq.id}`}
                      className="rounded-lg bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-200 hover:text-white"
                    >
                      Audit →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Audit History */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
          Account Governance History
        </h2>

        <div className="mt-4 divide-y divide-stone-800 max-h-60 overflow-y-auto">
          {auditHistory.length === 0 ? (
            <p className="py-4 text-center text-xs text-stone-500">No account audit logs found.</p>
          ) : (
            auditHistory.map((item) => (
              <div key={item.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-amber-400">{item.action}</span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {new Date(item.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-stone-400 font-mono">
                  by {item.actor?.email || item.admin_user_id || "System"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
