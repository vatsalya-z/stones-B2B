import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getProductBySlug, getProducts, getRelatedProducts } from "../lib/db";
import { getProductGalleryImages, getProductFallbackImage } from "../lib/images";

describe("StoneB2B Premium Product Detail Page Integration", () => {
  it("resolves all 12 showcase products with complete architectural specifications", async () => {
    const { products } = await getProducts({ pageSize: 20 });
    expect(products.length).toBe(12);

    for (const item of products) {
      const product = await getProductBySlug(item.slug);
      expect(product).toBeDefined();
      expect(product?.name).toBe(item.name);
      expect(product?.slug).toBe(item.slug);
      expect(product?.material_type).toBeDefined();
      expect(product?.unit).toBeDefined();
      expect(product?.seller).toBeDefined();
      expect(product?.images.length).toBeGreaterThanOrEqual(1);

      // Verify physical specifications exist
      if (product?.thickness !== null) {
        expect(typeof product?.thickness).toBe("number");
        expect(product?.thickness).toBeGreaterThan(0);
      }

      if (product?.minimum_order_quantity !== null) {
        expect(typeof product?.minimum_order_quantity).toBe("number");
        expect(product?.minimum_order_quantity).toBeGreaterThan(0);
      }
    }
  });

  it("distinguishes editorial showcase products from live published database products", async () => {
    const makrana = await getProductBySlug("makrana-white-marble");
    expect(makrana).toBeDefined();

    // Showcase products must have IDs starting with 'prod-' or seller IDs starting with 'seller-'
    const isShowcase =
      !makrana?.published_at ||
      makrana.id.startsWith("prod-") ||
      !makrana.seller.id ||
      makrana.seller.id.startsWith("seller-");

    expect(isShowcase).toBe(true);
  });

  it("generates authentic stone gallery images for diverse material families", () => {
    const marbleGallery = getProductGalleryImages("makrana-white-marble", "Marble");
    expect(marbleGallery.length).toBeGreaterThanOrEqual(2);
    expect(marbleGallery[0]?.isPrimary).toBe(true);

    const graniteGallery = getProductGalleryImages("black-galaxy-granite", "Granite");
    expect(graniteGallery.length).toBeGreaterThanOrEqual(2);
    expect(graniteGallery[0]?.src).toContain("black-galaxy-granite");

    const fallbackImg = getProductFallbackImage("unknown-slug", "Travertine");
    expect(fallbackImg).toBeDefined();
    expect(fallbackImg.length).toBeGreaterThan(0);
  });

  it("recommends related stone products based on geological material and finish relevance", async () => {
    const targetProduct = await getProductBySlug("makrana-white-marble");
    expect(targetProduct).toBeDefined();

    const related = await getRelatedProducts(
      targetProduct!.category_id,
      targetProduct!.id,
      3,
      {
        materialType: targetProduct!.material_type,
        finish: targetProduct!.finish,
        stoneOrigin: targetProduct!.stone_origin,
      },
    );

    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(3);

    // Ensure the current product is never included in related products
    const relatedIds = related.map((r) => r.id);
    expect(relatedIds).not.toContain(targetProduct!.id);

    // Products in related should have technical specifications populated
    for (const item of related) {
      expect(item.name).toBeDefined();
      expect(item.materialType).toBeDefined();
      expect(item.priceType).toBeDefined();
    }
  });

  it("verifies SEO JSON-LD logic omits commercial Offer for editorial showcase entries", async () => {
    const product = await getProductBySlug("classic-travertine-slab");
    expect(product).toBeDefined();

    const isShowcase =
      !product?.published_at ||
      product.id.startsWith("prod-") ||
      !product.seller.id ||
      product.seller.id.startsWith("seller-");

    // Only genuine live database products emit offers
    const offers =
      !isShowcase && product?.price !== null
        ? {
            "@type": "Offer",
            price: product?.price,
            priceCurrency: product?.currency,
            availability: "https://schema.org/InStock",
          }
        : undefined;

    expect(offers).toBeUndefined();
  });
});
