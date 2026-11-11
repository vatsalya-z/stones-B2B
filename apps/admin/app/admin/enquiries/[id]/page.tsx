import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminEnquiryDetail } from "@/features/admin/queries";
import { EnquiryStatusBadge, QuotationStatusBadge } from "@/components/admin/status-badges";

export const dynamic = "force-dynamic";

interface EnquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEnquiryDetailPage({ params }: EnquiryDetailPageProps) {
  const ctx = await getAdminContext();
  const { id } = await params;

  const data = await getAdminEnquiryDetail(id, ctx);
  if (!data) {
    notFound();
  }

  const { enquiry, quotations, attachments, buyer, seller, product } = data;
  const isRfq = !enquiry.product_id;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/enquiries"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Enquiries
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {isRfq ? "Architectural Request for Quotation (RFQ)" : `Direct Enquiry: ${product?.name || "Product"}`}
              </h1>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold uppercase font-mono ${
                  isRfq
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                    : "bg-stone-800 text-stone-400 border border-stone-700"
                }`}
              >
                {isRfq ? "RFQ" : "Product Direct"}
              </span>
              <EnquiryStatusBadge status={enquiry.status} />
            </div>
            <p className="mt-1 text-xs text-stone-400 font-mono">
              Enquiry ID: {enquiry.id} • Created {new Date(enquiry.created_at).toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 font-medium">
            Read-Only Audit Mode
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Buyer */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-white">Buyer Information</h2>
            {buyer && (
              <Link
                href={`/admin/buyers/${buyer.id}`}
                className="text-xs text-amber-500 hover:text-amber-400"
              >
                Inspect Buyer Profile →
              </Link>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-y-3 sm:grid-cols-2 text-xs">
            <div>
              <dt className="text-stone-500">Buyer Name</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{buyer?.full_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Location</dt>
              <dd className="mt-0.5 font-medium text-stone-200">
                {[buyer?.city, buyer?.state].filter(Boolean).join(", ") || "India"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Email Address</dt>
              <dd className="mt-0.5 font-mono text-stone-200">{buyer?.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Contact Phone</dt>
              <dd className="mt-0.5 font-mono text-stone-200">{buyer?.phone || "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Supplier */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-white">Target Supplier</h2>
            {seller && (
              <Link
                href={`/admin/sellers/${seller.id}`}
                className="text-xs text-amber-500 hover:text-amber-400"
              >
                Inspect Seller Profile →
              </Link>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-y-3 sm:grid-cols-2 text-xs">
            <div>
              <dt className="text-stone-500">Business Name</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{seller?.business_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Owner Name</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{seller?.owner_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Location</dt>
              <dd className="mt-0.5 text-stone-200">
                {seller?.city ? `${seller.city}, ${seller.state || "India"}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Catalogue Product</dt>
              <dd className="mt-0.5 font-medium text-stone-200">
                {product ? (
                  <Link href={`/admin/products/${product.id}`} className="hover:text-amber-400">
                    {product.name}
                  </Link>
                ) : (
                  "Custom Multi-Specification RFQ"
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Specification & Shipping */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
          Requirement Specifications
        </h2>
        <div className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-stone-500">Quantity Required</span>
              <p className="mt-0.5 text-base font-bold font-mono text-white">
                {enquiry.quantity} {enquiry.unit}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Delivery / Shipping Destination</span>
              <p className="mt-0.5 font-medium text-stone-200">{enquiry.delivery_location || "To be discussed"}</p>
            </div>
          </div>

          <div>
            <span className="text-stone-500">Technical Details / Cut-to-Size Specs</span>
            <div className="mt-1.5 whitespace-pre-wrap rounded-lg border border-stone-800 bg-stone-950 p-4 font-mono text-[11px] leading-relaxed text-stone-300">
              {enquiry.description}
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <span className="text-stone-500">Buyer Uploaded Drawings / BOQ Files</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.signedUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-xs text-stone-200 hover:border-amber-500 hover:text-white"
                  >
                    <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>{att.file_name}</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      ({(att.file_size / 1024).toFixed(0)} KB)
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generated Quotations */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <h2 className="text-sm font-semibold text-white">Commercial Quotations Submitted</h2>
          <span className="text-xs text-stone-400 font-mono">{quotations.length} quote(s)</span>
        </div>

        <div className="mt-4 divide-y divide-stone-800">
          {quotations.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No quotations submitted by supplier yet.
            </p>
          ) : (
            quotations.map((q) => (
              <div key={q.id} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">#{q.quote_number}</span>
                    <QuotationStatusBadge status={q.status} />
                  </div>
                  <p className="mt-1 text-stone-400">
                    Validity: {q.valid_until ? new Date(q.valid_until).toLocaleDateString("en-IN") : "No expiry"} • Terms: {q.terms || "Ex-Factory"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-emerald-400">
                      ₹{Number(q.total_amount).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      Subtotal: ₹{Number(q.subtotal).toLocaleString("en-IN")} + GST: ₹{Number(q.tax_amount).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <Link
                    href={`/admin/quotes/${q.id}`}
                    className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 font-medium text-stone-200 hover:text-white"
                  >
                    View Terms →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
