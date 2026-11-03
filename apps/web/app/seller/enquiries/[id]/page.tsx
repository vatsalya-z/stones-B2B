import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumb, Card, CardBody, CardHeader } from "@stone/ui";
import {
  EnquiryStatusBadge,
  formatDateTime,
  formatSellerPrice,
  formatShortDate,
  QuotationStatusBadge,
} from "@/components/seller/status-badges";
import { ENQUIRY_STATUS_LABELS, UNIT_LABELS } from "@/features/seller/seller-meta";
import {
  getSellerContext,
  getSellerEnquiryDetail,
} from "@/features/seller/queries";
import { StartConversationButton } from "@/components/messaging/start-conversation-button";
import { SellerEnquiryActions } from "./enquiry-actions";

export const metadata: Metadata = {
  title: "Enquiry Details",
};

interface SellerEnquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SellerEnquiryDetailPage({
  params,
}: SellerEnquiryDetailPageProps) {
  const { id } = await params;
  const ctx = await getSellerContext();
  if (!ctx.sellerProfile) {
    notFound();
  }

  const detail = await getSellerEnquiryDetail(ctx.sellerProfile.id, id);
  if (!detail) {
    notFound();
  }

  const { enquiry, buyer, product, history, quotations, attachments } = detail;
  const unitLabel = UNIT_LABELS[enquiry.unit as keyof typeof UNIT_LABELS] ?? enquiry.unit;
  const canPrepareQuote = ["submitted", "viewed", "responding", "quoted"].includes(
    enquiry.status,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/seller/dashboard" },
            { label: "Enquiries", href: "/seller/enquiries" },
            { label: enquiry.enquiry_title },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <EnquiryStatusBadge status={enquiry.status} />
              <span className="text-xs text-stone-500">
                Submitted {formatDateTime(enquiry.created_at)}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {enquiry.enquiry_title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <StartConversationButton
              sellerId={ctx.sellerProfile.id}
              enquiryId={enquiry.id}
              productId={enquiry.product_id}
              callerContext="seller"
              label="Message Buyer"
              variant="outline"
            />
            {canPrepareQuote && (
              <Link
                href={`/seller/quotes/new?enquiryId=${enquiry.id}`}
                className="btn-primary"
              >
                + Prepare Quotation
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Requirements, Attachments, Quotations, History */}
        <div className="space-y-6 lg:col-span-7">
          {/* Commercial Specifications */}
          <Card>
            <CardHeader className="border-b border-stone-100 pb-4">
              <h2 className="text-base font-semibold text-stone-900">
                Buyer Requirement &amp; Specifications
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-stone-500">Required Quantity</dt>
                  <dd className="mt-0.5 text-sm font-bold text-stone-900">
                    {Number(enquiry.quantity).toLocaleString("en-IN")} {unitLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Target Budget</dt>
                  <dd className="mt-0.5 text-sm font-bold text-stone-900">
                    {enquiry.expected_budget !== null
                      ? `${enquiry.currency} ${Number(enquiry.expected_budget).toLocaleString("en-IN")}`
                      : "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Delivery Location</dt>
                  <dd className="mt-0.5 font-semibold text-stone-900">
                    {enquiry.delivery_location || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Required By</dt>
                  <dd className="mt-0.5 font-semibold text-stone-900">
                    {formatShortDate(enquiry.required_delivery_date)}
                  </dd>
                </div>
              </dl>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Detailed Buyer Notes
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-800">
                  {enquiry.description}
                </p>
              </div>

              {/* Private Attachments */}
              {attachments.length > 0 && (
                <div className="border-t border-stone-100 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Attached Drawings / BOQ Files ({attachments.length})
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {attachments.map((att) => (
                      <li
                        key={att.storagePath}
                        className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                      >
                        <span className="truncate font-medium text-stone-800">{att.name}</span>
                        {att.signedUrl ? (
                          <a
                            href={att.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-3 flex-shrink-0 font-semibold text-amber-700 hover:underline"
                          >
                            View / Download ↗
                          </a>
                        ) : (
                          <span className="text-stone-400">Unavailable</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Linked Quotations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Quotations for This Enquiry ({quotations.length})
                </h2>
              </div>
              {canPrepareQuote && (
                <Link
                  href={`/seller/quotes/new?enquiryId=${enquiry.id}`}
                  className="text-xs font-semibold text-amber-700 hover:underline"
                >
                  + New Quote
                </Link>
              )}
            </CardHeader>
            <CardBody>
              {quotations.length === 0 ? (
                <p className="py-4 text-sm text-stone-500">
                  No quotations issued for this enquiry yet.
                </p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {quotations.map((q) => (
                    <div
                      key={q.id}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/seller/quotes/${q.id}`}
                            className="text-sm font-bold text-stone-900 hover:text-amber-700"
                          >
                            {q.quote_number}
                          </Link>
                          <QuotationStatusBadge status={q.status} />
                        </div>
                        <p className="text-xs text-stone-500">
                          {q.items.length} line item{q.items.length === 1 ? "" : "s"} • Valid
                          until {formatShortDate(q.valid_until)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-stone-900">
                          {q.currency} {Number(q.total_amount).toLocaleString("en-IN")}
                        </span>
                        <Link
                          href={`/seller/quotes/${q.id}`}
                          className="btn-secondary !px-3 !py-1.5 !text-xs"
                        >
                          {q.status === "draft" ? "Edit Draft" : "View"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Immutable Status History Timeline */}
          <Card>
            <CardHeader className="border-b border-stone-100 pb-4">
              <h2 className="text-base font-semibold text-stone-900">Enquiry Audit History</h2>
            </CardHeader>
            <CardBody>
              {history.length === 0 ? (
                <p className="text-xs text-stone-500">No history events recorded.</p>
              ) : (
                <ol className="relative ml-2 space-y-4 border-l-2 border-stone-200 pl-4">
                  {history.map((item) => {
                    const toLabel =
                      ENQUIRY_STATUS_LABELS[
                        item.new_status as keyof typeof ENQUIRY_STATUS_LABELS
                      ] ?? item.new_status;
                    return (
                      <li key={item.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-600 ring-4 ring-white" />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-stone-900">
                            Status: {toLabel}
                            {item.previous_status
                              ? ` (from ${
                                  ENQUIRY_STATUS_LABELS[
                                    item.previous_status as keyof typeof ENQUIRY_STATUS_LABELS
                                  ] ?? item.previous_status
                                })`
                              : ""}
                          </p>
                          <span className="text-[11px] text-stone-400">
                            {formatDateTime(item.created_at)}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="mt-1 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-700">
                            {item.notes}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Actions, Buyer Contact, Referenced Product */}
        <div className="space-y-6 lg:col-span-5">
          <SellerEnquiryActions
            enquiryId={enquiry.id}
            currentStatus={enquiry.status}
            canPrepareQuote={canPrepareQuote}
          />

          {/* Buyer Information (permitted via `seller_can_see_buyer` RLS) */}
          <Card>
            <CardHeader className="border-b border-stone-100 pb-4">
              <h2 className="text-base font-semibold text-stone-900">Buyer Details</h2>
              <p className="text-xs text-stone-500">
                Authorized trade contact for this enquiry
              </p>
            </CardHeader>
            <CardBody className="space-y-2.5 text-sm">
              <div>
                <p className="text-xs text-stone-500">Buyer Name</p>
                <p className="font-semibold text-stone-900">
                  {buyer.fullName || "Verified StonesDekho Buyer"}
                </p>
              </div>
              {buyer.email && (
                <div>
                  <p className="text-xs text-stone-500">Email</p>
                  <a
                    href={`mailto:${buyer.email}?subject=${encodeURIComponent(`Re: ${enquiry.enquiry_title}`)}`}
                    className="font-medium text-amber-700 hover:underline"
                  >
                    {buyer.email}
                  </a>
                </div>
              )}
              {buyer.phone && (
                <div>
                  <p className="text-xs text-stone-500">Phone</p>
                  <a
                    href={`tel:${buyer.phone}`}
                    className="font-medium text-stone-900 hover:underline"
                  >
                    {buyer.phone}
                  </a>
                </div>
              )}
              <div>
                <p className="text-xs text-stone-500">Buyer Location</p>
                <p className="text-stone-800">
                  {[buyer.city, buyer.state, buyer.country].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Referenced Product Card */}
          {product && (
            <Card>
              <CardHeader className="border-b border-stone-100 pb-4">
                <h2 className="text-base font-semibold text-stone-900">Enquired Stone Product</h2>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    {product.thumbnailUrl ? (
                      <Image
                        src={product.thumbnailUrl}
                        alt={product.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-stone-400">
                        No Img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/seller/products/${product.id}/edit`}
                      className="block truncate text-sm font-bold text-stone-900 hover:text-amber-700"
                    >
                      {product.name}
                    </Link>
                    {product.sku && (
                      <p className="text-xs text-stone-500">SKU: {product.sku}</p>
                    )}
                    <p className="mt-0.5 text-xs font-semibold text-stone-700">
                      {formatSellerPrice(
                        product.priceType,
                        product.price,
                        product.currency,
                        product.unit,
                      )}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

