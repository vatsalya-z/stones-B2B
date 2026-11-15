import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminEnquiryDetail } from "@/features/admin/queries";
import { EnquiryStatusBadge, QuotationStatusBadge } from "@/components/admin/status-badges";

export const dynamic = "force-dynamic";

const UNIT_LABELS: Record<string, string> = {
  sq_ft: "Sq. Ft.",
  sq_m: "Sq. Meter",
  piece: "Piece",
  ton: "Ton",
  metric_ton: "Metric Ton (MT)",
  slab: "Slab",
  box: "Box / Crate",
  custom: "Custom Unit",
};

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
  const specs = (enquiry.specifications as Record<string, any>) || {};
  const unitLabel = (typeof enquiry.unit === "string" && UNIT_LABELS[enquiry.unit]) || enquiry.unit?.replace(/_/g, " ") || "units";

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
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono ${
                  isRfq
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-stone-800 text-stone-400 border border-stone-700"
                }`}
              >
                {isRfq ? "REQUEST A QUOTATION (RFQ)" : "PRODUCT DIRECT ENQUIRY"}
              </span>
              <EnquiryStatusBadge status={enquiry.status} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {isRfq ? "Request Custom Stone Quotation" : `Direct Enquiry: ${product?.name || "Product"}`}
            </h1>

            <p className="text-xs sm:text-sm text-stone-400">
              {isRfq
                ? "Share your stone requirements and get competitive quotes from verified suppliers."
                : "Direct manufacturer stone requirement submitted from product catalogue."}
            </p>

            <p className="text-[11px] text-stone-500 font-mono pt-0.5">
              Enquiry ID: {enquiry.id} • Created {new Date(enquiry.created_at).toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 font-medium">
            Read-Only Audit Mode
          </div>
        </div>
      </div>

      {/* Buyer Information Card */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <h2 className="text-sm font-semibold text-white">Buyer Information</h2>
          {buyer && buyer.id !== "guest" && (
            <Link
              href={`/admin/buyers/${buyer.id}`}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              Inspect Buyer Profile →
            </Link>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div>
            <dt className="text-stone-500">Buyer Name</dt>
            <dd className="mt-0.5 font-medium text-stone-200">{buyer?.full_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Location</dt>
            <dd className="mt-0.5 font-medium text-stone-200">
              {[buyer?.city, buyer?.state].filter(Boolean).join(", ") || enquiry.delivery_location || "India"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Email Address</dt>
            <dd className="mt-0.5 font-mono text-stone-200">{buyer?.email || enquiry.guest_email || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Contact Phone</dt>
            <dd className="mt-0.5 font-mono text-stone-200">
              {buyer?.phone ||
                enquiry.guest_phone ||
                (enquiry.specifications as Record<string, any>)?.buyer_phone ||
                (enquiry.specifications as Record<string, any>)?.contact_phone ||
                "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Stone & Quantity Specifications Card */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white">
              Stone &amp; Quantity Specifications
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Provide exact architectural BOQ requirements
            </p>
          </div>
          {isRfq && (
            <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
              Architectural BOQ
            </span>
          )}
        </div>

        <div className="mt-5 space-y-4 text-xs">
          {/* Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Stone Material Category</span>
              <p className="mt-1 text-sm font-semibold text-white">
                {specs.material_type || (isRfq ? "Natural Stone" : product?.name || "—")}
              </p>
            </div>

            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Stone Variety / Colour / Code</span>
              <p className="mt-1 text-sm font-semibold text-stone-200">
                {specs.stone_variety || "Standard Variety / Open"}
              </p>
            </div>

            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Required Quantity</span>
              <p className="mt-1 text-sm font-bold font-mono text-white">
                {Number(enquiry.quantity).toLocaleString("en-IN")} {unitLabel}
              </p>
            </div>

            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Slab Thickness</span>
              <p className="mt-1 text-sm font-medium text-stone-200">
                {specs.thickness || "Standard (18mm - 20mm)"}
              </p>
            </div>

            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Surface Finish</span>
              <p className="mt-1 text-sm font-medium text-stone-200">
                {specs.finish || "Mirror Polished"}
              </p>
            </div>

            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Dimensions / Cut-to-Size Formats</span>
              <p className="mt-1 text-sm font-medium text-stone-200">
                {specs.dimensions || "Gangsaw Jumbo Slabs / Standard Formats"}
              </p>
            </div>

            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Delivery Location</span>
              <p className="mt-1 text-sm font-medium text-stone-200">
                {enquiry.delivery_location || specs.delivery_location || "To be discussed"}
              </p>
            </div>

            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Buyer Mobile Number</span>
              <p className="mt-1 text-sm font-mono font-semibold text-amber-400">
                {buyer?.phone || enquiry.guest_phone || specs.buyer_phone || specs.contact_phone || "—"}
              </p>
            </div>

            <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
              <span className="text-stone-500 text-[11px] block">Target Delivery Date</span>
              <p className="mt-1 text-sm font-medium text-stone-200">
                {enquiry.required_delivery_date
                  ? new Date(enquiry.required_delivery_date).toLocaleDateString("en-IN")
                  : specs.required_delivery_date
                    ? new Date(specs.required_delivery_date).toLocaleDateString("en-IN")
                    : "Flexible / As Per Project"}
              </p>
            </div>
          </div>

          {/* Project Notes & BOQ Description */}
          <div>
            <span className="text-stone-500 text-[11px] block mb-1">
              Project Description, Veining Preferences &amp; BOQ Notes
            </span>
            <div className="whitespace-pre-wrap rounded-lg border border-stone-800 bg-stone-950 p-4 font-mono text-[11px] leading-relaxed text-stone-300">
              {enquiry.description || specs.project_notes || "Commercial natural stone requirement with standard architectural BOQ specifications."}
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <span className="text-stone-500 text-[11px] block mb-2">
                Buyer Uploaded Drawings / BOQ Files
              </span>
              <div className="flex flex-wrap gap-2">
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
