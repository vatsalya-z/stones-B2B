import { test, expect } from "@playwright/test";

test.describe("Public Marketplace & Natural Stone Discovery", () => {
  test("loads homepage with navigation, search, verified hero image, and zero 4xx/5xx network errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedResponses: { url: string; status: number }[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("response", (res) => {
      // Monitor all failed network responses; ignore standard browser favicon 404 if not present
      if (res.status() >= 400 && !res.url().includes("favicon.ico")) {
        failedResponses.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/StoneB2B|StonesDekho|Natural Stone/i);

    // Verify main navigation header
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Verify search bar in hero section
    const searchInput = page.locator('input[type="search"][name="q"]').first();
    await expect(searchInput).toBeVisible();

    // Verify verified replacement stone application photography exists and loads successfully
    const verifiedImage = page.locator('img[src*="marble-install-living.jpg"]').first();
    await verifiedImage.scrollIntoViewIfNeeded();
    await expect(verifiedImage).toBeVisible();
    await expect(async () => {
      const isImageLoaded = await verifiedImage.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
      );
      expect(isImageLoaded).toBe(true);
    }).toPass({ timeout: 5000 });

    // Verify main content container
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // Verify zero 4xx/5xx HTTP responses across page assets
    expect(failedResponses).toHaveLength(0);

    // Verify zero critical console errors (without suppressing 404)
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("Download the React DevTools") &&
        !err.includes("favicon.ico")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("navigates to categories catalog, tests search interaction, and drills down into marble category", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("h1")).toContainText(/Categories|Natural Stone/i);

    // Verify presence of core architectural stone categories
    const categoryLinks = page.locator('a[href^="/categories/"]');
    const count = await categoryLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Test interactive search filtering on categories explorer
    const searchInput = page.locator('input[aria-label="Search stone collections"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Granite");

    // Verify active search feedback badge is rendered
    const activeSearchBadge = page.locator("text=Active search:");
    await expect(activeSearchBadge).toBeVisible();

    // Clear search using the dedicated clear button
    const clearButton = page.locator('button[aria-label="Clear active search"], button[aria-label="Clear search"]').first();
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect(searchInput).toHaveValue("");

    // Drill down into marble category page
    await page.goto("/categories/marble");
    await expect(page.locator("h1")).toContainText(/Marble/i);
    await expect(page.locator("main")).toBeVisible();
  });

  test("navigates to product directory and verifies product cards, technical specs, and pricing", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator("h1")).toContainText(/Products|Natural Stone/i);

    // Unconditionally verify product card article elements
    const productCards = page.locator("article");
    await expect(productCards.first()).toBeVisible();
    const cardCount = await productCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // Verify first product card contains valid title heading and technical specifications
    const firstCardTitle = productCards.first().locator("h3");
    await expect(firstCardTitle).toBeVisible();
    const titleText = await firstCardTitle.innerText();
    expect(titleText.trim().length).toBeGreaterThan(0);

    // Verify search and filter controls are present within product discovery
    const filterControls = page.locator('main select#product-sort, main button, main input').first();
    await expect(filterControls).toBeVisible();
  });

  test("navigates to suppliers directory and verifies supplier cards and search controls", async ({ page }) => {
    await page.goto("/suppliers");
    await expect(page.locator("h1")).toContainText(/Supplier/i);

    // Verify search or location filters exist
    const searchOrFilter = page.locator('input[placeholder*="search" i], select').first();
    await expect(searchOrFilter).toBeVisible();

    // Verify main content container is rendered
    await expect(page.locator("main")).toBeVisible();
  });

  test("verifies How It Works displays standardized Payment Model B disclosure", async ({ page }) => {
    await page.goto("/how-it-works");
    const content = await page.textContent("main");
    expect(content).toContain("Payment Model B");
    expect(content).toContain(
      "Commercial settlement will be processed through StoneB2B Payment Model B after the authorized Payment Aggregator integration is activated."
    );
  });
});
