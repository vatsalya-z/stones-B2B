import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

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

test.describe("StoneB2B Phase 5.22 — Responsive Luxury Showroom CTA Suite", () => {
  test("verifies both showroom image assets return HTTP 200", async ({ request }) => {
    const desktopRes = await request.get("/images/backgrounds/stone-showroom-cta-desktop.jpg");
    expect(desktopRes.status()).toBe(200);
    expect(desktopRes.headers()["content-type"]).toContain("image/jpeg");

    const mobileRes = await request.get("/images/backgrounds/stone-showroom-cta-mobile.jpg");
    expect(mobileRes.status()).toBe(200);
    expect(mobileRes.headers()["content-type"]).toContain("image/jpeg");
  });

  for (const vp of DESKTOP_VIEWPORTS) {
    test(`verifies desktop showroom landscape background and CTA rendering on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const ctaSection = page.locator("section:has-text('Have a Specific Architectural or Bulk Requirement?')");
      await expect(ctaSection).toBeVisible();

      // Scroll into view
      await ctaSection.scrollIntoViewIfNeeded();

      // Verify picture element with desktop source
      const picture = ctaSection.locator("picture");
      await expect(picture).toBeVisible();
      const source = picture.locator('source[media="(min-width: 768px)"]');
      await expect(source).toHaveAttribute("srcSet", "/images/backgrounds/stone-showroom-cta-desktop.jpg");

      const img = picture.locator("img");
      await expect(img).toBeVisible();

      // Poll until browser evaluates media query & populates currentSrc
      await expect.poll(async () => {
        return await img.evaluate((el: HTMLImageElement) => el.currentSrc);
      }).toContain("stone-showroom-cta-desktop.jpg");

      // Verify content & buttons
      await expect(ctaSection.locator("text=Direct B2B Procurement")).toBeVisible();
      await expect(ctaSection.locator("text=Have a Specific Architectural or Bulk Requirement?")).toBeVisible();
      await expect(ctaSection.locator("text=Send your custom cut-to-size specifications")).toBeVisible();

      const rfqBtn = ctaSection.locator('a[href="/request-quote"]');
      const productsBtn = ctaSection.locator('a[href="/products"]');
      const suppliersBtn = ctaSection.locator('a[href="/suppliers"]');

      await expect(rfqBtn).toBeVisible();
      await expect(productsBtn).toBeVisible();
      await expect(suppliersBtn).toBeVisible();

      // Verify zero horizontal page overflow
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow).toBe(false);

      // Capture screenshot at 1440px
      if (vp.width === 1440) {
        const screenshotDir = "/Users/vatsalyabhardwaj/.gemini/antigravity/brain/bf0543ef-d839-4f85-81f2-b50c4baeba20";
        await ctaSection.screenshot({
          path: path.join(screenshotDir, "showroom-cta-desktop-1440px.png"),
        });
      }
    });
  }

  for (const vp of MOBILE_VIEWPORTS) {
    test(`verifies mobile showroom portrait background and CTA rendering on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const ctaSection = page.locator("section:has-text('Have a Specific Architectural or Bulk Requirement?')");
      await expect(ctaSection).toBeVisible();

      // Scroll into view
      await ctaSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      // Verify picture element with mobile img fallback
      const picture = ctaSection.locator("picture");
      await expect(picture).toBeVisible();

      const img = picture.locator("img");
      await expect(img).toBeVisible();

      // Poll until browser evaluates media query & populates currentSrc
      await expect.poll(async () => {
        return await img.evaluate((el: HTMLImageElement) => el.currentSrc);
      }).toContain("stone-showroom-cta-mobile.jpg");

      // Verify content & buttons
      await expect(ctaSection.locator("text=Direct B2B Procurement")).toBeVisible();
      await expect(ctaSection.locator("text=Have a Specific Architectural or Bulk Requirement?")).toBeVisible();

      const rfqBtn = ctaSection.locator('a[href="/request-quote"]');
      const productsBtn = ctaSection.locator('a[href="/products"]');
      const suppliersBtn = ctaSection.locator('a[href="/suppliers"]');

      await expect(rfqBtn).toBeVisible();
      await expect(productsBtn).toBeVisible();
      await expect(suppliersBtn).toBeVisible();

      // Verify zero horizontal overflow on mobile
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow).toBe(false);

      // Capture screenshot at 390px and 360px
      if (vp.width === 390 || vp.width === 360) {
        const screenshotDir = "/Users/vatsalyabhardwaj/.gemini/antigravity/brain/bf0543ef-d839-4f85-81f2-b50c4baeba20";
        await ctaSection.screenshot({
          path: path.join(screenshotDir, `showroom-cta-mobile-${vp.width}px.png`),
        });
      }
    });
  }
});
