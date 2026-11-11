import { NextResponse, type NextRequest } from "next/server";
import type { QuotationStatus } from "@stone/types";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { generateQuotationPdfBytes } from "@/features/buyer/buyer-meta";
import { getBuyerQuotationDetail } from "@/features/buyer/queries";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid quotation identifier." },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const isBuyer = await hasRole("buyer");
    if (!isBuyer) {
      return NextResponse.json(
        { error: "Buyer permissions required." },
        { status: 403 },
      );
    }

    const detail = await getBuyerQuotationDetail(user.id, id);
    if (!detail) {
      return NextResponse.json(
        { error: "Quotation not found or access denied." },
        { status: 404 },
      );
    }

    const { quotation, items, enquiry, enquiryReference, seller, buyerProfile } = detail;
    const sellerLocation =
      [seller.city, seller.state, seller.country].filter(Boolean).join(", ") || "India";

    const pdfBytes = generateQuotationPdfBytes({
      quoteNumber: quotation.quote_number,
      status: quotation.status as QuotationStatus,
      createdAt: quotation.created_at,
      validUntil: quotation.valid_until,
      currency: quotation.currency,
      enquiryTitle: enquiry.enquiry_title,
      enquiryReference,
      seller: {
        businessName: seller.businessName,
        location: sellerLocation,
        isVerified: seller.isVerified,
      },
      buyer: {
        name: buyerProfile?.full_name || buyerProfile?.email || user.email || "Verified Buyer",
        deliveryLocation: enquiry.delivery_location,
      },
      items: items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
      })),
      subtotal: Number(quotation.subtotal),
      discountAmount: Number(quotation.discount_amount),
      taxAmount: Number(quotation.tax_amount),
      shippingCharges: Number(quotation.shipping_charges),
      totalAmount: Number(quotation.total_amount),
      terms: quotation.terms,
    });

    const safeFilename = quotation.quote_number.replace(/[^a-zA-Z0-9_-]/g, "-");
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="StonesDekho-${safeFilename}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[buyer/quotes/pdf] unhandled error:", err);
    return NextResponse.json(
      { error: "Unable to generate quotation PDF right now." },
      { status: 500 },
    );
  }
}

