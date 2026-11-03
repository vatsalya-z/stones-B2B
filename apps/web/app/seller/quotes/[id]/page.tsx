import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, Card, CardBody, CardHeader } from "@stone/ui";
import type { CatalogUnit } from "@stone/validation";
import {
  formatDateTime,
  formatShortDate,
  QuotationStatusBadge,
} from "@/components/seller/status-badges";
import { UNIT_LABELS } from "@/features/seller/seller-meta";
import {
  getQuotableEnquiriesForSeller,
  getSellerCatalogOptions,
  getSellerContext,
  getSellerQuotationById,
} from "@/features/seller/queries";
import { StartConversationButton } from "@/components/messaging/start-conversation-button";
import { QuotationBuilder } from "../quotation-builder";
import { QuoteStatusActions } from "./quote-status-actions";

export const metadata: Metadata = {
  title: "Quotation Details",
};

interface SellerQuoteDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function SellerQuoteDetailPage({
  params,
  searchParams,
}: SellerQuoteDetailPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getSellerContext();
  if (!ctx.sellerProfile) {
    notFound();
  }

  const record = await getSellerQuotationById(ctx.sellerProfile.id, id);
  if (!record) {
    notFound();
  }

  const { quotation, items, enquiry, buyerName } = record;

  // Draft quotations render inside the interactive editor so the seller can adjust items & send
  if (quotation.status === "draft") {
    const [rawEnquiries, catalogOptions] = await Promise.all([
      getQuotableEnquiriesForSeller(ctx.sellerProfile.id),
      getSellerCatalogOptions(ctx.sellerProfile.id),
    ]);

    const enquiryOptions = rawEnquiries.map((e) => ({
      id: e.id,
      enquiry_title: e.enquiry_title,
      quantity: e.quantity,
      unit: e.unit,
      currency: e.currency,
      status: e.status,
      buyerName: e.profiles?.full_name || e.profiles?.email || "Verified Buyer",
      product: e.products,
    }));

    // Ensure current enquiry is always present in dropdown
    if (!enquiryOptions.some((e) => e.id === enquiry.id)) {
      enquiryOptions.unshift({
        id: enquiry.id,
        enquiry_title: enquiry.enquiry_title,
        quantity: enquiry.quantity,
        unit: enquiry.unit,
        currency: enquiry.currency,
        status: enquiry.status,
        buyerName,
        product: null,
      });
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/seller/dashboard" },
              { label: "Quotations", href: "/seller/quotes" },
              { label: quotation.quote_number },
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Edit Draft Quotation {quotation.quote_number}
              </h1>
              <QuotationStatusBadge status={quotation.status} />
            </div>
            <StartConversationButton
              sellerId={ctx.sellerProfile.id}
              enquiryId={quotation.enquiry_id}
              callerContext="seller"
              label="Message Buyer"
              variant="outline"
              size="sm"
            />
          </div>
        </div>

        {sp.saved === "1" && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            Draft quotation {quotation.quote_number} saved. Review line items and click{" "}
            <strong>Save &amp; Send to Buyer</strong> when ready.
          </div>
        )}

        <QuotationBuilder
          enquiries={enquiryOptions}
          catalogProducts={catalogOptions}
          lockEnquiry={true}
          initialData={{
            quotationId: quotation.id,
            enquiryId: quotation.enquiry_id,
            currency: quotation.currency,
            discountAmount: Number(quotation.discount_amount),
            taxAmount: Number(quotation.tax_amount),
            shippingCharges: Number(quotation.shipping_charges),
            validUntilDateInput: quotation.valid_until
              ? quotation.valid_until.slice(0, 10)
              : "",
            terms: quotation.terms ?? "",
            items:
              items.length > 0
                ? items.map((i) => ({
                    productId: i.product_id ?? "",
                    description: i.description,
                    quantity: String(i.quantity),
                    unit: (i.unit as CatalogUnit) || "sq_ft",
                    unitPrice: String(i.unit_price),
                  }))
                : [
                    {
                      productId: "",
                      description: enquiry.enquiry_title,
                      quantity: String(enquiry.quantity),
                      unit: (enquiry.unit as CatalogUnit) || "sq_ft",
                      unitPrice: "0",
                    },
                  ],
          }}
        />
      </div>
    );
  }

  // Sent / Viewed / Accepted / Rejected / Revised / Cancelled Read-Only Proforma View
  const formatAmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: quotation.currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/seller/dashboard" },
            { label: "Quotations", href: "/seller/quotes" },
            { label: quotation.quote_number },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                {quotation.quote_number}
              </h1>
              <QuotationStatusBadge status={quotation.status} />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Issued {formatDateTime(quotation.created_at)} • Valid until{" "}
              {formatShortDate(quotation.valid_until)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <StartConversationButton
              sellerId={ctx.sellerProfile.id}
              enquiryId={quotation.enquiry_id}
              callerContext="seller"
              label="Message Buyer"
              variant="outline"
              size="sm"
            />
            <QuoteStatusActions
              quotationId={quotation.id}
              enquiryId={quotation.enquiry_id}
              status={quotation.status}
            />
          </div>
        </div>
      </div>

      {sp.saved === "1" && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Quotation {quotation.quote_number} has been sent to the buyer and the enquiry status
          has moved to Quoted.
        </div>
      )}

      {/* Proforma Document Card */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-stone-500">Prepared For Buyer</p>
              <p className="text-sm font-bold text-stone-900">{buyerName}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-stone-500">Linked Enquiry</p>
              <Link
                href={`/seller/enquiries/${enquiry.id}`}
                className="text-sm font-semibold text-amber-700 hover:underline"
              >
                {enquiry.enquiry_title} ↗
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
              <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-right">Unit Price</th>
                  <th className="px-3 py-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item, idx) => {
                  const unitLabel =
                    UNIT_LABELS[item.unit as keyof typeof UNIT_LABELS] ?? item.unit;
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3 text-xs text-stone-500">{idx + 1}</td>
                      <td className="px-3 py-3 font-medium text-stone-900">
                        {item.description}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-700">
                        {Number(item.quantity).toLocaleString("en-IN")} {unitLabel}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-700">
                        {formatAmt(Number(item.unit_price))}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-stone-900">
                        {formatAmt(Number(item.total_price))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-6 border-t border-stone-100 pt-5 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Terms &amp; Conditions
              </h3>
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-stone-700">
                {quotation.terms || "Standard StonesDekho trade terms apply."}
              </p>
            </div>

            <div className="space-y-2 rounded-xl bg-stone-50 p-4 text-sm lg:col-span-5">
              <div className="flex justify-between">
                <span className="text-stone-600">Subtotal</span>
                <span className="font-semibold text-stone-900">
                  {formatAmt(Number(quotation.subtotal))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Discount</span>
                <span className="text-stone-800">
                  – {formatAmt(Number(quotation.discount_amount))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">GST / Tax</span>
                <span className="text-stone-800">
                  + {formatAmt(Number(quotation.tax_amount))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Freight / Packaging</span>
                <span className="text-stone-800">
                  + {formatAmt(Number(quotation.shipping_charges))}
                </span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2.5 text-base font-extrabold text-stone-900">
                <span>Total Amount</span>
                <span className="text-amber-700">
                  {formatAmt(Number(quotation.total_amount))}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

