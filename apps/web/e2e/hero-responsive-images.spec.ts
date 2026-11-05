import { test, expect } from "@playwright/test";
import path from "node:path";

const ARTIFACT_DIR = "/Users/vatsalyabhardwaj/.gemini/antigravity/brain/bf0543ef-d839-4f85-81f2-b50c4baeba20";

const DESKTOP_VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1024", width: 1024, height: 768 },
];

const MOBILE_VIEWPORTS = [
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-360", width: 360, height: 800 },
];

test.describe("Hero Section — Responsive Luxury Showroom Backgrounds", () => {
  for (const vp of DESKTOP_VIEWPORTS) {
    test(`Desktop Viewport ${vp.name} (${vp.width}x${vp.height}) selects hero-desktop.webp`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });

      // 1. Locate hero section
      const heroSection = page.locator("section").first();
      await expect(heroSection).toBeVisible();

      // 2. Picture element & source tags
      const picture = heroSection.locator("picture");
      await expect(picture).toBeVisible();

      const source = picture.locator("source").first();
      await expect(source).toHaveAttribute("media", "(min-width: 768px)");

      const img = picture.locator("img");
      await expect(img).toBeVisible();

      // 3. Verify the browser picked desktop image
      const currentSrc = await img.evaluate((el: HTMLImageElement) => el.currentSrc);
      expect(currentSrc).toMatch(/luxurious-symmetrical-marble-showroom|hero-desktop/);

      // 4. Verify text content is visible
      await expect(heroSection.locator("h1")).toBeVisible();
      await expect(heroSection.getByText("Source Natural Stone")).toBeVisible();
      await expect(heroSection.getByText("Direct from Quarries")).toBeVisible();

      // 5. CTAs are visible and have valid links
      const ctaExplore = heroSection.getByRole("link", { name: "Explore Slabs & Tiles" });
      await expect(ctaExplore).toBeVisible();
      await expect(ctaExplore).toHaveAttribute("href", "/products");

      const ctaFactory = heroSection.getByRole("link", { name: "List Your Factory" });
      await expect(ctaFactory).toBeVisible();
      await expect(ctaFactory).toHaveAttribute("href", "/register/seller");

      // 6. Featured card is visible on desktop
      await expect(heroSection.getByText("Makrana Pure White Marble Slabs")).toBeVisible();

      // 7. No horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // 8. Capture screenshot for desktop 1440
      if (vp.width === 1440) {
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "hero-desktop-1440px.png"),
          fullPage: false,
        });
      }
    });
  }

  for (const vp of MOBILE_VIEWPORTS) {
    test(`Mobile Viewport ${vp.name} (${vp.width}x${vp.height}) selects hero-mobile.webp`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });

      // 1. Locate hero section
      const heroSection = page.locator("section").first();
      await expect(heroSection).toBeVisible();

      // 2. Picture element & source tags
      const picture = heroSection.locator("picture");
      await expect(picture).toBeVisible();

      const img = picture.locator("img");
      await expect(img).toBeVisible();

      // 3. Verify the browser picked mobile image
      const currentSrc = await img.evaluate((el: HTMLImageElement) => el.currentSrc);
      expect(currentSrc).toMatch(/luxurious-symmetrical-marble-gallery|hero-mobile/);

      // 4. Verify headline & subtitle are visible and legible
      await expect(heroSection.locator("h1")).toBeVisible();
      await expect(heroSection.getByText("Source Natural Stone")).toBeVisible();
      await expect(heroSection.getByText("Direct from Quarries")).toBeVisible();

      // 5. CTAs are visible
      const ctaExplore = heroSection.getByRole("link", { name: "Explore Slabs & Tiles" });
      await expect(ctaExplore).toBeVisible();
      const ctaFactory = heroSection.getByRole("link", { name: "List Your Factory" });
      await expect(ctaFactory).toBeVisible();

      // 6. Featured desktop card is hidden on mobile
      await expect(heroSection.getByText("Makrana Pure White Marble Slabs")).not.toBeVisible();

      // 7. Trust indicators visible
      await expect(heroSection.getByText("Verified Quarries")).toBeVisible();
      await expect(heroSection.getByText("Wholesale Pricing")).toBeVisible();
      await expect(heroSection.getByText("Global Port Dispatch")).toBeVisible();

      // 8. No horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // 9. Capture screenshot for mobile 390 and 360
      if (vp.width === 390) {
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "hero-mobile-390px.png"),
          fullPage: false,
        });
      }
      if (vp.width === 360) {
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "hero-mobile-360px.png"),
          fullPage: false,
        });
      }
    });
  }
});

