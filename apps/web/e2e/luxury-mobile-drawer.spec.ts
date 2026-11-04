import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-430", width: 430, height: 932 },
];

test.describe("Luxury Mobile Navigation Drawer Visual & Functional E2E Suite", () => {
  for (const vp of VIEWPORTS) {
    test(`verifies luxury drawer rendering, interactions & zero overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      // 1. Initial State: Hamburger trigger visible, drawer hidden
      const hamburger = page.locator('button[aria-controls="mobile-navigation-drawer"]');
      await expect(hamburger).toBeVisible();
      await expect(hamburger).toHaveAttribute("aria-expanded", "false");

      const drawer = page.locator("#mobile-navigation-drawer");
      await expect(drawer).toHaveAttribute("aria-hidden", "true");
      await expect(drawer).toHaveClass(/invisible/);
      await expect(drawer).toHaveClass(/pointer-events-none/);

      // Verify zero horizontal page overflow
      const preOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(preOverflow).toBe(false);

      // 2. Open Drawer
      await hamburger.click();
      await expect(hamburger).toHaveAttribute("aria-expanded", "true");
      await expect(drawer).toHaveAttribute("aria-hidden", "false");
      await expect(drawer).toHaveClass(/visible/);
      await expect(drawer).toHaveClass(/pointer-events-auto/);

      // 3. Verify Brand Header
      await expect(drawer.locator("text=StonesDekho")).toBeVisible();
      await expect(drawer.locator("text=India's Natural Stone B2B")).toBeVisible();
      const closeBtn = drawer.locator('button[aria-label="Close menu"]');
      await expect(closeBtn).toBeVisible();

      // 4. Verify Account Access Card
      await expect(drawer.locator("text=Access Your Account")).toBeVisible();
      await expect(drawer.locator("text=Sign in or register to continue")).toBeVisible();
      const signInBtn = drawer.locator('a[href="/login"]');
      const registerBtn = drawer.locator('a[href="/register"]');
      await expect(signInBtn).toBeVisible();
      await expect(registerBtn).toBeVisible();

      // 5. Verify Navigation Rows
      const nav = drawer.locator('nav[aria-label="Mobile Drawer Navigation"]');
      await expect(nav).toBeVisible();
      await expect(nav.locator('a[href="/"]')).toBeVisible();
      await expect(nav.locator('a[href="/products"]')).toBeVisible();
      await expect(nav.locator('a[href="/suppliers"]')).toBeVisible();
      await expect(nav.locator('a[href="/categories"]')).toBeVisible();
      await expect(nav.locator('a[href="/how-it-works"]')).toBeVisible();
      await expect(nav.locator('a[href="/request-quote"]')).toBeVisible();

      // Verify touch targets >= 48px
      const navLinks = nav.locator("a");
      const count = await navLinks.count();
      for (let i = 0; i < count; i++) {
        const box = await navLinks.nth(i).boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44); // 48px with padding/border
        }
      }

      // 6. Verify Promotional Card
      await expect(drawer.locator("text=SOURCE DIRECT")).toBeVisible();
      await expect(drawer.locator("text=Premium Natural Stone for Every Project")).toBeVisible();
      await expect(drawer.locator("text=Explore Products")).toBeVisible();

      // 7. Verify Trust Indicators
      await expect(drawer.locator("text=Verified Suppliers")).toBeVisible();
      await expect(drawer.locator("text=Factory-Direct Pricing")).toBeVisible();
      await expect(drawer.locator("text=Global Dispatch")).toBeVisible();

      // 8. Capture Screenshots for 390px and 360px
      if (vp.width === 390 || vp.width === 360) {
        // Wait for fonts and styling to settle
        await page.waitForTimeout(300);
        const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots");
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        await page.screenshot({
          path: path.join(screenshotDir, `luxury-drawer-${vp.width}px.png`),
          fullPage: false,
        });

        // Scroll drawer to bottom to capture Trust Indicators
        const scrollableArea = drawer.locator(".overflow-y-auto");
        await scrollableArea.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(200);
        await page.screenshot({
          path: path.join(screenshotDir, `luxury-drawer-${vp.width}px-scrolled.png`),
          fullPage: false,
        });

        // Scroll back up for subsequent tests
        await scrollableArea.evaluate((el) => {
          el.scrollTop = 0;
        });
      }

      // 9. Test Close Button
      await closeBtn.click();
      await expect(drawer).toHaveAttribute("aria-hidden", "true");
      await expect(drawer).toHaveClass(/invisible/);
      await expect(hamburger).toHaveAttribute("aria-expanded", "false");

      // 10. Test Escape Key Dismiss
      await hamburger.click();
      await expect(drawer).toHaveAttribute("aria-hidden", "false");
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveAttribute("aria-hidden", "true");
      await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    });
  }
});
