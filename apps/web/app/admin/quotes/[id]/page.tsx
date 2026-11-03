import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminQuotationDetail } from "@/features/admin/queries";
import { QuotationStatusBadge } from "@/components/admin/status-badges";

export const dynamic = "force-dynamic";

interface QuotationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminQuotationDetailPage({ params }: QuotationDetailPageProps) {
  const ctx = await getAdminContext();
  const { id } = await params;

  const data = await getAdminQuotationDetail(id, ctx);
  if (!data) {
    notFound();
  }

  const { quotation, seller, buyer, enquiry, items } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/quotes"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Quotations
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
                Quotation #{quotation.quote_number}
              </h1>
              <QuotationStatusBadge status={quotation.status} />
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Generated {new Date(quotation.created_at).toLocaleString("en-IN")} • Valid until{" "}
              {quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString("en-IN") : "No expiry"}
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 font-medium">
            Strictly Read-Only Monitor
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Supplier */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-white">Quoting Supplier</h2>
            {seller && (
              <Link href={`/admin/sellers/${seller.id}`} className="text-xs text-amber-500 hover:text-amber-400">
                Supplier Profile →
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <p className="font-medium text-white">{seller?.business_name}</p>
            <p className="text-stone-400">Owner: {seller?.owner_name || "—"}</p>
            <p className="font-mono text-stone-400">GSTIN: {seller?.gst_number || "—"}</p>
            <p className="text-stone-400">
              {seller?.city ? `${seller.city}, ${seller.state || "India"}` : "—"}
            </p>
          </div>
        </div>

        {/* Buyer */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-white">Recipient Buyer</h2>
            {buyer && (
              <Link href={`/admin/buyers/${buyer.id}`} className="text-xs text-amber-500 hover:text-amber-400">
                Buyer Profile →
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <p className="font-medium text-white">{buyer?.full_name}</p>
            <p className="font-mono text-stone-400">{buyer?.email}</p>
            <p className="font-mono text-stone-400">{buyer?.phone || "—"}</p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
          Commercial Line Items
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Item Description</th>
                <th className="py-2.5 px-3 font-semibold">Quantity</th>
                <th className="py-2.5 px-3 font-semibold">Unit Price</th>
                <th className="py-2.5 px-3 font-semibold text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-3 font-medium text-white">{item.description}</td>
                  <td className="py-3 px-3 font-mono">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    ₹{Number(item.unit_price).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3 font-mono text-right font-semibold text-stone-100">
                    ₹{Number(item.total_price).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="mt-6 border-t border-stone-800 pt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Subtotal</span>
              <span className="font-mono text-stone-200">
                ₹{Number(quotation.subtotal).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>GST / Applicable Taxes</span>
              <span className="font-mono text-stone-200">
                ₹{Number(quotation.tax_amount).toLocaleString("en-IN")}
              </span>
            </div>
            {Number(quotation.shipping_charges) > 0 && (
              <div className="flex justify-between text-stone-400">
                <span>Freight / Shipping</span>
                <span className="font-mono text-stone-200">
                  ₹{Number(quotation.shipping_charges).toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-800 pt-2 text-sm font-bold text-white">
              <span>Total Quotation</span>
              <span className="font-mono text-emerald-400">
                ₹{Number(quotation.total_amount).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Commercial Terms & Enquiry Link */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-sm font-semibold text-white border-b border-stone-800 pb-3">
          Commercial Terms & Conditions
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 text-xs">
          <div>
            <span className="text-stone-500">Terms & Delivery Conditions</span>
            <p className="mt-1 whitespace-pre-wrap rounded-lg border border-stone-800 bg-stone-950 p-3 font-mono text-stone-300 leading-relaxed">
              {quotation.terms || "Standard commercial terms apply. Ex-Works / Factory dispatch."}
            </p>
          </div>
          {enquiry && (
            <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
              <span className="text-stone-400">Linked Enquiry:</span>
              <Link
                href={`/admin/enquiries/${enquiry.id}`}
                className="text-amber-500 hover:text-amber-400 font-medium"
              >
                Inspect Associated Enquiry →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
