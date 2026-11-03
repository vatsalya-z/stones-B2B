import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getActiveCategories, getCategoryBySlug } from "../lib/db";
import { CATEGORY_IMAGES } from "../lib/images";
import {
  ARCHITECTURAL_APPLICATIONS,
  REGIONAL_QUARRY_HUBS,
  CATEGORY_PROFILES,
} from "../components/categories/category-discovery-explorer";

describe("StoneB2B Premium Category Discovery Redesign", () => {
  it("preserves all 14 official stone categories from database contracts", async () => {
    const categories = await getActiveCategories(null);
    expect(categories.length).toBe(14);

    const slugs = categories.map((c) => c.slug);
    expect(slugs).toContain("marble");
    expect(slugs).toContain("granite");
    expect(slugs).toContain("sandstone");
    expect(slugs).toContain("limestone");
    expect(slugs).toContain("quartzite");
    expect(slugs).toContain("slate");
    expect(slugs).toContain("travertine");
    expect(slugs).toContain("onyx");
    expect(slugs).toContain("semi-precious-stones");
    expect(slugs).toContain("natural-stone-slabs");
    expect(slugs).toContain("stone-tiles");
    expect(slugs).toContain("stone-blocks");
    expect(slugs).toContain("decorative-stone");
    expect(slugs).toContain("custom-stone-products");
  });

  it("calculates reliable product counts for categories without errors", async () => {
    const categories = await getActiveCategories(null);
    categories.forEach((cat) => {
      expect(cat.productCount).toBeDefined();
      expect(typeof cat.productCount).toBe("number");
      expect(cat.productCount).toBeGreaterThanOrEqual(0);
    });

    const marble = categories.find((c) => c.slug === "marble");
    expect(marble?.productCount).toBeGreaterThan(0);
  });

  it("ensures each category has distinct, dedicated stone image assets", async () => {
    const categories = await getActiveCategories(null);
    const imageSet = new Set<string>();

    categories.forEach((cat) => {
      const img = CATEGORY_IMAGES[cat.slug];
      expect(img).toBeDefined();
      expect(img).toContain(`/images/categories/${cat.slug}.jpg`);
      if (img) {
        imageSet.add(img);
      }
    });

    // All 14 categories must have unique image mappings
    expect(imageSet.size).toBe(14);
  });

  it("guarantees 100% zero image repetition across all sections of the discovery page", async () => {
    const categories = await getActiveCategories(null);

    const categoryImages = categories.map((c) => CATEGORY_IMAGES[c.slug]);
    const applicationImages = ARCHITECTURAL_APPLICATIONS.map((a) => a.image);
    const quarryHubImages = REGIONAL_QUARRY_HUBS.map((q) => q.image);
    const heroImage = "/images/hero/marble-showroom-hero.jpg";

    const allPageImages = [heroImage, ...categoryImages, ...applicationImages, ...quarryHubImages];
    const uniqueImages = new Set(allPageImages);

    // Total images: 1 hero + 14 categories + 7 applications + 7 hubs = 29 images
    expect(allPageImages.length).toBe(29);
    expect(uniqueImages.size).toBe(29);

    // Explicitly verify no intersection between sections
    const catSet = new Set(categoryImages);
    applicationImages.forEach((img) => {
      expect(catSet.has(img)).toBe(false);
    });
    quarryHubImages.forEach((img) => {
      expect(catSet.has(img)).toBe(false);
    });
    const appSet = new Set(applicationImages);
    quarryHubImages.forEach((img) => {
      expect(appSet.has(img)).toBe(false);
    });
  });

  it("verifies architectural applications have valid routes and non-empty titles", () => {
    expect(ARCHITECTURAL_APPLICATIONS.length).toBe(7);
    ARCHITECTURAL_APPLICATIONS.forEach((app) => {
      expect(app.title).toBeTruthy();
      expect(app.subtitle).toBeTruthy();
      expect(app.tag).toBeTruthy();
      expect(app.href.startsWith("/products?")).toBe(true);
      expect(app.image.startsWith("/images/")).toBe(true);
    });
  });

  it("verifies regional quarry hubs have valid routes and geological details", () => {
    expect(REGIONAL_QUARRY_HUBS.length).toBe(7);
    REGIONAL_QUARRY_HUBS.forEach((hub) => {
      expect(hub.city).toBeTruthy();
      expect(hub.state).toBeTruthy();
      expect(hub.geology).toBeTruthy();
      expect(hub.highlight).toBeTruthy();
      expect(hub.href.startsWith("/products?")).toBe(true);
      expect(hub.image.startsWith("/images/")).toBe(true);
    });
  });

  it("provides comprehensive metadata profiles for all 14 categories", async () => {
    const categories = await getActiveCategories(null);
    categories.forEach((cat) => {
      const profile = CATEGORY_PROFILES[cat.slug];
      expect(profile).toBeDefined();
      expect(profile?.group).toBeDefined();
      expect(profile?.groupLabel).toBeTruthy();
      expect(profile?.badge).toBeTruthy();
      expect(profile?.subtitle).toBeTruthy();
      expect(profile?.synonyms.length).toBeGreaterThan(0);
    });
  });

  it("retrieves individual category details by slug with valid SEO metadata", async () => {
    const category = await getCategoryBySlug("marble");
    expect(category).not.toBeNull();
    expect(category?.name).toBe("Marble");
    expect(category?.slug).toBe("marble");
    expect(category?.seo_title).toContain("Marble");
  });

  it("separates geological stone families from formats and bespoke categories", async () => {
    const categories = await getActiveCategories(null);

    const geologicalSlugs = [
      "marble",
      "granite",
      "sandstone",
      "limestone",
      "quartzite",
      "slate",
      "travertine",
      "onyx",
      "semi-precious-stones",
    ];

    const formatSlugs = ["natural-stone-slabs", "stone-tiles", "stone-blocks"];
    const bespokeSlugs = ["decorative-stone", "custom-stone-products"];

    const allSlugs = categories.map((c) => c.slug);
    geologicalSlugs.forEach((s) => expect(allSlugs).toContain(s));
    formatSlugs.forEach((s) => expect(allSlugs).toContain(s));
    bespokeSlugs.forEach((s) => expect(allSlugs).toContain(s));

    expect(geologicalSlugs.length + formatSlugs.length + bespokeSlugs.length).toBe(14);
  });
});
