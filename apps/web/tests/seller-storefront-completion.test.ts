import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => null),
  getUserRoles: vi.fn(async () => []),
}));
vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: vi.fn(async () => ({})),
}));
vi.mock("@stone/database/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          single: vi.fn(async () => ({ data: { id: "12345678-aaaa-bbbb-cccc-111122223333" }, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: "12345678-aaaa-bbbb-cccc-111122223333" }, error: null })),
        })),
      })),
    })),
  })),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Seller Storefront Completion — Contact Enquiry & RFQ Flow", () => {
  describe("submitSupplierEnquiry Server Action", () => {
    it("successfully validates and processes a well-formed guest supplier enquiry", async () => {
      const { submitSupplierEnquiry } = await import(
        "../features/enquiry/supplier-enquiry-actions"
      );

      const formData = new FormData();
      formData.set("seller_id", "seller-1");
      formData.set("seller_slug", "royal-makrana-marbles");
      formData.set("seller_name", "Royal Makrana Marbles");
      formData.set("name", "Arjun Mehta");
      formData.set("company_name", "Mehta Stone Studios");
      formData.set("email", "arjun@mehtastone.com");
      formData.set("phone", "+91 98765 43210");
      formData.set("material", "Makrana White Marble");
      formData.set("quantity", "2500");
      formData.set("unit", "sq_ft");
      formData.set("delivery_location", "Mumbai Port");
      formData.set("message", "Require 18mm polished slabs with bookmatch veining for luxury residential villa.");
      formData.set("client_request_id", "11111111-2222-3333-4444-555555555555");

      const result = await submitSupplierEnquiry({ success: false }, formData);

      expect(result.success).toBe(true);
      expect(result.referenceNumber).toMatch(/^ENQ-[A-Z0-9]+$/);
      expect(result.isGuest).toBe(true);
      expect(result.fieldErrors).toBeUndefined();
    });

    it("rejects invalid supplier enquiry with field-level errors", async () => {
      const { submitSupplierEnquiry } = await import(
        "../features/enquiry/supplier-enquiry-actions"
      );

      const formData = new FormData();
      formData.set("seller_id", "seller-1");
      formData.set("seller_slug", "royal-makrana-marbles");
      formData.set("seller_name", "Royal Makrana Marbles");
      formData.set("name", "A"); // too short
      formData.set("email", "not-an-email"); // invalid
      formData.set("phone", "123"); // too short
      formData.set("material", "");
      formData.set("quantity", "-50"); // negative
      formData.set("message", "Hi"); // too short

      const result = await submitSupplierEnquiry({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fieldErrors?.name).toBeDefined();
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.phone).toBeDefined();
      expect(result.fieldErrors?.material).toBeDefined();
      expect(result.fieldErrors?.quantity).toBeDefined();
      expect(result.fieldErrors?.message).toBeDefined();
    });

    it("rejects honeypot bot submissions", async () => {
      const { submitSupplierEnquiry } = await import(
        "../features/enquiry/supplier-enquiry-actions"
      );

      const formData = new FormData();
      formData.set("seller_id", "seller-1");
      formData.set("seller_slug", "royal-makrana-marbles");
      formData.set("seller_name", "Royal Makrana Marbles");
      formData.set("name", "Spam Bot");
      formData.set("email", "bot@spam.com");
      formData.set("phone", "+91 99999 99999");
      formData.set("material", "Marble");
      formData.set("quantity", "1000");
      formData.set("message", "Click this link for cheap stones http://spam.xyz");
      formData.set("hp_website", "http://spam.xyz"); // honeypot filled

      const result = await submitSupplierEnquiry({ success: false }, formData);

      expect(result.success).toBe(false);
    });
  });

  describe("submitPublicRfq Server Action", () => {
    it("successfully validates and processes a full architectural stone RFQ", async () => {
      const { submitPublicRfq } = await import(
        "../features/rfq/public-rfq-actions"
      );

      const formData = new FormData();
      formData.set("supplier_slug", "royal-makrana-marbles");
      formData.set("supplier_id", "seller-1");
      formData.set("material_type", "Marble");
      formData.set("stone_variety", "Makrana Pure White");
      formData.set("quantity", "5000");
      formData.set("unit", "sq_ft");
      formData.set("thickness", "20mm");
      formData.set("finish", "Mirror Polished");
      formData.set("dimensions", "Gangsaw Jumbo Slabs (minimum 8ft x 5ft)");
      formData.set("delivery_location", "Mundra Port (FOB)");
      formData.set("required_delivery_date", "2026-12-15");
      formData.set("projectNotes", "Commercial hotel lobby flooring. Must be packed in fumigated export crates.");
      formData.set("name", "David Sterling");
      formData.set("company_name", "Sterling Architectural Group");
      formData.set("email", "david@sterlingarch.com");
      formData.set("phone", "+971 50 123 4567");
      formData.set("client_request_id", "22222222-3333-4444-5555-666666666666");

      const result = await submitPublicRfq({ success: false }, formData);

      expect(result.success).toBe(true);
      expect(result.referenceNumber).toMatch(/^RFQ-[A-Z0-9]+$/);
      expect(result.isGuest).toBe(true);
      expect(result.fieldErrors).toBeUndefined();
    });

    it("rejects incomplete RFQ with missing delivery location", async () => {
      const { submitPublicRfq } = await import(
        "../features/rfq/public-rfq-actions"
      );

      const formData = new FormData();
      formData.set("material_type", "Granite");
      formData.set("quantity", "1000");
      formData.set("delivery_location", ""); // empty
      formData.set("project_notes", "Need granite slabs");
      formData.set("name", "Test User");
      formData.set("email", "test@example.com");
      formData.set("phone", "+91 98765 43210");

      const result = await submitPublicRfq({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.deliveryLocation).toBeDefined();
    });
  });

  describe("Materials Supplied Dynamic Derivation", () => {
    it("correctly derives distinct sorted materials from products", () => {
      const mockProducts = [
        { id: "1", materialType: "Marble" },
        { id: "2", materialType: "Granite" },
        { id: "3", materialType: "Marble" }, // duplicate
        { id: "4", materialType: "Onyx" },
        { id: "5", materialType: null }, // null check
      ];

      const materialsSupplied = Array.from(
        new Set(
          mockProducts
            .map((p) => p.materialType)
            .filter((m): m is string => Boolean(m))
        )
      ).sort();

      expect(materialsSupplied).toEqual(["Granite", "Marble", "Onyx"]);
      expect(materialsSupplied.length).toBe(3);
    });
  });
});
