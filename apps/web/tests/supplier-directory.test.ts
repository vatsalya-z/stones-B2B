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

describe("Supplier Directory (/suppliers) — Data Trust, Queries & Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://rgmasamasslqintssyrh.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test_key";
  });

  describe("getPublicSellers Database Query & Search Behavior", () => {
    it("searches across business name, city, state, and description with clean sanitization", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: "seller-uuid-1",
              business_name: "Udaipur Marble Processors",
              slug: "udaipur-marble-processors",
              business_type: "manufacturer",
              city: "Udaipur",
              state: "Rajasthan",
              country: "IN",
              description: "Direct gangsaw cutting of Green Marble and White Marble slabs",
              logo_url: null,
              cover_image_url: null,
              years_in_business: 20,
              verified_at: "2024-01-01T00:00:00Z",
            },
          ],
          count: 1,
          error: null,
        }),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "public_seller_profiles") return chain;
        if (table === "products") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({
              data: [
                { seller_id: "seller-uuid-1", material_type: "Marble" },
                { seller_id: "seller-uuid-1", material_type: "Granite" },
              ],
              error: null,
            }),
          };
        }
        return chain;
      });

      const result = await getPublicSellers({ q: "Green Marble", fallback: false });

      expect(mockSupabaseFrom).toHaveBeenCalledWith("public_seller_profiles");
      expect(chain.or).toHaveBeenCalledWith(
        expect.stringContaining("business_name.ilike.%Green Marble%"),
      );
      expect(result.total).toBe(1);
      expect(result.sellers[0]!.businessName).toBe("Udaipur Marble Processors");
      expect(result.sellers[0]!.isVerified).toBe(true);
      expect(result.sellers[0]!.productCount).toBe(2);
      expect(result.sellers[0]!.materialCapabilities).toEqual(["Marble", "Granite"]);
    });

    it("maps business type 'quarry_owner' to 'mine_owner' in PostgreSQL queries", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(chain);

      await getPublicSellers({ type: "quarry_owner", fallback: false });

      expect(chain.in).toHaveBeenCalledWith("business_type", ["mine_owner", "quarry_owner"]);
    });

    it("maps business type 'processor' to 'manufacturer' and 'stone_supplier' in PostgreSQL queries", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(chain);

      await getPublicSellers({ type: "processor", fallback: false });

      expect(chain.in).toHaveBeenCalledWith("business_type", [
        "manufacturer",
        "stone_supplier",
        "processor",
      ]);
    });

    it("applies state filter accurately", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(chain);

      await getPublicSellers({ state: "Rajasthan", fallback: false });

      expect(chain.eq).toHaveBeenCalledWith("state", "Rajasthan");
    });
  });

  describe("Supplier Data Trust Enforcement (Zero Fabrication Rule)", () => {
    it("returns an honest empty list when live database returns zero suppliers and fallback: false", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(chain);

      const result = await getPublicSellers({ fallback: false });

      // Must NOT fabricate mock companies or return SEED_SELLERS
      expect(result.sellers).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("handles database query errors gracefully without leaking unverified sellers", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          count: null,
          error: { message: "connection timeout" },
        }),
      };

      mockSupabaseFrom.mockReturnValue(chain);

      const result = await getPublicSellers({ fallback: false });

      expect(result.sellers).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
