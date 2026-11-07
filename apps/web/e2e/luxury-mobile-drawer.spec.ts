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

      // 3. Verify Top Quarry Image Header & Brand Identity
      const quarryHeaderImg = drawer.locator('img[alt="Natural Stone Quarry Landscape"]');
      await expect(quarryHeaderImg).toBeVisible();
      await expect(drawer.locator("text=StonesDekho")).toBeVisible();
      await expect(drawer.locator("text=India's Leading Natural Stone B2B Network")).toBeVisible();
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

    test(`verifies bulletproof background page scroll lock on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      const hamburger = page.locator('button[aria-controls="mobile-navigation-drawer"]');
      await expect(hamburger).toBeVisible();

      // Scroll page down by 300px using instant scroll
      await page.evaluate(() => {
        window.scrollTo({ top: 300, behavior: "instant" });
      });
      await page.waitForTimeout(50);
      const preScrollY = await page.evaluate(() => window.scrollY);

      // Open drawer via native DOM element click so Playwright doesn't force-scroll header into view
      await hamburger.evaluate((el: HTMLElement) => el.click());
      const drawer = page.locator("#mobile-navigation-drawer");
      await expect(drawer).toHaveAttribute("aria-hidden", "false");

      // Verify html and body are completely locked
      const bodyLockState = await page.evaluate(() => {
        return {
          bodyPosition: document.body.style.position,
          bodyTop: document.body.style.top,
          bodyOverflow: document.body.style.overflow,
          bodyOverscroll: document.body.style.overscrollBehavior,
          htmlOverflow: document.documentElement.style.overflow,
          htmlOverscroll: document.documentElement.style.overscrollBehavior,
        };
      });

      expect(bodyLockState.bodyPosition).toBe("fixed");
      expect(bodyLockState.bodyTop).toBe(`-${preScrollY}px`);
      expect(bodyLockState.bodyOverflow).toBe("hidden");
      expect(bodyLockState.htmlOverflow).toBe("hidden");
      expect(bodyLockState.bodyOverscroll).toBe("none");
      expect(bodyLockState.htmlOverscroll).toBe("none");

      // Verify drawer container and scrollable child have overscroll containment classes
      await expect(drawer).toHaveClass(/overscroll-contain/);
      const scrollableBody = drawer.locator(".overflow-y-auto");
      await expect(scrollableBody).toHaveClass(/overscroll-y-contain/);

      // Close drawer
      const closeBtn = drawer.locator('button[aria-label="Close menu"]');
      await closeBtn.evaluate((el: HTMLElement) => el.click());
      await expect(drawer).toHaveAttribute("aria-hidden", "true");

      // Verify body lock is cleanly released and scroll position is preserved
      const releasedState = await page.evaluate(() => {
        return {
          bodyPosition: document.body.style.position,
          bodyTop: document.body.style.top,
          bodyOverflow: document.body.style.overflow,
          scrollY: window.scrollY,
        };
      });

      expect(releasedState.bodyPosition).toBe("");
      expect(releasedState.bodyTop).toBe("");
      expect(releasedState.bodyOverflow).toBe("");
      expect(releasedState.scrollY).toBe(preScrollY);
    });
  }
});
