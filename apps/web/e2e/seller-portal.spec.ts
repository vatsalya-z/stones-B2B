import { test, expect } from "@playwright/test";
import { loginAs, isLiveAuthPermitted } from "./helpers/auth";

test.describe("Authenticated Seller Portal Journeys", () => {
  test.beforeEach(() => {
    test.skip(
      !isLiveAuthPermitted(),
      "Live authentication blocked on protected production database. Requires isolated dedicated staging environment.",
    );
  });
  test("authenticates seller and verifies seller dashboard layout and business identity", async ({ page }) => {
    await loginAs(page, "seller", "/seller/dashboard");

    await expect(page).toHaveURL(/\/seller\/dashboard/);

    // Verify verified seller business name and heading
    const content = await page.textContent("body");
    expect(content).toContain("Rajasthan Marble & Granite Works");
    await expect(page.locator("h1")).toContainText(/Welcome back/i);

    // Verify primary seller action buttons rendered on dashboard
    await expect(page.getByRole("link", { name: "+ Add Product" })).toBeVisible();
  });

  test("inspects seller product catalogue and new product form", async ({ page }) => {
    await loginAs(page, "seller", "/seller/products");

    await expect(page).toHaveURL(/\/seller\/products/);
    await expect(page.locator("h1")).toContainText(/Product Management/i);

    // Navigate to new stone product formulation form
    await page.goto("/seller/products/new");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/seller\/products\/new/);
    await expect(page.locator("h1")).toContainText(/Add Natural Stone Product/i);

    // Verify basic product formulation inputs exist
    const prodNameInput = page.locator("input#prod-name");
    await expect(prodNameInput).toBeVisible();
  });

  test("inspects seller enquiries and quotations views", async ({ page }) => {
    await loginAs(page, "seller", "/seller/enquiries");

    await expect(page).toHaveURL(/\/seller\/enquiries/);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Quotations list
    await page.goto("/seller/quotes");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/seller\/quotes/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("inspects seller order details, fulfillment controls, and Payment Model B isolation", async ({ page }) => {
    await loginAs(page, "seller", "/seller/orders/9c987722-dc4f-4c86-8772-e9d26415d43f");

    await expect(page).toHaveURL(/\/seller\/orders\/9c987722-dc4f-4c86-8772-e9d26415d43f/);
    const content = await page.textContent("body");
    expect(content).toContain("ORD-20261103-00005");

    // Verify Payment Model B disclosure
    expect(content).toContain("Payment Model B Architecture Notice");
    expect(content).toContain(
      "Commercial settlement will be processed through StoneB2B Payment Model B after the authorized Payment Aggregator integration is activated."
    );

    // Strictly assert that seller UI does NOT allow marking payment received
    const markPaymentBtn = page.locator('button:has-text("Mark Payment Received"), button:has-text("Payment Received")');
    await expect(markPaymentBtn).toHaveCount(0);
  });

  test("verifies seller role boundary prevents access to buyer and admin portals", async ({ page }) => {
    await loginAs(page, "seller", "/seller/dashboard");

    // Attempt accessing buyer portal
    await page.goto("/buyer/dashboard");
    await expect(page).toHaveURL(/\/unauthorized/);

    // Attempt accessing admin portal
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/unauthorized/);
  });
});
