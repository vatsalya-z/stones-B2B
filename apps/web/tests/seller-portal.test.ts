import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetCurrentUser = vi.fn();
const mockHasRole = vi.fn();
const mockGetSupabaseServerClient = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  hasRole: (role: string) => mockHasRole(role),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: () => mockGetSupabaseServerClient(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  buildProductSpecificationRows,
  checkVerificationReadiness,
  computeQuotationTotals,
  decodeSellerDescription,
  encodeSellerDescription,
  extractProductSpecifications,
  getAllowedSellerEnquiryTransitions,
} from "../features/seller/seller-meta";
import { POST as uploadProductImageHandler } from "../app/api/seller/products/[productId]/images/route";
import { POST as uploadVerificationDocHandler } from "../app/api/seller/verification/documents/route";
import { middleware } from "../middleware";

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}));

describe("Phase 4 Seller Portal Core Logic & Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Seller capabilities & storefront preferences encoding", () => {
    it("round-trips capabilities, stone categories, and public trade preferences cleanly", () => {
      const encoded = encodeSellerDescription({
        cleanDescription: "ISO-certified multi-wire granite & marble processing facility.",
        hasManufacturing: true,
        hasQuarry: true,
        hasExport: false,
        productCategories: ["Marble", "Granite", "Quartzite"],
        showWebsitePublicly: false,
        acceptBulkExportEnquiries: true,
      });

      const decoded = decodeSellerDescription(encoded);
      expect(decoded.cleanDescription).toBe(
        "ISO-certified multi-wire granite & marble processing facility.",
      );
      expect(decoded.hasManufacturing).toBe(true);
      expect(decoded.hasQuarry).toBe(true);
      expect(decoded.hasExport).toBe(false);
      expect(decoded.productCategories).toEqual(["Marble", "Granite", "Quartzite"]);
      expect(decoded.showWebsitePublicly).toBe(false);
      expect(decoded.acceptBulkExportEnquiries).toBe(true);
    });
  });

  describe("Structured product specifications mapping", () => {
    it("maps structured Section B/D/F fields and custom specs without collision", () => {
      const rows = buildProductSpecificationRows({
        productId: "prod-1",
        availableSizes: "Gangsaw 9x6 ft",
        surfaceTreatment: "Epoxy Resin + Mesh",
        availableQuantity: "12,000 sq. ft.",
        packagingInfo: "Seaworthy wooden bundles",
        seoTitle: "Makrana White Slabs Wholesale",
        seoDescription: "Direct quarry Makrana white marble slabs.",
        customSpecifications: [
          { name: "Water Absorption", value: "0.12%" },
          { name: "Compressive Strength", value: "115 MPa" },
        ],
      });

      const extracted = extractProductSpecifications(rows);
      expect(extracted.availableSizes).toBe("Gangsaw 9x6 ft");
      expect(extracted.surfaceTreatment).toBe("Epoxy Resin + Mesh");
      expect(extracted.availableQuantity).toBe("12,000 sq. ft.");
      expect(extracted.packagingInfo).toBe("Seaworthy wooden bundles");
      expect(extracted.seoTitle).toBe("Makrana White Slabs Wholesale");
      expect(extracted.seoDescription).toBe("Direct quarry Makrana white marble slabs.");
      expect(extracted.customSpecifications).toEqual([
        { name: "Water Absorption", value: "0.12%" },
        { name: "Compressive Strength", value: "115 MPa" },
      ]);
    });
  });

  describe("Verification readiness & enquiry workflow transitions", () => {
    it("requires all compliance fields and >= 1 document before enabling submission", () => {
      const incomplete = checkVerificationReadiness(
        {
          business_name: "Aravalli Stones",
          business_email: "info@aravalli.in",
          phone: "+919829012345",
          gst_number: null,
          business_address: "Plot 12",
          city: "Kishangarh",
          state: "Rajasthan",
          pincode: "305801",
          verification_status: "draft",
        },
        1,
      );
      expect(incomplete.isReady).toBe(false);

      const ready = checkVerificationReadiness(
        {
          business_name: "Aravalli Stones",
          business_email: "info@aravalli.in",
          phone: "+919829012345",
          gst_number: "08AABCU9603R1ZM",
          business_address: "Plot 12",
          city: "Kishangarh",
          state: "Rajasthan",
          pincode: "305801",
          verification_status: "rejected",
        },
        1,
      );
      expect(ready.isReady).toBe(true);
    });

    it("returns exact allowed seller enquiry transitions per status", () => {
      expect(getAllowedSellerEnquiryTransitions("submitted").map((t) => t.status)).toEqual([
        "viewed",
        "responding",
        "rejected",
      ]);
      expect(getAllowedSellerEnquiryTransitions("quoted").map((t) => t.status)).toEqual([
        "closed",
      ]);
      expect(getAllowedSellerEnquiryTransitions("cancelled")).toEqual([]);
    });
  });

  describe("Deterministic quotation totals (PostgreSQL check-constraint parity)", () => {
    it("calculates exact 2-decimal totals matching Postgres round(quantity * unit_price, 2)", () => {
      const summary = computeQuotationTotals({
        items: [
          {
            description: "Makrana White 20mm",
            quantity: 33.333,
            unit: "sq_ft",
            unitPrice: 285.55,
          },
          {
            description: "Edge Cutting",
            quantity: 120,
            unit: "piece",
            unitPrice: 45,
          },
        ],
        discountAmount: 918.24,
        taxAmount: 2520,
        shippingCharges: 4500,
      });

      // 33.333 * 285.55 = 9518.23815 -> 9518.24 + 5400.00 = 14918.24
      expect(summary.items[0]?.totalPrice).toBe(9518.24);
      expect(summary.subtotal).toBe(14918.24);
      expect(summary.totalAmount).toBe(21020);
    });

    it("throws when discount exceeds subtotal", () => {
      expect(() =>
        computeQuotationTotals({
          items: [
            { description: "Sample Tile", quantity: 10, unit: "piece", unitPrice: 100 },
          ],
          discountAmount: 1000.01,
        }),
      ).toThrow(/cannot exceed/);
    });
  });

  describe("Upload Route Security & Cross-Seller Ownership Enforcement", () => {
    it("blocks unauthenticated product image upload attempts with 401", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null);
      const req = new NextRequest(
        "http://localhost:3001/api/seller/products/prod-123/images",
        { method: "POST" },
      );

      const res = await uploadProductImageHandler(req, {
        params: Promise.resolve({ productId: "prod-123" }),
      });
      expect(res.status).toBe(401);
    });

    it("blocks non-seller accounts from uploading product images with 403", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: "buyer-1" });
      mockHasRole.mockResolvedValueOnce(false);

      const req = new NextRequest(
        "http://localhost:3001/api/seller/products/prod-123/images",
        { method: "POST" },
      );

      const res = await uploadProductImageHandler(req, {
        params: Promise.resolve({ productId: "prod-123" }),
      });
      expect(res.status).toBe(403);
    });

    it("blocks cross-seller IDOR upload attempts BEFORE touching Supabase Storage", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: "seller-user-b" });
      mockHasRole.mockResolvedValueOnce(true);

      const storageUploadSpy = vi.fn();
      mockGetSupabaseServerClient.mockResolvedValueOnce({
        from: (table: string) => {
          if (table === "seller_profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: "seller-b", verification_status: "verified" },
                  }),
                }),
              }),
            };
          }
          if (table === "products") {
            // Product belongs to seller-a, so query filtered by seller_id = seller-b returns null
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
        storage: {
          from: () => ({ upload: storageUploadSpy }),
        },
      });

      const form = new FormData();
      form.append(
        "file",
        new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(20).fill(0)])], "a.jpg", {
          type: "image/jpeg",
        }),
      );

      const req = new NextRequest(
        "http://localhost:3001/api/seller/products/seller-a-product/images",
        { method: "POST", body: form },
      );

      const res = await uploadProductImageHandler(req, {
        params: Promise.resolve({ productId: "seller-a-product" }),
      });

      expect(res.status).toBe(403);
      expect(storageUploadSpy).not.toHaveBeenCalled();
    });

    it("rejects spoofed verification document bytes with 400 before storage upload", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: "seller-user-a" });
      mockHasRole.mockResolvedValueOnce(true);

      const storageUploadSpy = vi.fn();
      mockGetSupabaseServerClient.mockResolvedValueOnce({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "seller-a", verification_status: "draft" },
              }),
            }),
          }),
        }),
        storage: {
          from: () => ({ upload: storageUploadSpy }),
        },
      });

      const form = new FormData();
      form.append("documentType", "gst_certificate");
      form.append(
        "file",
        new File([new TextEncoder().encode("not-a-real-pdf-file")], "fake.pdf", {
          type: "application/pdf",
        }),
      );

      const req = new NextRequest(
        "http://localhost:3001/api/seller/verification/documents",
        { method: "POST", body: form },
      );

      const res = await uploadVerificationDocHandler(req);
      expect(res.status).toBe(400);
      expect(storageUploadSpy).not.toHaveBeenCalled();
    });

    it("redirects unauthenticated /seller/* requests to /login with next parameter", async () => {
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

      for (const protectedPath of [
        "/seller/dashboard",
        "/seller/profile",
        "/seller/verification",
        "/seller/products",
        "/seller/products/new",
        "/seller/enquiries",
        "/seller/quotes",
        "/seller/store",
        "/seller/analytics",
      ]) {
        const req = new NextRequest(`http://localhost:3001${protectedPath}`);
        const res = await middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location") ?? "";
        expect(location).toContain("/login");
        expect(location).toContain(encodeURIComponent(protectedPath));
      }

      process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
    });
  });
});
