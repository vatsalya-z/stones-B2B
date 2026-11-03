import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetCurrentUser = vi.fn();
const mockHasRole = vi.fn();
const mockGetSupabaseServerClient = vi.fn();
const mockGetBuyerQuotationDetail = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  hasRole: (role: string) => mockHasRole(role),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: () => mockGetSupabaseServerClient(),
}));

vi.mock("@/features/buyer/queries", () => ({
  getBuyerQuotationDetail: (...args: unknown[]) => mockGetBuyerQuotationDetail(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}));

import {
  analyzeQuotationComparison,
  buildDeliveryLocationSummary,
  decodeBuyerAddress,
  decodeRfqDescription,
  encodeBuyerAddress,
  encodeRfqDescription,
  generateQuotationPdfBytes,
  getAllowedBuyerEnquiryTransitions,
  getBuyerQuotationActionEligibility,
  parseQuotationCommercialTerms,
} from "../features/buyer/buyer-meta";
import { POST as uploadEnquiryAttachmentHandler } from "../app/api/buyer/enquiries/[enquiryId]/attachments/route";
import { GET as downloadQuotationPdfHandler } from "../app/api/buyer/quotes/[id]/pdf/route";
import { middleware } from "../middleware";

const ENQUIRY_UUID = "11111111-1111-4111-8111-111111111111";
const QUOTE_UUID = "22222222-2222-4222-8222-222222222222";

describe("Phase 5 Buyer Portal Core Domain Logic, PDF Generation & API Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Buyer extended profile metadata & structured RFQ encoding", () => {
    it("round-trips extended buyer profile metadata losslessly in profiles.address", () => {
      const encoded = encodeBuyerAddress({
        cleanAddress: "Plot 44, Nariman Point",
        companyName: "Oberoi Architectural Studio",
        buyerType: "architect",
        whatsappNumber: "+91 98200 11223",
        pincode: "400021",
      });

      const decoded = decodeBuyerAddress(encoded);
      expect(decoded).toEqual({
        cleanAddress: "Plot 44, Nariman Point",
        companyName: "Oberoi Architectural Studio",
        buyerType: "architect",
        whatsappNumber: "+91 98200 11223",
        pincode: "400021",
      });

      // Re-encoding decoded values produces identical string (idempotent)
      expect(encodeBuyerAddress(decoded)).toBe(encoded);
    });

    it("encodes and decodes structured stone RFQ specifications while remaining seller-readable", () => {
      const encoded = encodeRfqDescription({
        mode: "general",
        cleanDescription: "Need uniform gangsaw slabs for airport terminal concourse.",
        categorySlug: "granite",
        materialType: "Granite",
        stoneOrigin: "Ongole, Andhra Pradesh",
        colour: "Black",
        finish: "Flamed",
        thickness: "30 mm",
        length: "3000 mm",
        width: "1800 mm",
        surfaceRequirements: "calibrated +/- 0.5mm",
        customSpecifications: "Slip resistance R11 certified",
        deliveryCountry: "AE",
        deliveryState: "Dubai",
        deliveryCity: "Jebel Ali Port",
        deliveryAddress: "Berth 12 Container Terminal",
      });

      expect(encoded).toContain("Submission Type: General Custom Stone RFQ");
      expect(encoded).toContain("Material Type: Granite");

      const decoded = decodeRfqDescription(encoded);
      expect(decoded.isRfq).toBe(true);
      expect(decoded.rfqMode).toBe("general");
      expect(decoded.cleanDescription).toBe(
        "Need uniform gangsaw slabs for airport terminal concourse.",
      );
      expect(decoded.materialType).toBe("Granite");
      expect(decoded.stoneOrigin).toBe("Ongole, Andhra Pradesh");
      expect(decoded.thickness).toBe("30 mm");
      expect(decoded.deliveryCity).toBe("Jebel Ali Port");

      expect(
        buildDeliveryLocationSummary({
          deliveryAddress: "Berth 12",
          deliveryCity: "Jebel Ali",
          deliveryState: "Dubai",
          deliveryCountry: "ae",
        }),
      ).toBe("Berth 12, Jebel Ali, Dubai, AE");
    });
  });

  describe("Buyer enquiry transitions & quotation decision eligibility", () => {
    it("matches PostgreSQL transition_enquiry_status buyer permissions", () => {
      expect(getAllowedBuyerEnquiryTransitions("submitted").map((a) => a.status)).toEqual([
        "cancelled",
      ]);
      expect(getAllowedBuyerEnquiryTransitions("quoted").map((a) => a.status)).toEqual([
        "cancelled",
      ]);
      expect(getAllowedBuyerEnquiryTransitions("accepted").map((a) => a.status)).toEqual([
        "closed",
      ]);
      expect(getAllowedBuyerEnquiryTransitions("cancelled")).toEqual([]);
      expect(getAllowedBuyerEnquiryTransitions("closed")).toEqual([]);
    });

    it("blocks acceptance on expired quotations while permitting rejection", () => {
      const now = new Date("2026-11-15T12:00:00Z");

      const active = getBuyerQuotationActionEligibility(
        "sent",
        "2026-11-30T23:59:59Z",
        now,
      );
      expect(active.canMarkViewed).toBe(true);
      expect(active.canAccept).toBe(true);
      expect(active.canReject).toBe(true);
      expect(active.isExpired).toBe(false);

      const expired = getBuyerQuotationActionEligibility(
        "viewed",
        "2026-11-01T00:00:00Z",
        now,
      );
      expect(expired.canAccept).toBe(false);
      expect(expired.canReject).toBe(true);
      expect(expired.isExpired).toBe(true);
      expect(expired.ineligibleReason).toMatch(/validity date has passed/i);

      const alreadyAccepted = getBuyerQuotationActionEligibility(
        "accepted",
        "2026-11-30T23:59:59Z",
        now,
      );
      expect(alreadyAccepted.canAccept).toBe(false);
      expect(alreadyAccepted.canReject).toBe(false);
    });

    it("parses payment terms, delivery terms, and additional commercial conditions", () => {
      const parsed = parseQuotationCommercialTerms(
        "Payment Terms: 40% advance, 60% against BL copy\nIncoterms: FOB Mundra Port\nWooden fumigated seaworthy crates included.",
        "2026-12-01T00:00:00Z",
      );
      expect(parsed.paymentTerms).toBe("40% advance, 60% against BL copy");
      expect(parsed.deliveryTerms).toBe("FOB Mundra Port");
      expect(parsed.additionalConditions).toContain("Wooden fumigated seaworthy crates");
    });
  });

  describe("Quotation comparison compatibility & currency safety", () => {
    const now = new Date("2026-11-10T00:00:00Z");

    it("identifies lowest eligible active total and deltas when currency and quantity/unit match", () => {
      const analysis = analyzeQuotationComparison(
        [
          {
            id: "q-1",
            quoteNumber: "QT-001",
            enquiryId: "enq-1",
            sellerName: "Makrana Supplier A",
            sellerVerificationStatus: "verified",
            currency: "INR",
            subtotal: 500000,
            taxAmount: 90000,
            shippingCharges: 15000,
            discountAmount: 5000,
            totalAmount: 600000,
            validUntil: "2026-12-01T00:00:00Z",
            status: "sent",
            totalQuantity: 2000,
            primaryUnit: "sq_ft",
            hasMixedUnits: false,
            effectiveUnitPrice: 300,
          },
          {
            id: "q-2",
            quoteNumber: "QT-002",
            enquiryId: "enq-1",
            sellerName: "Kishangarh Supplier B",
            sellerVerificationStatus: "verified",
            currency: "INR",
            subtotal: 540000,
            taxAmount: 97200,
            shippingCharges: 22800,
            discountAmount: 0,
            totalAmount: 660000,
            validUntil: "2026-12-01T00:00:00Z",
            status: "viewed",
            totalQuantity: 2000,
            primaryUnit: "sq_ft",
            hasMixedUnits: false,
            effectiveUnitPrice: 330,
          },
        ],
        now,
      );

      expect(analysis.isDirectlyComparable).toBe(true);
      expect(analysis.lowestTotalQuotationId).toBe("q-1");
      expect(analysis.priceSpread).toBe(60000);
      expect(analysis.deltasById["q-1"]?.isLowestEligible).toBe(true);
      expect(analysis.deltasById["q-2"]?.deltaAmount).toBe(60000);
      expect(analysis.deltasById["q-2"]?.deltaPercent).toBe(10);
    });

    it("never highlights a lowest total across incompatible currencies (INR vs USD)", () => {
      const analysis = analyzeQuotationComparison(
        [
          {
            id: "q-inr",
            quoteNumber: "QT-INR",
            enquiryId: "enq-1",
            sellerName: "Domestic Mill",
            sellerVerificationStatus: "verified",
            currency: "INR",
            subtotal: 600000,
            taxAmount: 0,
            shippingCharges: 0,
            discountAmount: 0,
            totalAmount: 600000,
            validUntil: "2026-12-01T00:00:00Z",
            status: "sent",
            totalQuantity: 2000,
            primaryUnit: "sq_ft",
            hasMixedUnits: false,
            effectiveUnitPrice: 300,
          },
          {
            id: "q-usd",
            quoteNumber: "QT-USD",
            enquiryId: "enq-1",
            sellerName: "Export Division",
            sellerVerificationStatus: "verified",
            currency: "USD",
            subtotal: 8000,
            taxAmount: 0,
            shippingCharges: 0,
            discountAmount: 0,
            totalAmount: 8000,
            validUntil: "2026-12-01T00:00:00Z",
            status: "sent",
            totalQuantity: 2000,
            primaryUnit: "sq_ft",
            hasMixedUnits: false,
            effectiveUnitPrice: 4,
          },
        ],
        now,
      );

      expect(analysis.hasUniformCurrency).toBe(false);
      expect(analysis.isDirectlyComparable).toBe(false);
      expect(analysis.lowestTotalQuotationId).toBeNull();
      expect(analysis.incompatibilityReasons.join(" ")).toMatch(/Incompatible currencies/i);
    });

    it("disables lowest-total highlighting when quantities or units differ", () => {
      const analysis = analyzeQuotationComparison(
        [
          {
            id: "q-a",
            quoteNumber: "QT-A",
            enquiryId: "enq-1",
            sellerName: "Supplier A",
            sellerVerificationStatus: "verified",
            currency: "INR",
            subtotal: 300000,
            taxAmount: 0,
            shippingCharges: 0,
            discountAmount: 0,
            totalAmount: 300000,
            validUntil: "2026-12-01T00:00:00Z",
            status: "sent",
            totalQuantity: 1000,
            primaryUnit: "sq_ft",
            hasMixedUnits: false,
            effectiveUnitPrice: 300,
          },
          {
            id: "q-b",
            quoteNumber: "QT-B",
            enquiryId: "enq-1",
            sellerName: "Supplier B",
            sellerVerificationStatus: "verified",
            currency: "INR",
            subtotal: 550000,
            taxAmount: 0,
            shippingCharges: 0,
            discountAmount: 0,
            totalAmount: 550000,
            validUntil: "2026-12-01T00:00:00Z",
            status: "sent",
            totalQuantity: 2000,
            primaryUnit: "sq_ft",
            hasMixedUnits: false,
            effectiveUnitPrice: 275,
          },
        ],
        now,
      );

      expect(analysis.hasComparableQuantities).toBe(false);
      expect(analysis.lowestTotalQuotationId).toBeNull();
    });
  });

  describe("Commercial Quotation PDF Generator", () => {
    it("generates a valid %PDF-1.4 document with commercial quotation disclaimer (not an invoice)", () => {
      const pdfBytes = generateQuotationPdfBytes({
        quoteNumber: "QT-20261031-9001",
        status: "sent",
        createdAt: "2026-10-31T08:30:00Z",
        validUntil: "2026-11-30T23:59:59Z",
        currency: "INR",
        enquiryTitle: "Makrana White Flooring",
        enquiryReference: "RFQ-11111111",
        seller: {
          businessName: "Royal Makrana Marbles Pvt Ltd",
          location: "Makrana, Rajasthan, IN",
          isVerified: true,
        },
        buyer: {
          name: "Mehta Builders",
          deliveryLocation: "Mumbai, Maharashtra, IN",
        },
        items: [
          {
            description: "Makrana Pure White 20mm Polished Gangsaw Slabs",
            quantity: 2500,
            unit: "sq_ft",
            unitPrice: 320,
            totalPrice: 800000,
          },
        ],
        subtotal: 800000,
        discountAmount: 20000,
        taxAmount: 140400,
        shippingCharges: 25000,
        totalAmount: 945400,
        terms: "Payment Terms: 50% advance\nDelivery Terms: Ex-Factory Makrana",
      });

      const pdfText = new TextDecoder().decode(pdfBytes);
      expect(pdfText.startsWith("%PDF-1.4\n")).toBe(true);
      expect(pdfText.trimEnd().endsWith("%%EOF")).toBe(true);
      expect(pdfText).toContain("QT-20261031-9001");
      expect(pdfText).toContain("Royal Makrana Marbles Pvt Ltd");
      expect(pdfText).toContain("COMMERCIAL QUOTATION ONLY - NOT A TAX INVOICE");
    });
  });

  describe("Buyer Attachment Upload & Quotation PDF API Security", () => {
    it("blocks unauthenticated attachment uploads with 401", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null);
      const req = new NextRequest(
        `http://localhost:3001/api/buyer/enquiries/${ENQUIRY_UUID}/attachments`,
        { method: "POST" },
      );

      const res = await uploadEnquiryAttachmentHandler(req, {
        params: Promise.resolve({ enquiryId: ENQUIRY_UUID }),
      });
      expect(res.status).toBe(401);
    });

    it("blocks seller-only accounts without buyer role with 403", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: "seller-only-user" });
      mockHasRole.mockResolvedValueOnce(false);

      const req = new NextRequest(
        `http://localhost:3001/api/buyer/enquiries/${ENQUIRY_UUID}/attachments`,
        { method: "POST" },
      );

      const res = await uploadEnquiryAttachmentHandler(req, {
        params: Promise.resolve({ enquiryId: ENQUIRY_UUID }),
      });
      expect(res.status).toBe(403);
    });

    it("blocks cross-buyer IDOR attachment uploads with 404 BEFORE touching Supabase Storage", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: "buyer-b" });
      mockHasRole.mockResolvedValueOnce(true);

      const storageUploadSpy = vi.fn();
      mockGetSupabaseServerClient.mockResolvedValueOnce({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
        }),
        storage: {
          from: () => ({ upload: storageUploadSpy }),
        },
      });

      const req = new NextRequest(
        `http://localhost:3001/api/buyer/enquiries/${ENQUIRY_UUID}/attachments`,
        { method: "POST" },
      );

      const res = await uploadEnquiryAttachmentHandler(req, {
        params: Promise.resolve({ enquiryId: ENQUIRY_UUID }),
      });
      expect(res.status).toBe(404);
      expect(storageUploadSpy).not.toHaveBeenCalled();
    });

    it("rejects spoofed PDF bytes with 400 and uploads genuine %PDF- files under <enquiryId>/", async () => {
      // 1. Spoofed file
      mockGetCurrentUser.mockResolvedValueOnce({ id: "buyer-a" });
      mockHasRole.mockResolvedValueOnce(true);
      const storageUploadSpy = vi.fn().mockResolvedValue({ error: null });
      const createSignedUrlSpy = vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.example.com/private-boq.pdf" },
      });

      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: ENQUIRY_UUID, buyer_id: "buyer-a", status: "submitted" },
                }),
              }),
            }),
          }),
        }),
        storage: {
          from: () => ({
            list: async () => ({ data: [] }),
            upload: storageUploadSpy,
            createSignedUrl: createSignedUrlSpy,
          }),
        },
      };
      mockGetSupabaseServerClient.mockResolvedValueOnce(mockSupabase);

      const badForm = new FormData();
      badForm.append(
        "file",
        new File([new TextEncoder().encode("<html>exe</html>")], "boq.pdf", {
          type: "application/pdf",
        }),
      );
      const badReq = new NextRequest(
        `http://localhost:3001/api/buyer/enquiries/${ENQUIRY_UUID}/attachments`,
        { method: "POST", body: badForm },
      );
      const badRes = await uploadEnquiryAttachmentHandler(badReq, {
        params: Promise.resolve({ enquiryId: ENQUIRY_UUID }),
      });
      expect(badRes.status).toBe(400);
      expect(storageUploadSpy).not.toHaveBeenCalled();

      // 2. Genuine %PDF-1.4 file
      mockGetCurrentUser.mockResolvedValueOnce({ id: "buyer-a" });
      mockHasRole.mockResolvedValueOnce(true);
      mockGetSupabaseServerClient.mockResolvedValueOnce(mockSupabase);

      const validPdfBytes = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
      const goodForm = new FormData();
      goodForm.append(
        "file",
        new File([validPdfBytes], "Project BOQ Schedule.pdf", {
          type: "application/pdf",
        }),
      );
      const goodReq = new NextRequest(
        `http://localhost:3001/api/buyer/enquiries/${ENQUIRY_UUID}/attachments`,
        { method: "POST", body: goodForm },
      );
      const goodRes = await uploadEnquiryAttachmentHandler(goodReq, {
        params: Promise.resolve({ enquiryId: ENQUIRY_UUID }),
      });

      expect(goodRes.status).toBe(200);
      const payload = (await goodRes.json()) as {
        storagePath: string;
        signedUrl: string;
        mimeType: string;
      };
      expect(payload.storagePath.startsWith(`${ENQUIRY_UUID}/`)).toBe(true);
      expect(payload.mimeType).toBe("application/pdf");
      expect(payload.signedUrl).toBe("https://signed.example.com/private-boq.pdf");
    });

    it("enforces authentication and buyer ownership on GET /api/buyer/quotes/[id]/pdf", async () => {
      // Anonymous -> 401
      mockGetCurrentUser.mockResolvedValueOnce(null);
      const anonRes = await downloadQuotationPdfHandler(
        new NextRequest(`http://localhost:3001/api/buyer/quotes/${QUOTE_UUID}/pdf`),
        { params: Promise.resolve({ id: QUOTE_UUID }) },
      );
      expect(anonRes.status).toBe(401);

      // Cross-buyer quotation -> 404
      mockGetCurrentUser.mockResolvedValueOnce({ id: "buyer-b", email: "b@test.dev" });
      mockHasRole.mockResolvedValueOnce(true);
      mockGetBuyerQuotationDetail.mockResolvedValueOnce(null);
      const crossRes = await downloadQuotationPdfHandler(
        new NextRequest(`http://localhost:3001/api/buyer/quotes/${QUOTE_UUID}/pdf`),
        { params: Promise.resolve({ id: QUOTE_UUID }) },
      );
      expect(crossRes.status).toBe(404);

      // Authorized owner -> 200 application/pdf
      mockGetCurrentUser.mockResolvedValueOnce({ id: "buyer-a", email: "a@test.dev" });
      mockHasRole.mockResolvedValueOnce(true);
      mockGetBuyerQuotationDetail.mockResolvedValueOnce({
        quotation: {
          id: QUOTE_UUID,
          quote_number: "QT-2026-500",
          status: "sent",
          created_at: "2026-10-31T10:00:00Z",
          valid_until: "2026-11-30T10:00:00Z",
          currency: "INR",
          subtotal: 300000,
          discount_amount: 0,
          tax_amount: 54000,
          shipping_charges: 10000,
          total_amount: 364000,
          terms: "50% advance",
        },
        items: [
          {
            id: "item-1",
            description: "Kota Blue Honed Tiles",
            quantity: 3000,
            unit: "sq_ft",
            unit_price: 100,
            total_price: 300000,
          },
        ],
        enquiry: {
          id: ENQUIRY_UUID,
          enquiry_title: "Commercial Courtyard Paving",
          delivery_location: "Pune, Maharashtra, IN",
        },
        enquiryReference: "RFQ-11111111",
        seller: {
          businessName: "Kota Stone Works",
          city: "Kota",
          state: "Rajasthan",
          country: "IN",
          isVerified: true,
        },
        buyerProfile: {
          full_name: "Aarav Buyer",
          email: "a@test.dev",
        },
      });

      const okRes = await downloadQuotationPdfHandler(
        new NextRequest(`http://localhost:3001/api/buyer/quotes/${QUOTE_UUID}/pdf`),
        { params: Promise.resolve({ id: QUOTE_UUID }) },
      );
      expect(okRes.status).toBe(200);
      expect(okRes.headers.get("Content-Type")).toBe("application/pdf");
      expect(okRes.headers.get("Cache-Control")).toContain("private");
      const bytes = new Uint8Array(await okRes.arrayBuffer());
      expect(new TextDecoder().decode(bytes).startsWith("%PDF-1.4")).toBe(true);
    });

    it("redirects unauthenticated /buyer/* requests to /login while preserving query parameters", async () => {
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

      for (const protectedPath of [
        "/buyer/dashboard",
        "/buyer/profile",
        "/buyer/enquiries",
        "/buyer/rfqs",
        "/buyer/rfqs/new?product=makrana-white-marble",
        "/buyer/quotes",
        "/buyer/quotes/compare?ids=a,b",
        "/buyer/favourites",
        "/buyer/notifications",
        "/buyer/settings",
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

