import { describe, expect, it } from "vitest";
import {
  checkVerificationReadiness,
  computeQuotationTotals,
  decodeBuyerAddress,
  decodeRfqDescription,
  decodeSellerDescription,
  encodeBuyerAddress,
  encodeRfqDescription,
  encodeSellerDescription,
  getBuyerQuotationActionEligibility,
} from "../src/lib/domain-meta";

describe("Domain Metadata Encoders & Deterministic Arithmetic", () => {
  it("round-trips Buyer extended profile address cleanly", () => {
    const encoded = encodeBuyerAddress({
      cleanAddress: "Plot 44, Sector 18",
      companyName: "Aravali Architects",
      buyerType: "architect",
      whatsappNumber: "+919876543210",
      pincode: "122015",
    });
    const decoded = decodeBuyerAddress(encoded);
    expect(decoded.cleanAddress).toBe("Plot 44, Sector 18");
    expect(decoded.companyName).toBe("Aravali Architects");
    expect(decoded.buyerType).toBe("architect");
    expect(decoded.whatsappNumber).toBe("+919876543210");
    expect(decoded.pincode).toBe("122015");
  });

  it("round-trips B2B RFQ technical specifications", () => {
    const encoded = encodeRfqDescription({
      mode: "general",
      cleanDescription: "Hotel lobby bookmatched Statuario flooring.",
      materialType: "Marble",
      colour: "White",
      finish: "Polished",
      thickness: "20 mm",
      deliveryCity: "Mumbai",
    });
    const decoded = decodeRfqDescription(encoded);
    expect(decoded.isRfq).toBe(true);
    expect(decoded.materialType).toBe("Marble");
    expect(decoded.finish).toBe("Polished");
    expect(decoded.thickness).toBe("20 mm");
    expect(decoded.deliveryCity).toBe("Mumbai");
  });

  it("round-trips Seller capabilities inside description", () => {
    const encoded = encodeSellerDescription({
      cleanDescription: "Makrana heritage quarry group.",
      hasQuarry: true,
      hasManufacturing: true,
      hasExport: false,
      productCategories: ["Marble", "Sandstone"],
    });
    const decoded = decodeSellerDescription(encoded);
    expect(decoded.cleanDescription).toBe("Makrana heritage quarry group.");
    expect(decoded.hasQuarry).toBe(true);
    expect(decoded.hasManufacturing).toBe(true);
    expect(decoded.hasExport).toBe(false);
  });

  it("computes deterministic quotation totals aligned with Postgres numeric(14,2)", () => {
    const totals = computeQuotationTotals({
      items: [
        { description: "Makrana White Slab", quantity: 1000, unit: "sq_ft", unitPrice: 285.5 },
      ],
      discountAmount: 5500,
      taxAmount: 50400,
      shippingCharges: 12000,
    });
    expect(totals.subtotal).toBe(285500);
    expect(totals.totalAmount).toBe(342400);

    expect(() =>
      computeQuotationTotals({
        items: [{ description: "Tile", quantity: 10, unit: "sq_ft", unitPrice: 100 }],
        discountAmount: 2000,
      }),
    ).toThrow(/Discount amount cannot exceed/);
  });

  it("evaluates verification readiness & expired quotation eligibility accurately", () => {
    const ready = checkVerificationReadiness(
      {
        business_name: "Mewar Stone Mines",
        business_email: "ops@mewar.in",
        phone: "+919829012345",
        gst_number: "08AABCU9603R1ZM",
        business_address: "RIICO Industrial Area",
        city: "Udaipur",
        state: "Rajasthan",
        pincode: "313001",
        verification_status: "draft",
      },
      1,
    );
    expect(ready.isReady).toBe(true);

    const expiredEligibility = getBuyerQuotationActionEligibility(
      "sent",
      "2020-01-01T00:00:00.000Z",
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(expiredEligibility.isExpired).toBe(true);
    expect(expiredEligibility.canAccept).toBe(false);
  });
});
