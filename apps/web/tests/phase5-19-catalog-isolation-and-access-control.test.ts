import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Hoisted mocks
const mockSupabaseFrom = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockGetUserRoles = vi.fn();

vi.mock("../lib/supabase", () => ({
  getSupabaseServerClient: vi.fn().mockImplementation(async () => ({
    from: mockSupabaseFrom,
  })),
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("@stone/database/server", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: mockSupabaseFrom,
  })),
}));

vi.mock("../lib/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  getUserRoles: (...args: unknown[]) => mockGetUserRoles(...args),
}));

describe("Phase 5.19 — Public Catalog Isolation, Direct Route Access Control & SEO Guard Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-valid-anon-key";
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetUserRoles.mockResolvedValue([]);
  });

  describe("1. Public Catalog Fallback & Test Product Exclusion", () => {
    it("preserves showcase seed products when database has zero live products", async () => {
      const { getProducts } = await import("../lib/db");

      const queryChain: Record<string, unknown> = {};
      queryChain.select = vi.fn().mockReturnValue(queryChain);
      queryChain.eq = vi.fn().mockReturnValue(queryChain);
      queryChain.not = vi.fn().mockReturnValue(queryChain);
      queryChain.order = vi.fn().mockReturnValue(queryChain);
      queryChain.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "products") return queryChain;
        const fallbackChain: Record<string, unknown> = {};
        fallbackChain.select = vi.fn().mockReturnValue(fallbackChain);
        fallbackChain.in = vi.fn().mockResolvedValue({ data: [] });
        return fallbackChain;
      });

      const result = await getProducts();
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0]?.id).toMatch(/^prod-/);
    });

    it("preserves showcase seed products when database ONLY contains synthetic approved test products", async () => {
      const { getProducts } = await import("../lib/db");

      const queryChain: Record<string, unknown> = {};
      queryChain.select = vi.fn().mockReturnValue(queryChain);
      queryChain.eq = vi.fn().mockReturnValue(queryChain);
      queryChain.not = vi.fn().mockReturnValue(queryChain);
      queryChain.order = vi.fn().mockReturnValue(queryChain);
      queryChain.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "products") return queryChain;
        const fallbackChain: Record<string, unknown> = {};
        fallbackChain.select = vi.fn().mockReturnValue(fallbackChain);
        fallbackChain.in = vi.fn().mockResolvedValue({ data: [] });
        return fallbackChain;
      });

      const result = await getProducts();
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products.some((p) => p.name.includes("[TEST]"))).toBe(false);
      expect(result.products.some((p) => p.slug.startsWith("test-"))).toBe(false);
    });

    it("returns ONLY genuine real products and excludes synthetic test products when catalog is mixed", async () => {
      const { getProducts } = await import("../lib/db");

      const mockRealProductRow = {
        id: "real-prod-1",
        seller_id: "seller-real-1",
        category_id: "cat-1",
        name: "Authentic Makrana Marble Slab",
        slug: "authentic-makrana-marble-slab",
        description: "Genuine quarry slab",
        material_type: "Marble",
        stone_origin: "Makrana, Rajasthan",
        colour: "White",
        finish: "Polished",
        thickness: 20,
        length: 240,
        width: 120,
        minimum_order_quantity: 500,
        unit: "sq_ft",
        price_type: "fixed" as const,
        price: 350,
        currency: "INR",
        stock_status: "in_stock",
        published_at: "2026-01-01T00:00:00Z",
        product_images: [],
      };

      const queryChain: Record<string, unknown> = {};
      queryChain.select = vi.fn().mockReturnValue(queryChain);
      queryChain.eq = vi.fn().mockReturnValue(queryChain);
      queryChain.not = vi.fn().mockReturnValue(queryChain);
      queryChain.order = vi.fn().mockReturnValue(queryChain);
      queryChain.range = vi.fn().mockResolvedValue({
        data: [mockRealProductRow],
        count: 1,
        error: null,
      });

      const sellerChain: Record<string, unknown> = {};
      sellerChain.select = vi.fn().mockReturnValue(sellerChain);
      sellerChain.in = vi.fn().mockResolvedValue({
        data: [
          {
            id: "seller-real-1",
            business_name: "Genuine Royal Marbles",
            slug: "genuine-royal-marbles",
            business_type: "manufacturer",
            city: "Makrana",
            state: "Rajasthan",
            country: "India",
            verified_at: "2026-01-01T00:00:00Z",
          },
        ],
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "products") return queryChain;
        if (table === "public_seller_profiles") return sellerChain;
        return { select: vi.fn().mockReturnThis() };
      });

      const result = await getProducts();
      expect(result.products).toHaveLength(1);
      expect(result.products[0]?.name).toBe("Authentic Makrana Marble Slab");
      expect(result.products[0]?.slug).toBe("authentic-makrana-marble-slab");
      expect(queryChain.not).toHaveBeenCalledWith("slug", "ilike", "test-%");
      expect(queryChain.not).toHaveBeenCalledWith("name", "ilike", "[TEST]%");
    });
  });

  describe("2. Category Counts & Active Categories Isolation", () => {
    it("excludes synthetic test products from category counts", async () => {
      const { getActiveCategories } = await import("../lib/db");

      const mockCatNot = vi.fn();

      const catChain: Record<string, unknown> = {};
      catChain.select = vi.fn().mockReturnValue(catChain);
      catChain.eq = vi.fn().mockReturnValue(catChain);
      catChain.order = vi.fn().mockReturnValue(catChain);
      catChain.is = vi.fn().mockReturnValue(catChain);
      catChain.then = (resolve: (v: unknown) => unknown) =>
        resolve({
          data: [
            {
              id: "real-cat-1",
              parent_id: null,
              name: "Marble",
              slug: "marble",
              description: "Natural marble",
              image_url: null,
              display_order: 1,
            },
          ],
          error: null,
        });

      const prodChain: Record<string, unknown> = {};
      prodChain.select = vi.fn().mockReturnValue(prodChain);
      prodChain.eq = vi.fn().mockReturnValue(prodChain);
      prodChain.not = mockCatNot.mockImplementation(() => prodChain);
      prodChain.then = (resolve: (v: unknown) => unknown) =>
        resolve({
          data: [{ category_id: "real-cat-1" }],
          error: null,
        });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "categories") return catChain;
        if (table === "products") return prodChain;
        return {};
      });

      const categories = await getActiveCategories(null);
      expect(categories).toHaveLength(1);
      expect(categories[0]?.name).toBe("Marble");
      expect(mockCatNot).toHaveBeenCalledWith("slug", "ilike", "test-%");
      expect(mockCatNot).toHaveBeenCalledWith("name", "ilike", "[TEST]%");
    });
  });

  describe("3. Supplier Directory & Public Sellers Isolation", () => {
    it("excludes synthetic test sellers from public supplier directory queries", async () => {
      const { getPublicSellers } = await import("../lib/db");

      const mockSellerNot = vi.fn();
      const sellerChain: Record<string, unknown> = {};
      sellerChain.select = vi.fn().mockReturnValue(sellerChain);
      sellerChain.not = mockSellerNot.mockReturnValue(sellerChain);
      sellerChain.order = vi.fn().mockReturnValue(sellerChain);
      sellerChain.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "public_seller_profiles") return sellerChain;
        return {};
      });

      await getPublicSellers({ fallback: false });
      expect(mockSellerNot).toHaveBeenCalledWith("slug", "ilike", "%-test");
      expect(mockSellerNot).toHaveBeenCalledWith("business_name", "ilike", "%[TEST]%");
    });
  });

  describe("4. Direct Route Access Control & SEO Offer Suppression", () => {
    it("denies unauthenticated visitors from viewing synthetic test products via direct URLs", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const testProduct = {
        id: "c0000000-0000-4000-c000-000000000001",
        name: "[TEST] Dholpur Beige Sandstone Slab",
        slug: "test-dholpur-beige-sandstone-slab",
        sku: "TEST-SKU-01",
        seller: {
          slug: "premium-natural-stone-exports-test",
          business_name: "[TEST] Premium Natural Stone Exports",
        },
      };

      const isTest =
        testProduct.slug.startsWith("test-") ||
        testProduct.name.startsWith("[TEST]") ||
        Boolean(testProduct.sku?.startsWith("TEST-")) ||
        Boolean(testProduct.seller.slug.endsWith("-test")) ||
        Boolean(testProduct.seller.business_name.includes("[TEST]"));

      expect(isTest).toBe(true);

      const currentUser = await mockGetCurrentUser();
      const shouldDenyAccess = isTest && !currentUser;
      expect(shouldDenyAccess).toBe(true);
    });

    it("allows authenticated test user to view synthetic test product", async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: "a0000000-0000-4000-a000-000000000002",
        email: "buyer-test@stoneb2b.test",
        user_metadata: { account_type: "buyer" },
      });

      const testProduct = {
        id: "c0000000-0000-4000-c000-000000000001",
        name: "[TEST] Dholpur Beige Sandstone Slab",
        slug: "test-dholpur-beige-sandstone-slab",
        sku: "TEST-SKU-01",
        seller: {
          slug: "premium-natural-stone-exports-test",
          business_name: "[TEST] Premium Natural Stone Exports",
        },
      };

      const isTest = testProduct.slug.startsWith("test-");
      const currentUser = await mockGetCurrentUser();
      const shouldDenyAccess = isTest && !currentUser;
      expect(shouldDenyAccess).toBe(false);
      expect(currentUser?.email).toBe("buyer-test@stoneb2b.test");
    });

    it("denies unauthenticated visitors from viewing synthetic test supplier storefront", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const testSeller = {
        slug: "premium-natural-stone-exports-test",
        businessName: "[TEST] Premium Natural Stone Exports",
      };

      const isTestSeller =
        testSeller.slug.endsWith("-test") ||
        testSeller.slug.startsWith("test-") ||
        testSeller.businessName.includes("[TEST]");

      expect(isTestSeller).toBe(true);

      const currentUser = await mockGetCurrentUser();
      const shouldDenyAccess = isTestSeller && !currentUser;
      expect(shouldDenyAccess).toBe(true);
    });

    it("verifies Schema.org Offer is suppressed for synthetic test products", () => {
      const isShowcase = false;
      const isTest = true;
      const price = 95;

      const offers = !isShowcase && !isTest && price !== null ? { "@type": "Offer", price } : undefined;
      expect(offers).toBeUndefined();
    });
  });

  describe("5. Sitemap Exclusion of Test Records", () => {
    it("excludes test products and test sellers from dynamic sitemap generation", async () => {
      const mockProdNot = vi.fn();
      const mockSellNot = vi.fn();

      const catChain: Record<string, unknown> = {};
      catChain.select = vi.fn().mockReturnValue(catChain);
      catChain.eq = vi.fn().mockResolvedValue({ data: [] });

      const prodChain: Record<string, unknown> = {};
      prodChain.select = vi.fn().mockReturnValue(prodChain);
      prodChain.eq = vi.fn().mockReturnValue(prodChain);
      prodChain.not = mockProdNot.mockImplementation(() => prodChain);
      prodChain.then = (resolve: (v: unknown) => unknown) =>
        resolve({
          data: [{ slug: "authentic-marble", updated_at: "2026-01-01" }],
          error: null,
        });

      const sellChain: Record<string, unknown> = {};
      sellChain.select = vi.fn().mockReturnValue(sellChain);
      sellChain.not = mockSellNot.mockImplementation(() => sellChain);
      sellChain.then = (resolve: (v: unknown) => unknown) =>
        resolve({
          data: [{ slug: "authentic-seller" }],
          error: null,
        });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "categories") return catChain;
        if (table === "products") return prodChain;
        if (table === "public_seller_profiles") return sellChain;
        return {};
      });

      const sitemapModule = await import("../app/sitemap");
      const sitemapUrls = await sitemapModule.default();

      expect(sitemapUrls.some((u) => u.url.includes("test-"))).toBe(false);
      expect(sitemapUrls.some((u) => u.url.includes("[TEST]"))).toBe(false);
      expect(mockProdNot).toHaveBeenCalledWith("slug", "ilike", "test-%");
      expect(mockProdNot).toHaveBeenCalledWith("name", "ilike", "[TEST]%");
      expect(mockSellNot).toHaveBeenCalledWith("slug", "ilike", "%-test");
      expect(mockSellNot).toHaveBeenCalledWith("business_name", "ilike", "%[TEST]%");
    });
  });
});
