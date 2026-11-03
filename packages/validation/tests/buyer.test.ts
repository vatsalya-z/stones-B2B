import { describe, expect, it } from "vitest";
import {
  buyerEnquiryTransitionSchema,
  buyerPasswordChangeSchema,
  buyerProfileSchema,
  buyerQuotationDecisionSchema,
  rfqFormSchema,
  sanitizeNextPath,
} from "../src";

describe("Phase 5 Buyer Portal & RFQ Validation Schemas (@stone/validation)", () => {
  describe("sanitizeNextPath", () => {
    it("permits safe internal relative paths including query strings", () => {
      expect(sanitizeNextPath("/buyer/dashboard")).toBe("/buyer/dashboard");
      expect(sanitizeNextPath("/buyer/rfqs/new?product=makrana-white-marble")).toBe(
        "/buyer/rfqs/new?product=makrana-white-marble",
      );
      expect(sanitizeNextPath("/products/black-galaxy-granite")).toBe(
        "/products/black-galaxy-granite",
      );
    });

    it("blocks external URLs, protocol-relative URLs, backslashes, control chars, and auth loops", () => {
      expect(sanitizeNextPath("https://evil.example.com/phish")).toBe("/dashboard");
      expect(sanitizeNextPath("//evil.example.com")).toBe("/dashboard");
      expect(sanitizeNextPath("/\\evil.example.com")).toBe("/dashboard");
      expect(sanitizeNextPath("/buyer\\evil")).toBe("/dashboard");
      expect(sanitizeNextPath("/buyer/dashboard\r\nSet-Cookie: bad=1")).toBe("/dashboard");
      expect(sanitizeNextPath("/login")).toBe("/dashboard");
      expect(sanitizeNextPath("/login?next=/buyer")).toBe("/dashboard");
      expect(sanitizeNextPath("/register/buyer")).toBe("/dashboard");
      expect(sanitizeNextPath("/auth/callback")).toBe("/dashboard");
      expect(sanitizeNextPath(null, "/buyer/dashboard")).toBe("/buyer/dashboard");
    });
  });

  describe("buyerProfileSchema", () => {
    it("validates a complete buyer profile, normalizes ISO country code, and strips privileged fields", () => {
      const parsed = buyerProfileSchema.parse({
        fullName: " Vikramaditya Mehta ",
        phone: "+91 98201 44556",
        whatsappNumber: "+91 98201 44556",
        companyName: "Mehta Architectural Projects LLP",
        buyerType: "architect",
        country: "ae",
        state: "Dubai",
        city: "Business Bay",
        address: "Tower B, Suite 1402",
        pincode: "00000",
        // Untrusted extra fields must be stripped by Zod object parsing
        account_status: "active",
        roles: ["admin", "super_admin"],
        email: "attacker@evil.dev",
      });

      expect(parsed.fullName).toBe("Vikramaditya Mehta");
      expect(parsed.country).toBe("AE");
      expect(parsed.buyerType).toBe("architect");
      expect(parsed).not.toHaveProperty("account_status");
      expect(parsed).not.toHaveProperty("roles");
      expect(parsed).not.toHaveProperty("email");
    });

    it("normalizes blank optional buyer fields to null and rejects invalid country or phone", () => {
      const minimal = buyerProfileSchema.parse({
        fullName: "Aarav Sharma",
        phone: "",
        whatsappNumber: "",
        companyName: "",
        buyerType: "",
        country: "in",
        state: "",
        city: "",
        address: "",
        pincode: "",
      });

      expect(minimal.phone).toBeNull();
      expect(minimal.companyName).toBeNull();
      expect(minimal.buyerType).toBeNull();
      expect(minimal.pincode).toBeNull();
      expect(minimal.country).toBe("IN");

      expect(
        buyerProfileSchema.safeParse({
          fullName: "Bad Country",
          country: "IND",
        }).success,
      ).toBe(false);

      expect(
        buyerProfileSchema.safeParse({
          fullName: "Bad Phone",
          phone: "not-a-phone!!",
        }).success,
      ).toBe(false);
    });
  });

  describe("rfqFormSchema", () => {
    const baseRfq = {
      enquiryTitle: "5-Star Hotel Lobby Makrana White Flooring",
      categorySlug: "marble",
      materialType: "Marble",
      stoneOrigin: "Makrana, Rajasthan",
      description:
        "Require bookmatched 20mm polished Makrana white slabs with strict lot uniformity.",
      colour: "White",
      finish: "Polished",
      thickness: "20 mm",
      length: "2800 mm",
      width: "1600 mm",
      surfaceRequirements: "Italian epoxy resin + fiberglass mesh backing",
      customSpecifications: "Water absorption < 0.15%",
      quantity: "4500",
      unit: "sq_ft" as const,
      expectedBudget: "1575000",
      currency: "inr",
      deliveryCountry: "in",
      deliveryState: "Maharashtra",
      deliveryCity: "Mumbai",
      deliveryAddress: "Worli Sea Face Project Site",
      requiredDeliveryDate: "2026-12-15",
      clientRequestId: "11111111-1111-4111-8111-111111111111",
    };

    it("enforces productId in product-specific mode and sellerId in general mode", () => {
      const missingProduct = rfqFormSchema.safeParse({
        ...baseRfq,
        mode: "product",
        productId: "",
      });
      expect(missingProduct.success).toBe(false);

      const validProductMode = rfqFormSchema.safeParse({
        ...baseRfq,
        mode: "product",
        productId: "22222222-2222-4222-8222-222222222222",
      });
      expect(validProductMode.success).toBe(true);
      if (validProductMode.success) {
        expect(validProductMode.data.quantity).toBe(4500);
        expect(validProductMode.data.expectedBudget).toBe(1575000);
        expect(validProductMode.data.currency).toBe("INR");
      }

      const missingSeller = rfqFormSchema.safeParse({
        ...baseRfq,
        mode: "general",
        sellerId: "",
      });
      expect(missingSeller.success).toBe(false);

      const validGeneralMode = rfqFormSchema.safeParse({
        ...baseRfq,
        mode: "general",
        sellerId: "33333333-3333-4333-8333-333333333333",
      });
      expect(validGeneralMode.success).toBe(true);
    });

    it("rejects zero/negative quantities, malformed delivery dates, and missing clientRequestId", () => {
      expect(
        rfqFormSchema.safeParse({
          ...baseRfq,
          mode: "general",
          sellerId: "33333333-3333-4333-8333-333333333333",
          quantity: 0,
        }).success,
      ).toBe(false);

      expect(
        rfqFormSchema.safeParse({
          ...baseRfq,
          mode: "general",
          sellerId: "33333333-3333-4333-8333-333333333333",
          requiredDeliveryDate: "15-12-2026",
        }).success,
      ).toBe(false);

      expect(
        rfqFormSchema.safeParse({
          ...baseRfq,
          mode: "general",
          sellerId: "33333333-3333-4333-8333-333333333333",
          clientRequestId: "not-a-uuid",
        }).success,
      ).toBe(false);
    });
  });

  describe("buyerEnquiryTransitionSchema, buyerQuotationDecisionSchema & buyerPasswordChangeSchema", () => {
    it("restricts buyer enquiry transitions strictly to cancelled or closed", () => {
      expect(
        buyerEnquiryTransitionSchema.safeParse({
          enquiryId: "11111111-1111-4111-8111-111111111111",
          newStatus: "cancelled",
          notes: "Project scope revised by client",
        }).success,
      ).toBe(true);

      expect(
        buyerEnquiryTransitionSchema.safeParse({
          enquiryId: "11111111-1111-4111-8111-111111111111",
          newStatus: "responding",
        }).success,
      ).toBe(false);
    });

    it("restricts buyer quotation decisions strictly to viewed, accepted, or rejected", () => {
      expect(
        buyerQuotationDecisionSchema.safeParse({
          quotationId: "11111111-1111-4111-8111-111111111111",
          decision: "accepted",
        }).success,
      ).toBe(true);

      expect(
        buyerQuotationDecisionSchema.safeParse({
          quotationId: "11111111-1111-4111-8111-111111111111",
          decision: "draft",
        }).success,
      ).toBe(false);
    });

    it("validates password complexity and matching confirmation", () => {
      expect(
        buyerPasswordChangeSchema.safeParse({
          newPassword: "StrongPassword123",
          confirmPassword: "MismatchPassword123",
        }).success,
      ).toBe(false);

      expect(
        buyerPasswordChangeSchema.safeParse({
          newPassword: "StrongPassword123",
          confirmPassword: "StrongPassword123",
        }).success,
      ).toBe(true);
    });
  });
});

