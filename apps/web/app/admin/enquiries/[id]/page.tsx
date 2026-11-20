import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Search,
  User,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  FileText,
  Paperclip,
} from "lucide-react";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminEnquiryDetail } from "@/features/admin/queries";
import { EnquiryStatusBadge, QuotationStatusBadge } from "@/components/admin/status-badges";

export const dynamic = "force-dynamic";

interface EnquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

interface EnquirySpecs {
  product_name?: string;
  material_type?: string;
  stone_variety?: string;
  buyer_name?: string;
  buyer_phone?: string;
  contact_phone?: string;
  phone?: string;
  buyer_email?: string;
  delivery_location?: string;
  project_notes?: string;
  [key: string]: unknown;
}

export default async function AdminEnquiryDetailPage({ params }: EnquiryDetailPageProps) {
  const ctx = await getAdminContext();
  const { id } = await params;

  const data = await getAdminEnquiryDetail(id, ctx);
  if (!data) {
    notFound();
  }

  const { enquiry, quotations, attachments, buyer, product } = data;
  const isRfq = !enquiry.product_id;
  const specs = (enquiry.specifications as EnquirySpecs) || {};

  const productName =
    specs.product_name ||
    specs.material_type ||
    specs.stone_variety ||
    enquiry.enquiry_title ||
    product?.name ||
    "Natural Stone";

  const buyerName =
    buyer?.full_name ||
    enquiry.guest_name ||
    specs.buyer_name ||
    "Stone Buyer";

  const buyerPhone =
    buyer?.phone ||
    enquiry.guest_phone ||
    specs.buyer_phone ||
    specs.contact_phone ||
    "—";

  const buyerEmail =
    buyer?.email ||
    enquiry.guest_email ||
    specs.buyer_email ||
    "—";

  const deliveryLocation =
    enquiry.delivery_location ||
    specs.delivery_location ||
    [buyer?.city, buyer?.state].filter(Boolean).join(", ") ||
    "—";

  const projectNotes = enquiry.description || specs.project_notes || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/enquiries"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Enquiries
        </Link>

        <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider font-mono ${
                  isRfq
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-stone-800 text-stone-400 border border-stone-700"
                }`}
              >
                {isRfq ? "REQUEST A QUOTATION (RFQ)" : "PRODUCT DIRECT ENQUIRY"}
              </span>
              <EnquiryStatusBadge status={enquiry.status} />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {isRfq ? "Request Custom Stone Quotation" : `Direct Enquiry: ${product?.name || "Product"}`}
            </h1>

            <p className="text-xs text-stone-400">
              {isRfq
                ? "Share your stone requirements and get competitive quotes from verified suppliers."
                : "Direct manufacturer stone requirement submitted from product catalogue."}
            </p>

            <p className="text-[10.5px] text-stone-500 font-mono pt-0.5">
              Enquiry ID: {enquiry.id} • Created {new Date(enquiry.created_at).toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 font-medium">
            Read-Only Audit Mode
          </div>
        </div>
      </div>

      {/* RFQ Core Specifications Card */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-stone-800 gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>
                {isRfq
                  ? "Custom Stone Quotation Requirements"
                  : "Product Direct Enquiry Requirements"}
              </span>
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {isRfq
                ? "Core specifications submitted by buyer via Request Custom Stone Quotation"
                : "Direct quotation request for catalog item"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {buyer && buyer.id !== "guest" ? (
              <Link
                href={`/admin/buyers/${buyer.id}`}
                className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-medium"
              >
                <span>Inspect Buyer Profile</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-stone-800 px-2 py-0.5 text-[10.5px] font-medium text-stone-300">
                Guest Buyer Submission
              </span>
            )}
          </div>
        </div>

        {/* Core Fields Display Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Field 1: Product / Stone Name */}
          <div className="sm:col-span-2 lg:col-span-2 rounded-xl border border-amber-500/30 bg-stone-950/80 p-3.5 relative overflow-hidden">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-semibold mb-1">
              <Search className="h-3.5 w-3.5" />
              <span>1. Product / Stone Name</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-white tracking-tight">
              {productName}
            </p>
            <p className="text-[10.5px] text-stone-400 mt-0.5">
              Searched &amp; entered stone requirement
            </p>
          </div>

          {/* Field 2: Delivery Location */}
          <div className="rounded-xl border border-stone-800/80 bg-stone-950/80 p-3.5">
            <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-semibold mb-1">
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              <span>2. Delivery Location</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-stone-100">
              {deliveryLocation}
            </p>
            <p className="text-[10.5px] text-stone-500 mt-0.5">
              Target delivery city or state
            </p>
          </div>

          {/* Field 3: Mobile Number (Clickable tel:) */}
          <div className="rounded-xl border border-stone-800/80 bg-stone-950/80 p-3.5">
            <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-semibold mb-1">
              <Phone className="h-3.5 w-3.5 text-amber-500" />
              <span>3. Mobile Number</span>
            </div>
            {buyerPhone !== "—" ? (
              <a
                href={`tel:${buyerPhone.replace(/\s+/g, "")}`}
                className="text-sm sm:text-base font-mono font-bold text-amber-400 hover:text-amber-300 hover:underline block"
              >
                {buyerPhone}
              </a>
            ) : (
              <p className="text-sm font-mono text-stone-500">—</p>
            )}
            <p className="text-[10.5px] text-stone-500 mt-0.5">
              Direct phone contact for quotations
            </p>
          </div>

          {/* Requester Identity / Email */}
          <div className="rounded-xl border border-stone-800/80 bg-stone-950/80 p-3.5">
            <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-semibold mb-1">
              <User className="h-3.5 w-3.5 text-amber-500" />
              <span>Buyer Details</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {buyerName}
            </p>
            {buyerEmail !== "—" ? (
              <a
                href={`mailto:${buyerEmail}`}
                className="text-xs font-mono text-stone-300 hover:text-white hover:underline truncate block mt-0.5"
              >
                {buyerEmail}
              </a>
            ) : (
              <p className="text-[10.5px] text-stone-500 mt-0.5">
                {buyer && buyer.id !== "guest" ? "Verified Buyer" : "Guest Buyer (Quick RFQ)"}
              </p>
            )}
          </div>
        </div>

        {/* Project Notes (Only if custom remarks exist) */}
        {projectNotes && (
          <div className="border-t border-stone-800/80 pt-4">
            <span className="text-stone-400 text-xs font-semibold flex items-center gap-1.5 mb-2">
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <span>Requirement Notes &amp; Specifications</span>
            </span>
            <div className="whitespace-pre-wrap rounded-lg border border-stone-800 bg-stone-950 p-3.5 font-mono text-[11px] leading-relaxed text-stone-300">
              {projectNotes}
            </div>
          </div>
        )}

        {/* Attachments (If any uploaded) */}
        {attachments.length > 0 && (
          <div className="border-t border-stone-800/80 pt-4">
            <span className="text-stone-400 text-xs font-semibold flex items-center gap-1.5 mb-2">
              <Paperclip className="h-3.5 w-3.5 text-amber-500" />
              <span>Buyer Uploaded Documents / BOQ</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.signedUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-xs text-stone-200 hover:border-amber-500 hover:text-white transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5 text-amber-500" />
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
