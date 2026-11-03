import Image from "next/image";
import Link from "next/link";
import type { EnquiryStatus, QuotationStatus } from "@stone/types";
import { Badge, Breadcrumb, Card, CardBody, CardHeader, VerifiedBadge } from "@stone/ui";
import {
  EnquiryStatusBadge,
  formatDateTime,
  formatShortDate,
  QuotationStatusBadge,
} from "@/components/seller/status-badges";
import {
  formatCountryName,
  formatMoneyAmount,
  formatUnitLabel,
} from "@/features/buyer/buyer-meta";
import type { BuyerEnquiryDetailData } from "@/features/buyer/queries";
import { StartConversationButton } from "@/components/messaging/start-conversation-button";
import { BuyerEnquiryStatusActions } from "./buyer-enquiry-status-actions";
import { EnquiryAttachmentUploader } from "./enquiry-attachment-uploader";

export interface BuyerEnquiryDetailViewProps {
  detail: BuyerEnquiryDetailData;
  sectionContext: "enquiries" | "rfqs";
}

export function BuyerEnquiryDetailView({
  detail,
  sectionContext,
}: BuyerEnquiryDetailViewProps) {
  const {
    enquiry,
    referenceCode,
    rfqMeta,
    product,
    seller,
    statusHistory,
    quotations,
    attachments,
  } = detail;

  const isRfq = rfqMeta.isRfq || enquiry.product_id === null || sectionContext === "rfqs";
  const parentLabel = sectionContext === "rfqs" ? "RFQs" : "My Enquiries";
  const parentHref = sectionContext === "rfqs" ? "/buyer/rfqs" : "/buyer/enquiries";
  const sellerLocation =
    [seller.city, seller.state, seller.country].filter(Boolean).join(", ") || "India";

  const specEntries: Array<{ label: string; value: string | null }> = [
    { label: "Stone Category", value: rfqMeta.categorySlug },
    { label: "Material Type", value: rfqMeta.materialType ?? product?.materialType ?? null },
    { label: "Stone Origin", value: rfqMeta.stoneOrigin ?? product?.stoneOrigin ?? null },
    { label: "Colour / Tone", value: rfqMeta.colour ?? product?.colour ?? null },
    { label: "Surface Finish", value: rfqMeta.finish ?? product?.finish ?? null },
    {
      label: "Thickness",
      value:
        rfqMeta.thickness ??
        (product?.thickness !== null && product?.thickness !== undefined
          ? `${product.thickness} mm`
          : null),
    },
    {
      label: "Length",
      value:
        rfqMeta.length ??
        (product?.length !== null && product?.length !== undefined
          ? `${product.length} mm`
          : null),
    },
    {
      label: "Width",
      value:
        rfqMeta.width ??
        (product?.width !== null && product?.width !== undefined
          ? `${product.width} mm`
          : null),
    },
    { label: "Surface Requirements", value: rfqMeta.surfaceRequirements },
    { label: "Custom Specifications", value: rfqMeta.customSpecifications },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/buyer/dashboard" },
          { label: parentLabel, href: parentHref },
          { label: referenceCode },
        ]}
      />

      {/* Top Header Card */}
      <Card>
        <CardBody className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-stone-500">
                  {referenceCode}
                </span>
                <EnquiryStatusBadge status={enquiry.status as EnquiryStatus} />
                {isRfq && (
                  <Badge variant="outline">
                    {enquiry.product_id ? "Product-Specific RFQ" : "General Custom RFQ"}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                {enquiry.enquiry_title}
              </h1>
              <p className="text-xs text-stone-500">
                Submitted on {formatDateTime(enquiry.created_at)} • Last updated{" "}
                {formatDateTime(enquiry.updated_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {enquiry.seller_id && (
                <StartConversationButton
                  sellerId={enquiry.seller_id}
                  enquiryId={enquiry.id}
                  productId={enquiry.product_id}
                  label="Message Supplier"
                  variant="outline"
                  size="sm"
                />
              )}
              {quotations.length >= 2 && (
                <Link
                  href={`/buyer/quotes/compare?enquiry=${enquiry.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700"
                >
                  Compare {quotations.length} Quotations →
                </Link>
              )}
            </div>
          </div>

          <BuyerEnquiryStatusActions
            enquiryId={enquiry.id}
            currentStatus={enquiry.status as EnquiryStatus}
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Commercial Requirement & Specs */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-bold text-stone-900">
                Requirement &amp; Technical Specifications
              </h2>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] font-medium text-stone-500">Required Quantity</p>
                  <p className="mt-1 text-sm font-bold text-stone-900">
                    {Number(enquiry.quantity).toLocaleString("en-IN")}{" "}
                    {formatUnitLabel(enquiry.unit)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-stone-500">Expected Budget</p>
                  <p className="mt-1 text-sm font-bold text-stone-900">
                    {enquiry.expected_budget !== null
                      ? formatMoneyAmount(Number(enquiry.expected_budget), enquiry.currency)
                      : "Open / Request Quote"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-stone-500">Currency</p>
                  <p className="mt-1 text-sm font-bold text-stone-900">{enquiry.currency}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-stone-500">Required Delivery</p>
                  <p className="mt-1 text-sm font-bold text-stone-900">
                    {enquiry.required_delivery_date
                      ? formatShortDate(enquiry.required_delivery_date)
                      : "Flexible"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Buyer Requirement Notes
                </h3>
                <p className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 text-sm text-stone-800 whitespace-pre-line leading-relaxed">
                  {rfqMeta.cleanDescription || enquiry.description}
                </p>
              </div>

              {specEntries.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                    Technical Stone Parameters
                  </h3>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {specEntries.map((spec) => (
                      <div
                        key={spec.label}
                        className="rounded-lg border border-stone-200 px-3.5 py-2.5"
                      >
                        <dt className="text-[11px] font-medium text-stone-500">{spec.label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-stone-900">
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Delivery Location
                </h3>
                <p className="text-sm font-medium text-stone-800">
                  {enquiry.delivery_location ||
                    [
                      rfqMeta.deliveryAddress,
                      rfqMeta.deliveryCity,
                      rfqMeta.deliveryState,
                      rfqMeta.deliveryCountry
                        ? formatCountryName(rfqMeta.deliveryCountry)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                    "To be confirmed with supplier"}
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Received Quotations for this Enquiry */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Received Quotations ({quotations.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Formal commercial offers sent by {seller.businessName} for this requirement.
                </p>
              </div>
              {quotations.length >= 2 && (
                <Link
                  href={`/buyer/quotes/compare?enquiry=${enquiry.id}`}
                  className="text-xs font-semibold text-amber-700 hover:underline"
                >
                  Compare Side-by-Side →
                </Link>
              )}
            </CardHeader>
            <CardBody>
              {quotations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/60 p-6 text-center">
                  <p className="text-sm font-semibold text-stone-800">
                    Awaiting Supplier Quotation
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {seller.businessName} has received your specification and can issue a formal quotation directly to your inbox.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-200">
                  {quotations.map((q) => (
                    <div
                      key={q.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/buyer/quotes/${q.id}`}
                            className="text-sm font-bold text-stone-900 hover:text-amber-700"
                          >
                            {q.quote_number}
                          </Link>
                          <QuotationStatusBadge status={q.status as QuotationStatus} />
                        </div>
                        <p className="text-xs text-stone-500">
                          {q.itemsCount} line item{q.itemsCount !== 1 ? "s" : ""} • Issued{" "}
                          {formatShortDate(q.created_at)}
                          {q.valid_until ? ` • Valid until ${formatShortDate(q.valid_until)}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-stone-500">Total Quoted</p>
                          <p className="text-base font-extrabold text-stone-900">
                            {formatMoneyAmount(Number(q.total_amount), q.currency)}
                          </p>
                        </div>
                        <Link
                          href={`/buyer/quotes/${q.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                        >
                          View Quote →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Private Attachments */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-bold text-stone-900">
                Private Attachments ({attachments.length})
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Protected via signed URLs (15-minute expiry). Only accessible to you and{" "}
                {seller.businessName}.
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              {attachments.length > 0 ? (
                <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200">
                  {attachments.map((att) => (
                    <li
                      key={att.storagePath}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-stone-900">{att.name}</p>
                        <p className="text-xs text-stone-500">
                          {att.mimeType ?? "Document"}
                          {att.sizeBytes
                            ? ` • ${(att.sizeBytes / 1024).toFixed(0)} KB`
                            : ""}
                          {att.createdAt ? ` • Uploaded ${formatShortDate(att.createdAt)}` : ""}
                        </p>
                      </div>
                      {att.signedUrl ? (
                        <a
                          href={att.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                        >
                          View / Download ↗
                        </a>
                      ) : (
                        <span className="text-xs text-stone-400">Signed link unavailable</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-stone-500">
                  No reference drawings, BOQ documents, or photos attached yet.
                </p>
              )}

              <EnquiryAttachmentUploader
                enquiryId={enquiry.id}
                existingCount={attachments.length}
                disabled={enquiry.status === "closed" || enquiry.status === "cancelled"}
              />
            </CardBody>
          </Card>
        </div>

        {/* Right Sidebar Column (4 cols): Product, Supplier, Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Related Product Card */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-stone-900">Related Stone Product</h2>
            </CardHeader>
            <CardBody>
              {product ? (
                <div className="space-y-3">
                  {product.primaryImage && (
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                      <Image
                        src={product.primaryImage}
                        alt={product.name}
                        fill
                        sizes="320px"
                        className="object-cover"
                        unoptimized={!product.primaryImage.includes(".supabase.co")}
                      />
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-sm font-bold text-stone-900 hover:text-amber-700"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-xs text-stone-500">
                      {[product.materialType, product.colour, product.finish]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <Link
                    href={`/products/${product.slug}`}
                    className="inline-flex text-xs font-semibold text-amber-700 hover:underline"
                  >
                    Open Public Product Listing ↗
                  </Link>
                </div>
              ) : enquiry.product_id ? (
                <p className="text-xs text-stone-500">
                  The originally referenced catalogue item is currently archived or unpublished by
                  the supplier. Your enquiry record and quotations remain intact.
                </p>
              ) : (
                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200/80">
                  <p className="text-xs font-semibold text-stone-800">
                    General Custom Stone RFQ
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Submitted as a custom project specification without a fixed catalogue SKU.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Assigned Supplier Card (Strictly Public Seller Profile RLS Data) */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-stone-900">Supplier Information</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-xs font-bold text-stone-700">
                  {seller.logoUrl ? (
                    <Image
                      src={seller.logoUrl}
                      alt={seller.businessName}
                      fill
                      sizes="44px"
                      className="object-cover"
                      unoptimized={!seller.logoUrl.includes(".supabase.co")}
                    />
                  ) : (
                    <span>{seller.businessName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {seller.slug ? (
                      <Link
                        href={`/suppliers/${seller.slug}`}
                        className="text-sm font-bold text-stone-900 hover:text-amber-700"
                      >
                        {seller.businessName}
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-stone-900">
                        {seller.businessName}
                      </span>
                    )}
                    {seller.isVerified && <VerifiedBadge />}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500 capitalize">
                    {seller.businessType.replace(/_/g, " ")} • {sellerLocation}
                  </p>
                  {seller.yearsInBusiness && (
                    <p className="mt-1 text-xs text-stone-500">
                      {seller.yearsInBusiness}+ years in natural stone industry
                    </p>
                  )}
                </div>
              </div>

              {seller.slug && (
                <Link
                  href={`/suppliers/${seller.slug}`}
                  className="inline-flex text-xs font-semibold text-amber-700 hover:underline"
                >
                  Visit Factory Storefront ↗
                </Link>
              )}
            </CardBody>
          </Card>

          {/* Status History Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-stone-900">Status History</h2>
            </CardHeader>
            <CardBody>
              {statusHistory.length === 0 ? (
                <p className="text-xs text-stone-500">
                  Initial status: <strong className="capitalize">{enquiry.status}</strong> (
                  {formatDateTime(enquiry.created_at)})
                </p>
              ) : (
                <ol className="relative border-l border-stone-200 ml-2 space-y-4">
                  {statusHistory.map((entry) => (
                    <li key={entry.id} className="ml-4">
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-amber-600" />
                      <p className="text-xs font-bold text-stone-900 capitalize">
                        {entry.previous_status
                          ? `${entry.previous_status.replace(/_/g, " ")} → ${entry.new_status.replace(/_/g, " ")}`
                          : entry.new_status.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {formatDateTime(entry.created_at)}
                      </p>
                      {entry.notes && (
                        <p className="mt-1 rounded bg-stone-50 px-2.5 py-1.5 text-xs text-stone-700 border border-stone-100">
                          {entry.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

