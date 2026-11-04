import { test, expect } from "@playwright/test";

test.describe("Responsive Viewports & Layout Integrity", () => {
  const testRoutes = [
    { name: "homepage", path: "/" },
    { name: "categories", path: "/categories" },
    { name: "products", path: "/products" },
    { name: "suppliers", path: "/suppliers" },
    { name: "how-it-works", path: "/how-it-works" },
  ];

  for (const route of testRoutes) {
    test(`renders ${route.name} without horizontal overflow on project viewport`, async ({ page }, testInfo) => {
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");

      // Verify zero document-level horizontal overflow
      const overflow = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          scrollWidth,
          clientWidth,
          hasOverflow: scrollWidth > clientWidth,
        };
      });

      expect(overflow.hasOverflow).toBe(false);

      // Capture screenshot for visual audit
      const projectName = testInfo.project.name;
      await page.screenshot({
        path: `playwright-screenshots/${projectName}-${route.name}.png`,
        fullPage: false,
      });
    });
  }

  test("verifies mobile navigation drawer structural visibility and escape behavior", async ({ page }) => {
    const viewport = page.viewportSize();
    const isMobileOrTablet = viewport && viewport.width < 1024;

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    if (isMobileOrTablet) {
      // Mobile / Tablet Viewport (< 1024px)
      const hamburger = page.locator('button[aria-controls="mobile-navigation-drawer"]');
      await expect(hamburger).toBeVisible();
      await expect(hamburger).toHaveAttribute("aria-expanded", "false");

      const drawer = page.locator("#mobile-navigation-drawer");
      await expect(drawer).toHaveAttribute("aria-hidden", "true");
      await expect(drawer).toHaveClass(/invisible/);
      await expect(drawer).toHaveClass(/pointer-events-none/);

      // Open drawer
      await hamburger.click();
      await expect(hamburger).toHaveAttribute("aria-expanded", "true");
      await expect(drawer).toHaveAttribute("aria-hidden", "false");
      await expect(drawer).toHaveClass(/visible/);

      // Close button must be visible
      const closeBtn = drawer.locator('button[aria-label="Close menu"]');
      await expect(closeBtn).toBeVisible();

      // Press Escape to dismiss drawer
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveAttribute("aria-hidden", "true");
      await expect(drawer).toHaveClass(/invisible/);
      await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    } else {
      // Desktop Viewport (>= 1024px)
      const hamburger = page.locator('button[aria-controls="mobile-navigation-drawer"]');
      await expect(hamburger).toBeHidden();

      const desktopNav = page.locator('nav[aria-label="Main navigation"]');
      await expect(desktopNav).toBeVisible();
    }
  });
});
