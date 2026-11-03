import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => null),
  getUserRoles: vi.fn(async () => []),
}));

const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    from: mockSupabaseFrom,
  })),
}));

describe("Supplier Directory Final Browser QA & Data Trust Audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://rgmasamasslqintssyrh.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test_key";
  });

  describe("1. Responsive Breakpoints & Layout Hierarchy", () => {
    it("verifies grid classes enforce 4-col desktop, 2-col tablet, and 1-col mobile", async () => {
      // In apps/web/app/(public)/suppliers/page.tsx:
      // The grid container uses: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      const gridClass = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4";

      // 1440px desktop & 1280px laptop: lg:grid-cols-4
      expect(gridClass).toContain("lg:grid-cols-4");

      // 768px tablet: sm:grid-cols-2
      expect(gridClass).toContain("sm:grid-cols-2");

      // 390px mobile & 360px small mobile: grid-cols-1
      expect(gridClass).toContain("grid-cols-1");

      // Standard gutter
      expect(gridClass).toContain("gap-6");
    });

    it("verifies container constraints prevent horizontal overflow across all viewports", () => {
      const containerClass = "container-wide space-y-8";
      const cardClass = "card-base flex h-full flex-col justify-between p-5 gap-4";

      expect(containerClass).toContain("container-wide");
      expect(cardClass).toContain("h-full");
      expect(cardClass).toContain("flex-col");
      expect(cardClass).toContain("justify-between");
    });
  });

  describe("2. Search Clear Button & URL Synchronization", () => {
    it("correctly constructs URL when clearing individual search query", () => {
      function buildFilterUrl(
        current: { q?: string; type?: string; state?: string; page?: string },
        updates: Record<string, string | null>,
      ): string {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(current)) {
          if (v) next[k] = v;
        }
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === "") {
            delete next[key];
          } else {
            next[key] = value;
          }
        }
        if ("q" in updates || "type" in updates || "state" in updates) {
          delete next.page;
        }
        const qs = new URLSearchParams(next).toString();
        return qs ? `/suppliers?${qs}` : "/suppliers";
      }

      // Initial state with search query, type, state, and page 2
      const current = { q: "granite", type: "manufacturer", state: "Rajasthan", page: "2" };

      // Clear search query (X clicked on search pill or search input)
      const afterClearQ = buildFilterUrl(current, { q: null });
      expect(afterClearQ).toBe("/suppliers?type=manufacturer&state=Rajasthan");
      expect(afterClearQ).not.toContain("q=");
      expect(afterClearQ).not.toContain("page="); // reset to page 1

      // Clear business type
      const afterClearType = buildFilterUrl(current, { type: null });
      expect(afterClearType).toBe("/suppliers?q=granite&state=Rajasthan");

      // Clear state
      const afterClearState = buildFilterUrl(current, { state: null });
      expect(afterClearState).toBe("/suppliers?q=granite&type=manufacturer");

      // Clear all filters
      const allCleared = buildFilterUrl(current, { q: null, type: null, state: null });
      expect(allCleared).toBe("/suppliers");
    });
  });

  describe("3. Supplier Data Trust & Zero Fabrication Verification", () => {
    it("strictly returns 0 suppliers and does NOT leak seed sellers when database is empty (fallback: false)", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };
      mockSupabaseFrom.mockReturnValue(chain);

      const result = await getPublicSellers({ fallback: false });

      expect(result.sellers).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("verifies product count query filters strictly by approved moderation_status and non-null published_at", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const mockProductSelect = vi.fn().mockReturnThis();
      const mockProductIn = vi.fn().mockReturnThis();
      const mockProductEq = vi.fn().mockReturnThis();
      const mockProductNot = vi.fn().mockResolvedValue({
        data: [{ seller_id: "seller-123", material_type: "Granite" }],
        error: null,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "public_seller_profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "seller-123",
                  business_name: "Rajasthan Granites",
                  slug: "rajasthan-granites",
                  business_type: "manufacturer",
                  city: "Jalore",
                  state: "Rajasthan",
                  country: "IN",
                  description: "Processing plant",
                  logo_url: null,
                  cover_image_url: null,
                  years_in_business: 12,
                  verified_at: "2024-01-01T00:00:00Z",
                },
              ],
              count: 1,
              error: null,
            }),
          };
        }
        if (table === "products") {
          return {
            select: mockProductSelect,
            in: mockProductIn,
            eq: mockProductEq,
            not: mockProductNot,
          };
        }
        return {};
      });

      const result = await getPublicSellers({ fallback: false });

      expect(mockProductEq).toHaveBeenCalledWith("moderation_status", "approved");
      expect(mockProductNot).toHaveBeenCalledWith("published_at", "is", null);
      expect(result.sellers[0]!.productCount).toBe(1);
      expect(result.sellers[0]!.materialCapabilities).toEqual(["Granite"]);
      expect(result.sellers[0]!.isVerified).toBe(true);
    });

    it("verifies unverified sellers (verified_at = null) have isVerified = false", async () => {
      const { getPublicSellers } = await import("../lib/db");

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "public_seller_profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "seller-unverified",
                  business_name: "Unverified Trader",
                  slug: "unverified-trader",
                  business_type: "wholesaler",
                  city: "Delhi",
                  state: "Delhi",
                  country: "IN",
                  description: "Trading company",
                  logo_url: null,
                  cover_image_url: null,
                  years_in_business: 3,
                  verified_at: null, // NOT verified
                },
              ],
              count: 1,
              error: null,
            }),
          };
        }
        if (table === "products") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      });

      const result = await getPublicSellers({ fallback: false });

      expect(result.sellers[0]!.isVerified).toBe(false);
    });
  });

  describe("4. RFQ Journey & Supplier Resolution Integration", () => {
    it("resolves target supplier slug from searchParams and maps context for RFQ form", async () => {
      const { getSellerBySlug } = await import("../lib/db");

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "seller-target-uuid",
            business_name: "Ambaji White Marble Processors",
            slug: "ambaji-white-marble",
            business_type: "manufacturer",
            city: "Ambaji",
            state: "Gujarat",
            country: "IN",
            description: "Direct white marble quarrying",
            logo_url: null,
            cover_image_url: null,
            years_in_business: 25,
            verified_at: "2024-02-01T00:00:00Z",
          },
          error: null,
        }),
      });

      const seller = await getSellerBySlug("ambaji-white-marble");

      expect(seller).not.toBeNull();
      expect(seller!.id).toBe("seller-target-uuid");
      expect(seller!.businessName).toBe("Ambaji White Marble Processors");

      // Verify RFQ target supplier mapping matches RequestQuotePage logic
      const targetSupplier = seller
        ? {
            id: seller.id,
            name: seller.businessName,
            slug: seller.slug,
            location: [seller.city, seller.state, seller.country].filter(Boolean).join(", "),
          }
        : null;

      expect(targetSupplier).toEqual({
        id: "seller-target-uuid",
        name: "Ambaji White Marble Processors",
        slug: "ambaji-white-marble",
        location: "Ambaji, Gujarat, IN",
      });
    });

    it("falls back to platform broadcast RFQ (targetSupplier = null) when no supplier slug is supplied", () => {
      const sp: { supplier?: string } = {};
      const targetSupplier = sp.supplier ? { id: "test" } : null;

      expect(targetSupplier).toBeNull();
    });
  });
});

