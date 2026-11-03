import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => null),
  getUserRoles: vi.fn(async () => []),
}));
vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: vi.fn(async () => ({})),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Section 3 & 5 — Idempotency Concurrency & Security Gate Tests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("Simultaneous concurrent submissions (Race Condition Simulation)", () => {
    it("handles simultaneous duplicate requests with code 23505 and returns identical reference number without DB crash", async () => {
      const fixedEnquiryId = "12345678-aaaa-bbbb-cccc-999988887777";
      let insertAttempts = 0;

      // Mock database simulating Postgres unique constraint error on the second concurrent insert
      vi.doMock("@stone/database/admin", () => ({
        createAdminClient: vi.fn(() => ({
          from: vi.fn((table: string) => {
            if (table === "seller_profiles") {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: { id: "seller-uuid-1", business_email: "seller@test.com", business_name: "Seller One" },
                      error: null,
                    })),
                  })),
                })),
              };
            }
            if (table === "enquiries") {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    // Initial idempotency check: both requests see no existing row yet (true race condition)
                    maybeSingle: vi.fn(async () => {
                      if (insertAttempts > 0) {
                        return {
                          data: {
                            id: fixedEnquiryId,
                            buyer_id: null,
                            guest_email: "arjun@concurrent.com",
                          },
                          error: null,
                        };
                      }
                      return { data: null, error: null };
                    }),
                  })),
                })),
                insert: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(async () => {
                      insertAttempts++;
                      if (insertAttempts === 1) {
                        // First request succeeds
                        return { data: { id: fixedEnquiryId }, error: null };
                      }
                      // Second concurrent request hits Postgres unique index violation (code 23505)
                      return {
                        data: null,
                        error: {
                          code: "23505",
                          message: 'duplicate key value violates unique constraint "enquiries_guest_idempotency_idx"',
                        },
                      };
                    }),
                  })),
                })),
              };
            }
            return {};
          }),
        })),
      }));

      const { submitSupplierEnquiry } = await import("../features/enquiry/supplier-enquiry-actions");

      const createFormData = () => {
        const formData = new FormData();
        formData.set("seller_id", "seller-uuid-1");
        formData.set("seller_slug", "seller-one");
        formData.set("seller_name", "Seller One");
        formData.set("name", "Arjun Mehta");
        formData.set("email", "arjun@concurrent.com");
        formData.set("phone", "+91 98765 43210");
        formData.set("material", "Makrana Marble");
        formData.set("quantity", "1000");
        formData.set("unit", "sq_ft");
        formData.set("message", "Simultaneous request test requirement for natural stone.");
        formData.set("client_request_id", "77777777-8888-9999-aaaa-bbbbccccdddd");
        return formData;
      };

      // Launch both requests simultaneously
      const [res1, res2] = await Promise.all([
        submitSupplierEnquiry({ success: false }, createFormData()),
        submitSupplierEnquiry({ success: false }, createFormData()),
      ]);

      expect(res1.success).toBe(true);
      expect(res1.referenceNumber).toBe("ENQ-12345678");

      // Request 2 caught the 23505 race condition, verified identity, and returned the exact same reference safely
      expect(res2.success).toBe(true);
      expect(res2.referenceNumber).toBe("ENQ-12345678");
    });

    it("prevents an attacker from accessing or claiming another guest's enquiry reference via client_request_id collision", async () => {
      const victimEnquiryId = "11111111-2222-3333-4444-555555555555";

      vi.doMock("@stone/database/admin", () => ({
        createAdminClient: vi.fn(() => ({
          from: vi.fn((table: string) => {
            if (table === "seller_profiles") {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: { id: "seller-uuid-1", business_email: "seller@test.com", business_name: "Seller" },
                      error: null,
                    })),
                  })),
                })),
              };
            }
            if (table === "enquiries") {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    // Attacker probes an existing client_request_id that belongs to victim@stone.com
                    maybeSingle: vi.fn(async () => ({
                      data: {
                        id: victimEnquiryId,
                        buyer_id: null,
                        guest_email: "victim@stone.com",
                      },
                      error: null,
                    })),
                  })),
                })),
                insert: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: { id: "99999999-0000-1111-2222-333333333333" },
                      error: null,
                    })),
                  })),
                })),
              };
            }
            return {};
          }),
        })),
      }));

      const { submitSupplierEnquiry } = await import("../features/enquiry/supplier-enquiry-actions");

      const attackerFormData = new FormData();
      attackerFormData.set("seller_id", "seller-uuid-1");
      attackerFormData.set("seller_slug", "seller-one");
      attackerFormData.set("seller_name", "Seller One");
      attackerFormData.set("name", "Mallory Attacker");
      attackerFormData.set("email", "attacker@evil.com"); // DIFFERENT email from victim
      attackerFormData.set("phone", "+91 99999 88888");
      attackerFormData.set("material", "Granite");
      attackerFormData.set("quantity", "500");
      attackerFormData.set("unit", "sq_ft");
      attackerFormData.set("message", "Trying to probe someone else's client_request_id reference.");
      attackerFormData.set("client_request_id", "victim-colliding-client-id");

      const result = await submitSupplierEnquiry({ success: false }, attackerFormData);

      // Result must NOT return victim's reference number!
      expect(result.success).toBe(true);
      expect(result.referenceNumber).not.toBe(`ENQ-${victimEnquiryId.slice(0, 8).toUpperCase()}`);
      expect(result.referenceNumber).toBe("ENQ-99999999");
    });
  });

  describe("Calendar Date Validation in RFQ Server Action", () => {
    it("rejects non-existent calendar date 2026-02-29 with clean field error", async () => {
      const { submitPublicRfq } = await import("../features/rfq/public-rfq-actions");

      const formData = new FormData();
      formData.set("material_type", "Granite");
      formData.set("quantity", "1000");
      formData.set("unit", "sq_ft");
      formData.set("delivery_location", "Kolkata Port");
      formData.set("required_delivery_date", "2026-02-29"); // 2026 is NOT a leap year!
      formData.set("project_notes", "Commercial project requirement for granite slabs.");
      formData.set("name", "Rohan Verma");
      formData.set("email", "rohan@project.com");
      formData.set("phone", "+91 98765 43210");

      const result = await submitPublicRfq({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.requiredDeliveryDate).toBeDefined();
      expect(result.fieldErrors?.requiredDeliveryDate).toMatch(/calendar/i);
    });

    it("rejects extreme invalid dates such as 2026-99-99", async () => {
      const { submitPublicRfq } = await import("../features/rfq/public-rfq-actions");

      const formData = new FormData();
      formData.set("material_type", "Granite");
      formData.set("quantity", "1000");
      formData.set("unit", "sq_ft");
      formData.set("delivery_location", "Kolkata Port");
      formData.set("required_delivery_date", "2026-99-99");
      formData.set("project_notes", "Commercial project requirement for granite slabs.");
      formData.set("name", "Rohan Verma");
      formData.set("email", "rohan@project.com");
      formData.set("phone", "+91 98765 43210");

      const result = await submitPublicRfq({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.requiredDeliveryDate).toBeDefined();
    });

    it("accepts valid leap year date 2024-02-29", async () => {
      const { submitPublicRfq } = await import("../features/rfq/public-rfq-actions");

      const formData = new FormData();
      formData.set("material_type", "Granite");
      formData.set("quantity", "1000");
      formData.set("unit", "sq_ft");
      formData.set("delivery_location", "Kolkata Port");
      formData.set("required_delivery_date", "2024-02-29"); // Valid leap year
      formData.set("project_notes", "Commercial project requirement for granite slabs.");
      formData.set("name", "Rohan Verma");
      formData.set("email", "rohan@project.com");
      formData.set("phone", "+91 98765 43210");

      const result = await submitPublicRfq({ success: false }, formData);

      expect(result.fieldErrors?.requiredDeliveryDate).toBeUndefined();
    });
  });

  describe("Phone formatting and validation", () => {
    it("rejects phone numbers with fewer than 7 numeric digits", async () => {
      const { submitSupplierEnquiry } = await import("../features/enquiry/supplier-enquiry-actions");

      const formData = new FormData();
      formData.set("seller_id", "seller-uuid-1");
      formData.set("seller_slug", "seller-one");
      formData.set("seller_name", "Seller One");
      formData.set("name", "Dev Sharma");
      formData.set("email", "dev@example.com");
      formData.set("phone", "+91 123"); // only 5 digits
      formData.set("material", "Sandstone");
      formData.set("quantity", "500");
      formData.set("unit", "sq_ft");
      formData.set("message", "Need sandstone slabs for exterior cladding project.");

      const result = await submitSupplierEnquiry({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.phone).toBeDefined();
    });
  });
});
