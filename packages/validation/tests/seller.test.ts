import { describe, expect, it } from "vitest";
import {
  productFormSchema,
  quotationFormSchema,
  sellerEnquiryTransitionSchema,
  sellerProfileSchema,
  storeSettingsSchema,
} from "../src";

describe("Phase 4 Seller Portal Validation Schemas (@stone/validation)", () => {
  describe("sellerProfileSchema", () => {
    it("accepts a partial draft seller profile and normalizes blank fields to null", () => {
      const parsed = sellerProfileSchema.parse({
        businessName: "Kishangarh Royal Marbles",
        businessType: "manufacturer",
        gstNumber: "",
        website: "",
      });

      expect(parsed.businessName).toBe("Kishangarh Royal Marbles");
      expect(parsed.gstNumber).toBeNull();
      expect(parsed.website).toBeNull();
      expect(parsed.country).toBe("IN");
    });

    it("validates a complete 15-character GSTIN and normalizes website URLs", () => {
      const parsed = sellerProfileSchema.parse({
        businessName: "Aravalli Granites Pvt Ltd",
        businessType: "exporter",
        businessEmail: "Export@AravalliStone.com",
        phone: "+91 98290 12345",
        gstNumber: "08aabcu9603r1zm",
        website: "aravallistone.com",
        businessAddress: "RIICO Industrial Area",
        city: "Udaipur",
        state: "Rajasthan",
        country: "in",
        pincode: "313001",
        yearsInBusiness: "22",
        hasManufacturing: true,
        hasQuarry: true,
        hasExport: true,
        productCategories: ["Marble", "Granite"],
      });

      expect(parsed.gstNumber).toBe("08AABCU9603R1ZM");
      expect(parsed.businessEmail).toBe("export@aravallistone.com");
      expect(parsed.website).toBe("https://aravallistone.com");
      expect(parsed.yearsInBusiness).toBe(22);
      expect(parsed.country).toBe("IN");
    });

    it("rejects malformed GSTIN numbers", () => {
      const res = sellerProfileSchema.safeParse({
        businessName: "Invalid GST Co",
        businessType: "wholesaler",
        gstNumber: "INVALID123",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("productFormSchema", () => {
    it("enforces price requirement when priceType is fixed, starting, or negotiable", () => {
      const failFixed = productFormSchema.safeParse({
        name: "Black Galaxy Granite 20mm Slab",
        priceType: "fixed",
        price: "",
        unit: "sq_ft",
      });
      expect(failFixed.success).toBe(false);

      const okOnRequest = productFormSchema.safeParse({
        name: "Bespoke Bookmatched Onyx Slab",
        priceType: "on_request",
        price: "",
        unit: "slab",
      });
      expect(okOnRequest.success).toBe(true);
    });

    it("rejects duplicate custom specification names (case-insensitive)", () => {
      const res = productFormSchema.safeParse({
        name: "Kota Blue Honed Limestone",
        priceType: "fixed",
        price: 85,
        unit: "sq_ft",
        customSpecifications: [
          { name: "Density", value: "2.65 g/cm3" },
          { name: "density", value: "2.70 g/cm3" },
        ],
      });
      expect(res.success).toBe(false);
    });
  });

  describe("storeSettingsSchema & sellerEnquiryTransitionSchema & quotationFormSchema", () => {
    it("validates storefront slug format", () => {
      expect(
        storeSettingsSchema.safeParse({
          businessName: "Mewar Stones",
          slug: "mewar-stones-india",
          businessType: "mine_owner",
        }).success,
      ).toBe(true);

      expect(
        storeSettingsSchema.safeParse({
          businessName: "Mewar Stones",
          slug: "Invalid Slug With Spaces!",
          businessType: "mine_owner",
        }).success,
      ).toBe(false);
    });

    it("restricts seller enquiry transitions to allowed seller target states", () => {
      expect(
        sellerEnquiryTransitionSchema.safeParse({
          enquiryId: "11111111-1111-4111-8111-111111111111",
          newStatus: "responding",
          notes: "Checking block availability",
        }).success,
      ).toBe(true);

      expect(
        sellerEnquiryTransitionSchema.safeParse({
          enquiryId: "11111111-1111-4111-8111-111111111111",
          newStatus: "accepted",
        }).success,
      ).toBe(false);
    });

    it("requires at least one positive-quantity line item on quotations", () => {
      expect(
        quotationFormSchema.safeParse({
          enquiryId: "11111111-1111-4111-8111-111111111111",
          items: [],
        }).success,
      ).toBe(false);

      expect(
        quotationFormSchema.safeParse({
          enquiryId: "11111111-1111-4111-8111-111111111111",
          items: [
            {
              description: "Makrana White 20mm Slabs",
              quantity: 1200,
              unit: "sq_ft",
              unitPrice: 340,
            },
          ],
          taxAmount: 73440,
          shippingCharges: 15000,
          discountAmount: 5000,
        }).success,
      ).toBe(true);
    });
  });
});

