import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb, EmptyState } from "@stone/ui";
import type { CatalogUnit } from "@stone/validation";
import {
  getQuotableEnquiriesForSeller,
  getSellerCatalogOptions,
  getSellerContext,
  getSellerQuotationById,
} from "@/features/seller/queries";
import {
  QuotationBuilder,
  type InitialQuotationDraft,
  type QuotableEnquiryOption,
} from "../quotation-builder";

export const metadata: Metadata = {
  title: "Create Quotation",
};

interface NewSellerQuotePageProps {
  searchParams: Promise<{
    enquiryId?: string;
    fromQuoteId?: string;
  }>;
}

export default async function NewSellerQuotePage({
  searchParams,
}: NewSellerQuotePageProps) {
  const sp = await searchParams;
  const ctx = await getSellerContext();
  const seller = ctx.sellerProfile;

  const [rawEnquiries, catalogOptions, sourceQuote] = seller
    ? await Promise.all([
        getQuotableEnquiriesForSeller(seller.id),
        getSellerCatalogOptions(seller.id),
        sp.fromQuoteId ? getSellerQuotationById(seller.id, sp.fromQuoteId) : Promise.resolve(null),
      ])
    : [[], [], null];

  const enquiryOptions: QuotableEnquiryOption[] = rawEnquiries.map((e) => ({
    id: e.id,
    enquiry_title: e.enquiry_title,
    quantity: e.quantity,
    unit: e.unit,
    currency: e.currency,
    status: e.status,
    buyerName: e.profiles?.full_name || e.profiles?.email || "Verified Buyer",
    product: e.products,
  }));

  const defaultValidDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const selectedEnquiry =
    enquiryOptions.find((e) => e.id === (sourceQuote?.quotation.enquiry_id ?? sp.enquiryId)) ??
    enquiryOptions[0];

  let initialData: InitialQuotationDraft;
  if (sourceQuote) {
    initialData = {
      enquiryId: sourceQuote.quotation.enquiry_id,
      currency: sourceQuote.quotation.currency,
      discountAmount: Number(sourceQuote.quotation.discount_amount),
      taxAmount: Number(sourceQuote.quotation.tax_amount),
      shippingCharges: Number(sourceQuote.quotation.shipping_charges),
      validUntilDateInput: sourceQuote.quotation.valid_until
        ? sourceQuote.quotation.valid_until.slice(0, 10)
        : defaultValidDate,
      terms: sourceQuote.quotation.terms ?? "",
      items:
        sourceQuote.items.length > 0
          ? sourceQuote.items.map((item) => ({
              productId: item.product_id ?? "",
              description: item.description,
              quantity: String(item.quantity),
              unit: (item.unit as CatalogUnit) || "sq_ft",
              unitPrice: String(item.unit_price),
            }))
          : [
              {
                productId: "",
                description: "",
                quantity: "1",
                unit: "sq_ft",
                unitPrice: "0",
              },
            ],
    };
  } else if (selectedEnquiry) {
    initialData = {
      enquiryId: selectedEnquiry.id,
      currency: selectedEnquiry.currency || "INR",
      discountAmount: 0,
      taxAmount: 0,
      shippingCharges: 0,
      validUntilDateInput: defaultValidDate,
      terms:
        "1. Prices are Ex-Factory unless freight is specified.\n2. Natural stone is a product of nature; shade and veining variations are inherent.\n3. 50% advance with confirmed PO, balance prior to dispatch.",
      items: [
        {
          productId: selectedEnquiry.product?.id ?? "",
          description:
            selectedEnquiry.product?.name ?? selectedEnquiry.enquiry_title,
          quantity: String(selectedEnquiry.quantity),
          unit: (selectedEnquiry.unit as CatalogUnit) || "sq_ft",
          unitPrice: selectedEnquiry.product?.price
            ? String(selectedEnquiry.product.price)
            : "0",
        },
      ],
    };
  } else {
    initialData = {
      enquiryId: "",
      currency: "INR",
      discountAmount: 0,
      taxAmount: 0,
      shippingCharges: 0,
      validUntilDateInput: defaultValidDate,
      terms: "",
      items: [
        {
          productId: "",
          description: "",
          quantity: "1",
          unit: "sq_ft",
          unitPrice: "0",
        },
      ],
    };
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/seller/dashboard" },
            { label: "Quotations", href: "/seller/quotes" },
            { label: sourceQuote ? "Revise Quotation" : "New Quotation" },
          ]}
        />
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          {sourceQuote
            ? `New Revision (from ${sourceQuote.quotation.quote_number})`
            : "Create Commercial Quotation"}
        </h1>
      </div>

      {enquiryOptions.length === 0 ? (
        <EmptyState
          title="No quotable buyer enquiries yet"
          description="Quotations are issued against authorized incoming buyer enquiries (New, Viewed, In Discussion, or Quoted)."
          action={
            <Link href="/seller/enquiries" className="btn-secondary !py-2 !text-xs">
              Go to Enquiries Inbox →
            </Link>
          }
        />
      ) : (
        <QuotationBuilder
          enquiries={enquiryOptions}
          catalogProducts={catalogOptions}
          initialData={initialData}
        />
      )}
    </div>
  );
}

