import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminSellerDetail } from "@/features/admin/queries";
import {
  SellerStatusBadge,
  ProductModerationBadge,
  AccountStatusBadge,
} from "@/components/admin/status-badges";
import {
  SellerActionsPanel,
  DocumentReviewButtons,
} from "./seller-actions-panel";

export const dynamic = "force-dynamic";

interface SellerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSellerDetailPage({ params }: SellerDetailPageProps) {
  const ctx = await getAdminContext();
  const { id } = await params;

  const data = await getAdminSellerDetail(id, ctx);
  if (!data) {
    notFound();
  }

  const { seller, user, documents, recentProducts, totalEnquiries, auditHistory } = data;

  return (
    <div className="space-y-8">
      {/* Back link & Header */}
      <div>
        <Link
          href="/admin/sellers"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sellers
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{seller.business_name}</h1>
              <SellerStatusBadge status={seller.verification_status} />
              <AccountStatusBadge status={user?.account_status || "active"} />
            </div>
            <p className="mt-1 text-xs text-stone-400 font-mono">
              Seller ID: {seller.id} • Registered {new Date(seller.created_at).toLocaleDateString("en-IN")}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-stone-300">
              Products: <span className="font-bold text-white">{recentProducts.length}</span>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-stone-300">
              Enquiries: <span className="font-bold text-white">{totalEnquiries}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Moderation Actions Panel */}
      <SellerActionsPanel
        sellerId={seller.id}
        userId={seller.user_id}
        currentStatus={seller.verification_status}
        accountStatus={user?.account_status || "active"}
      />

      {/* Verification Reason / Rejection Notice if present */}
      {seller.verification_reason && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold text-amber-400">Moderator Note / Verification Feedback:</p>
          <p className="mt-1 text-xs text-amber-200">{seller.verification_reason}</p>
        </div>
      )}

      {/* Business Information Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Company & Tax Details */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
            Business & Tax Registration
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-xs">
            <div>
              <dt className="text-stone-500">Business Name</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{seller.business_name}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Owner / Director Name</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{seller.owner_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Business Type</dt>
              <dd className="mt-0.5 font-medium text-stone-200 capitalize">
                {seller.business_type?.replace(/_/g, " ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">GST Number</dt>
              <dd className="mt-0.5 font-mono font-medium text-stone-200">{seller.gst_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">City & State</dt>
              <dd className="mt-0.5 font-medium text-stone-200">
                {seller.city ? `${seller.city}, ${seller.state || "India"}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">PIN Code</dt>
              <dd className="mt-0.5 font-mono font-medium text-stone-200">{seller.pincode || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-500">Business Address</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{seller.business_address || "—"}</dd>
            </div>
          </dl>
        </div>

        {/* User Account & Contact */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
            Primary Contact & User Account
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-xs">
            <div>
              <dt className="text-stone-500">Contact Person Name</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{user?.full_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Account Email</dt>
              <dd className="mt-0.5 font-mono font-medium text-stone-200">{user?.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Primary Phone</dt>
              <dd className="mt-0.5 font-mono font-medium text-stone-200">{seller.phone || user?.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Account Status</dt>
              <dd className="mt-0.5">
                <AccountStatusBadge status={user?.account_status || "active"} />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-500">Company Bio / Description</dt>
              <dd className="mt-0.5 leading-relaxed text-stone-300">{seller.description || "No bio provided."}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Verification Documents Table */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <h2 className="text-sm font-semibold text-white">Submitted Compliance Documents</h2>
          <span className="text-xs text-stone-400 font-mono">{documents.length} document(s)</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Document Type</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Uploaded</th>
                <th className="py-2.5 px-3 font-semibold">File Access</th>
                <th className="py-2.5 px-3 font-semibold text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-stone-500">
                    No verification documents uploaded.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-stone-800/40">
                    <td className="py-3 px-3 font-medium text-white capitalize">
                      {doc.document_type.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          doc.verification_status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : doc.verification_status === "rejected"
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {doc.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-400 font-mono text-[11px]">
                      {new Date(doc.uploaded_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3">
                      {doc.signedUrl ? (
                        <a
                          href={doc.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline"
                        >
                          <span>Secure View</span>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-stone-500">No URL</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <DocumentReviewButtons documentId={doc.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seller's Products & Audit History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Products */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-white">Catalogue Products</h2>
            <Link
              href={`/admin/products?sellerId=${seller.id}`}
              className="text-xs text-amber-500 hover:text-amber-400 font-medium"
            >
              View All ({recentProducts.length}) →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-stone-800">
            {recentProducts.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">No products uploaded yet.</p>
            ) : (
              recentProducts.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium text-white hover:text-amber-400"
                    >
                      {p.name}
                    </Link>
                    <p className="text-[11px] text-stone-400">
                      {p.category_name}
                    </p>
                  </div>
                  <ProductModerationBadge status={p.moderation_status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit History */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-white">Seller Audit History</h2>
            <span className="text-[11px] text-stone-500 font-mono">Immutable</span>
          </div>

          <div className="mt-4 divide-y divide-stone-800 max-h-80 overflow-y-auto">
            {auditHistory.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">No audit events recorded.</p>
            ) : (
              auditHistory.map((item) => (
                <div key={item.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-amber-400">{item.action}</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {new Date(item.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400 font-mono">
                    by {item.actor?.email || "System"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
