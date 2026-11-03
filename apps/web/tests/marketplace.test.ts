import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    from: mockSupabaseFrom,
  })),
}));

import { resolveStorageUrl, getProducts, getProductBySlug, getPublicSellers } from "../lib/db";
import robots from "../app/robots";
import {
  getCategoryFallbackImage,
  getProductFallbackImage,
  getProductGalleryImages,
  getSupplierFallbackCover,
  getSupplierFallbackLogo,
} from "../lib/images";

describe("Phase 3 Marketplace Utilities", () => {
  beforeEach(() => {
    mockSupabaseFrom.mockReset();
  });

  describe("resolveStorageUrl", () => {
    it("returns null when path is null or undefined", () => {
      expect(resolveStorageUrl(null, "product-images")).toBeNull();
      expect(resolveStorageUrl(undefined, "product-images")).toBeNull();
      expect(resolveStorageUrl("", "product-images")).toBeNull();
    });

    it("returns direct URL as is if it starts with http or https", () => {
      const url = "https://example.com/stone-slab.jpg";
      expect(resolveStorageUrl(url, "product-images")).toBe(url);
    });

    it("constructs Supabase public bucket URL for relative storage paths", () => {
      const oldEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyzcompany.supabase.co";

      const res = resolveStorageUrl("seller-123/prod-456/white-marble.webp", "product-images");
      expect(res).toBe(
        "https://xyzcompany.supabase.co/storage/v1/object/public/product-images/seller-123/prod-456/white-marble.webp",
      );

      process.env.NEXT_PUBLIC_SUPABASE_URL = oldEnv;
    });
  });

  describe("Public Catalogue Queries & Fallback", () => {
    it("falls back to the 12 curated stone products when live Supabase catalogue has 0 approved products", async () => {
      const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://rgmasamasslqintssyrh.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test";

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabaseFrom.mockReturnValue(chain);

      const all = await getProducts({ pageSize: 18 });
      expect(all.total).toBe(12);
      expect(all.products.length).toBe(12);

      const marbleOnly = await getProducts({ category: "marble" });
      expect(marbleOnly.products.length).toBe(2);
      expect(marbleOnly.products.every((p) => p.materialType === "Marble")).toBe(true);

      const detail = await getProductBySlug("makrana-white-marble");
      expect(detail?.name).toContain("Makrana");

      const sellers = await getPublicSellers();
      expect(sellers.total).toBe(4);

      process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
    });

    it("resolves live approved products via public_seller_profiles without touching private seller_profiles", async () => {
      const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://rgmasamasslqintssyrh.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test";

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "products") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "live-prod-1",
                  seller_id: "live-seller-1",
                  category_id: "cat-1",
                  name: "Live Udaipur Pink Marble Slab",
                  slug: "live-udaipur-pink-marble",
                  description: "Live quarry lot",
                  material_type: "Marble",
                  stone_origin: "Udaipur",
                  colour: "Red",
                  finish: "Polished",
                  thickness: 18,
                  minimum_order_quantity: 400,
                  unit: "sq_ft",
                  price_type: "fixed",
                  price: 320,
                  currency: "INR",
                  stock_status: "in_stock",
                  published_at: "2026-10-30T10:00:00Z",
                  product_images: [
                    {
                      id: "img-live-1",
                      storage_path: "live-seller-1/live-prod-1/slab.webp",
                      alt_text: "Pink Marble",
                      is_primary: true,
                    },
                  ],
                },
              ],
              count: 1,
              error: null,
            }),
          };
        }
        if (table === "public_seller_profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "live-seller-1",
                  business_name: "Mewar Stone Works",
                  slug: "mewar-stone-works",
                  business_type: "manufacturer",
                  city: "Udaipur",
                  state: "Rajasthan",
                  country: "IN",
                  description: "Verified exporter",
                  logo_url: null,
                  cover_image_url: null,
                  years_in_business: 12,
                  verified_at: "2026-10-29T00:00:00Z",
                },
              ],
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table queried: ${table}`);
      });

      const res = await getProducts();
      expect(res.total).toBe(1);
      expect(res.products[0]?.name).toBe("Live Udaipur Pink Marble Slab");
      expect(res.products[0]?.sellerName).toBe("Mewar Stone Works");
      expect(res.products[0]?.isVerifiedSeller).toBe(true);

      process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
    });
  });

  describe("Image Fallbacks & Resolution", () => {
    it("resolves category fallback image for known slugs", () => {
      expect(getCategoryFallbackImage("granite")).toBe("/images/categories/granite.jpg");
      expect(getCategoryFallbackImage("sandstone")).toBe("/images/categories/sandstone.jpg");
      expect(getCategoryFallbackImage("limestone")).toBe("/images/categories/limestone.jpg");
      expect(getCategoryFallbackImage("unknown-slug")).toBe("/images/categories/marble.jpg");
    });

    it("resolves product fallback image by slug and material type", () => {
      expect(getProductFallbackImage("makrana-white-marble")).toBe(
        "/images/products/makrana-white-marble.jpg",
      );
      expect(getProductFallbackImage("black-galaxy-granite")).toBe(
        "/images/products/black-galaxy-granite.jpg",
      );
      // Fallback to material type when slug not listed directly
      expect(getProductFallbackImage("unknown-slab", "Granite")).toBe(
        "/images/categories/granite.jpg",
      );
    });

    it("generates a multi-photo gallery for products", () => {
      const gallery = getProductGalleryImages("makrana-white-marble", "Marble", null);
      expect(gallery.length).toBeGreaterThanOrEqual(3);
      expect(gallery[0]?.isPrimary).toBe(true);
      expect(gallery[0]?.src).toBe("/images/products/makrana-white-marble.jpg");
    });

    it("resolves supplier fallback covers and logos", () => {
      expect(getSupplierFallbackCover("royal-makrana-marbles")).toBe(
        "/images/hero/stone-quarry-hero.jpg",
      );
      expect(getSupplierFallbackCover("random-quarry", "quarry_owner")).toBe(
        "/images/hero/stone-quarry-hero.jpg",
      );
      expect(getSupplierFallbackLogo("royal-makrana-marbles")).toBe(
        "/images/products/makrana-white-marble.jpg",
      );
    });
  });

  describe("Robots configuration", () => {
    it("disallows administrative and sensitive authenticated paths", () => {
      const config = robots();
      expect(config.rules).toBeDefined();

      const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
      const defaultRule = rules[0]!;

      expect(defaultRule.allow).toBe("/");
      expect(defaultRule.disallow).toContain("/dashboard/");
      expect(defaultRule.disallow).toContain("/seller/");
      expect(defaultRule.disallow).toContain("/admin/");
      expect(defaultRule.disallow).toContain("/auth/");
    });
  });

  describe("Contact Desk Server Action (submitContactEnquiry)", () => {
    it("successfully validates and processes a well-formed contact submission", async () => {
      const { submitContactEnquiry } = await import("../features/auth/contact-actions");
      const formData = new FormData();
      formData.set("name", "Vatsalya Bhardwaj");
      formData.set("email", "vatsalya@example.com");
      formData.set("message", "Looking for 5000 sqft Makrana white marble slabs.");

      const result = await submitContactEnquiry({ success: false }, formData);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects invalid contact submissions with field-level errors", async () => {
      const { submitContactEnquiry } = await import("../features/auth/contact-actions");
      const formData = new FormData();
      formData.set("name", "A"); // too short
      formData.set("email", "not-an-email"); // invalid
      formData.set("message", "Hi"); // too short

      const result = await submitContactEnquiry({ success: false }, formData);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.name).toBeDefined();
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.message).toBeDefined();
    });
  });
});
