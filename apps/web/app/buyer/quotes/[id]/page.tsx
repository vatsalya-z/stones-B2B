import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { QuotationStatus } from "@stone/types";
import { Breadcrumb, Card, CardBody, VerifiedBadge } from "@stone/ui";
import {
  formatDateTime,
  formatShortDate,
  QuotationStatusBadge,
} from "@/components/seller/status-badges";
import {
  formatMoneyAmount,
  formatUnitLabel,
  isQuotationExpired,
} from "@/features/buyer/buyer-meta";
import { getBuyerContext, getBuyerQuotationDetail } from "@/features/buyer/queries";
import { StartConversationButton } from "@/components/messaging/start-conversation-button";
import { BuyerQuoteActions } from "./buyer-quote-actions";

export const metadata: Metadata = {
  title: "Quotation Document",
};

interface BuyerQuotationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuyerQuotationDetailPage({
  params,
}: BuyerQuotationDetailPageProps) {
  const [ctx, { id }] = await Promise.all([getBuyerContext(), params]);
  const detail = await getBuyerQuotationDetail(ctx.user.id, id);

  if (!detail) {
    notFound();
  }

  const {
    quotation,
    items,
    enquiry,
    enquiryReference,
    seller,
    buyerProfile,
    buyerExtendedAddress,
    commercialTerms,
    siblingQuotationsCount,
  } = detail;

  const sellerLocation =
    [seller.city, seller.state, seller.country].filter(Boolean).join(", ") || "India";
  const buyerName =
    buyerProfile?.full_name || buyerProfile?.email || ctx.user.email || "Verified Buyer";
  const expired = isQuotationExpired(quotation.valid_until);
  const totalFormatted = formatMoneyAmount(Number(quotation.total_amount), quotation.currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/buyer/dashboard" },
            { label: "Quotations", href: "/buyer/quotes" },
            { label: quotation.quote_number },
          ]}
        />

        <div className="flex flex-wrap items-center gap-3">
          {siblingQuotationsCount >= 2 && (
            <Link
              href={`/buyer/quotes/compare?enquiry=${enquiry.id}`}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              Compare all {siblingQuotationsCount} quotations for this enquiry →
            </Link>
          )}
          <StartConversationButton
            sellerId={quotation.seller_id}
            enquiryId={enquiry.id}
            label="Message Supplier about Quote"
            variant="outline"
            size="sm"
          />
        </div>
      </div>

      {/* Buyer Actions Bar (Accept / Reject / PDF / Print) */}
      <Card className="print:hidden">
        <CardBody className="p-5">
          <BuyerQuoteActions
            quotationId={quotation.id}
            quoteNumber={quotation.quote_number}
            status={quotation.status as QuotationStatus}
            validUntil={quotation.valid_until}
            totalFormatted={totalFormatted}
            sellerName={seller.businessName}
            defaultContactName={buyerProfile?.full_name || ""}
            defaultPhone={buyerProfile?.phone || ""}
            defaultAddressLine1={buyerExtendedAddress?.cleanAddress || buyerProfile?.address || ""}
            defaultCity={buyerProfile?.city || ""}
            defaultState={buyerProfile?.state || ""}
            defaultPincode={buyerExtendedAddress?.pincode || ""}
            defaultCountry={buyerProfile?.country || "IN"}
            deliveryLocation={enquiry.delivery_location || ""}
          />
        </CardBody>
      </Card>

      {/* Formal B2B Quotation Sheet (Print-Ready) */}
      <Card className="overflow-hidden print:shadow-none print:border-stone-300">
        {/* Document Banner */}
        <div className="bg-stone-900 px-6 py-6 text-white sm:px-8 print:bg-stone-900">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                StonesDekho Commercial Quotation
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
                {quotation.quote_number}
              </h1>
              <p className="mt-1 text-xs text-stone-400">
                Commercial Offer Only • Not a Tax Invoice or Payment Receipt
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              <QuotationStatusBadge status={quotation.status as QuotationStatus} />
              <p className="text-xs text-stone-300">
                Issued: <strong>{formatShortDate(quotation.created_at)}</strong>
              </p>
              <p className={`text-xs ${expired ? "text-red-300 font-semibold" : "text-stone-300"}`}>
                Valid Until:{" "}
                <strong>
                  {quotation.valid_until
                    ? formatShortDate(quotation.valid_until)
                    : "Open / As per commercial terms"}
                </strong>
              </p>
            </div>
          </div>
        </div>

        <CardBody className="p-6 sm:p-8 space-y-8">
          {/* SECTIONS A, B & C — Seller, Buyer, and Quotation Metadata */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 border-b border-stone-200 pb-6">
            {/* A. Seller Details */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Supplier (From)
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {seller.slug ? (
                  <Link
                    href={`/suppliers/${seller.slug}`}
                    className="text-base font-bold text-stone-900 hover:text-amber-700"
                  >
                    {seller.businessName}
                  </Link>
                ) : (
                  <p className="text-base font-bold text-stone-900">{seller.businessName}</p>
                )}
                {seller.isVerified && <VerifiedBadge />}
              </div>
              <p className="text-xs text-stone-600 capitalize">
                {seller.businessType.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-stone-600">{sellerLocation}</p>
              {seller.website && (
                <a
                  href={seller.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-medium text-amber-700 hover:underline print:text-stone-700"
                >
                  {seller.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {/* B. Buyer Details */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Prepared For (Buyer)
              </p>
              <p className="text-base font-bold text-stone-900">{buyerName}</p>
              {buyerExtendedAddress.companyName && (
                <p className="text-xs font-semibold text-stone-700">
                  {buyerExtendedAddress.companyName}
                </p>
              )}
              <p className="text-xs text-stone-600">
                Delivery Destination:{" "}
                <strong className="text-stone-800">
                  {enquiry.delivery_location ||
                    [buyerProfile?.city, buyerProfile?.state, buyerProfile?.country]
                      .filter(Boolean)
                      .join(", ") ||
                    "As agreed"}
                </strong>
              </p>
            </div>

            {/* C. Quotation Metadata */}
            <div className="space-y-1.5 rounded-xl bg-stone-50 p-4 border border-stone-200/80">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Reference Details
              </p>
              <p className="text-xs text-stone-600">
                Enquiry Ref: <strong className="font-mono text-stone-900">{enquiryReference}</strong>
              </p>
              <p className="text-xs text-stone-600">
                Requirement:{" "}
                <Link
                  href={`/buyer/enquiries/${enquiry.id}`}
                  className="font-semibold text-amber-700 hover:underline print:text-stone-900"
                >
                  {enquiry.enquiry_title}
                </Link>
              </p>
              <p className="text-xs text-stone-600">
                Currency: <strong className="text-stone-900">{quotation.currency}</strong>
              </p>
              <p className="text-xs text-stone-600">
                Last Updated: {formatDateTime(quotation.updated_at)}
              </p>
            </div>
          </div>

          {/* SECTION D — QUOTATION LINE ITEMS */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
              Itemised Stone Schedule
            </h2>
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-4 py-3 w-10">#</th>
                    <th className="px-4 py-3">Product / Stone Specification</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3.5 text-xs text-stone-400">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-medium text-stone-900">
                        {item.description}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-stone-800 whitespace-nowrap">
                        {Number(item.quantity).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-stone-600 whitespace-nowrap">
                        {formatUnitLabel(item.unit)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-stone-700 whitespace-nowrap">
                        {formatMoneyAmount(Number(item.unit_price), quotation.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-stone-900 whitespace-nowrap">
                        {formatMoneyAmount(Number(item.total_price), quotation.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTIONS E & F — Commercial Terms & Financial Breakdown */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 pt-2">
            {/* F. Commercial Terms */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                Commercial Terms &amp; Conditions
              </h2>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
                  <dt className="text-[11px] font-medium text-stone-500">Payment Terms</dt>
                  <dd className="mt-1 text-xs font-semibold text-stone-900">
                    {commercialTerms.paymentTerms || "As specified in conditions"}
                  </dd>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
                  <dt className="text-[11px] font-medium text-stone-500">Delivery Terms</dt>
                  <dd className="mt-1 text-xs font-semibold text-stone-900">
                    {commercialTerms.deliveryTerms || "Ex-Factory / As specified"}
                  </dd>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
                  <dt className="text-[11px] font-medium text-stone-500">Quotation Validity</dt>
                  <dd className="mt-1 text-xs font-semibold text-stone-900">
                    {commercialTerms.validityNote || "Open / Confirm with supplier"}
                  </dd>
                </div>
              </dl>

              <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Supplier Conditions &amp; Notes
                </p>
                <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed">
                  {commercialTerms.additionalConditions ||
                    quotation.terms ||
                    "Standard natural stone variation, packing, and inspection terms apply as mutually agreed."}
                </p>
              </div>
            </div>

            {/* E. Financial Breakdown */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                  Financial Breakdown ({quotation.currency})
                </h2>

                <div className="space-y-2 text-sm border-b border-stone-200 pb-3">
                  <div className="flex items-center justify-between text-stone-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">
                      {formatMoneyAmount(Number(quotation.subtotal), quotation.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-700">
                    <span>Discount</span>
                    <span className="font-semibold text-green-700">
                      - {formatMoneyAmount(Number(quotation.discount_amount), quotation.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-700">
                    <span>Tax / GST</span>
                    <span className="font-semibold">
                      {formatMoneyAmount(Number(quotation.tax_amount), quotation.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-700">
                    <span>Shipping / Freight</span>
                    <span className="font-semibold">
                      {formatMoneyAmount(Number(quotation.shipping_charges), quotation.currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-sm font-bold text-stone-900">Final Quoted Total</span>
                  <span className="text-2xl font-extrabold text-stone-900">
                    {totalFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4 text-[11px] text-stone-500">
            <strong>Important B2B Notice:</strong> This document is a commercial quotation issued on
            StonesDekho and does not constitute a tax invoice, payment confirmation, or shipping bill.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

