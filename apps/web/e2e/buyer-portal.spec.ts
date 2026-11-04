import { test, expect } from "@playwright/test";
import { loginAs, logoutUser, isLiveAuthPermitted } from "./helpers/auth";

test.describe("Authenticated Buyer Portal Journeys", () => {
  test.beforeEach(() => {
    test.skip(
      !isLiveAuthPermitted(),
      "Live authentication blocked on protected production database. Requires isolated dedicated staging environment.",
    );
  });
  test("authenticates buyer and verifies dashboard layout and metrics", async ({ page }) => {
    await loginAs(page, "buyer", "/buyer/dashboard");

    await expect(page).toHaveURL(/\/buyer\/dashboard/);

    // Verify buyer welcome heading and workspace badge
    await expect(page.locator("h1")).toContainText(/Welcome back|Buyer/i);
    await expect(page.getByText("Buyer Procurement Workspace")).toBeVisible();

    // Verify dashboard action cards / quick links rendered on page
    await expect(page.getByRole("link", { name: "+ Create New RFQ" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage Profile" })).toBeVisible();
  });

  test("navigates to buyer RFQ management and new RFQ wizard", async ({ page }) => {
    await loginAs(page, "buyer", "/buyer/rfqs");

    await expect(page).toHaveURL(/\/buyer\/rfqs/);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Navigate to RFQ creation wizard
    await page.goto("/buyer/rfqs/new");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/buyer\/rfqs\/new/);
    await expect(page.locator("h2").first()).toContainText(/Request for Quotation/i);

    // Verify technical specification fields exist in the form
    await expect(page.locator('select[name="seller_id"], select#seller-select, select').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="e.g."], input[name="title"], textarea').first()).toBeVisible();
  });

  test("navigates to quotation comparison view", async ({ page }) => {
    await loginAs(page, "buyer", "/buyer/quotes/compare");

    await expect(page).toHaveURL(/\/buyer\/quotes\/compare/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("inspects quotation details and terms", async ({ page }) => {
    await loginAs(page, "buyer", "/buyer/quotes/619c58a4-ae62-4308-86ef-1e5010e28ca1");

    await expect(page).toHaveURL(/\/buyer\/quotes\/619c58a4-ae62-4308-86ef-1e5010e28ca1/);

    // Verify quote reference and supplier details
    const content = await page.textContent("body");
    expect(content).toContain("QT-2026-000001");
    expect(content).toContain("Rajasthan Marble & Granite Works");
  });

  test("inspects order details, milestones, and Payment Model B disclosure", async ({ page }) => {
    await loginAs(page, "buyer", "/buyer/orders/9c987722-dc4f-4c86-8772-e9d26415d43f");

    await expect(page).toHaveURL(/\/buyer\/orders\/9c987722-dc4f-4c86-8772-e9d26415d43f/);

    // Verify order reference and Payment Model B disclosure
    const content = await page.textContent("body");
    expect(content).toContain("ORD-20261103-00005");
    expect(content).toContain("Payment Model B Architecture Notice");
    expect(content).toContain(
      "Commercial settlement will be processed through StoneB2B Payment Model B after the authorized Payment Aggregator integration is activated."
    );
  });

  test("verifies address management interface and modal controls", async ({ page }) => {
    await loginAs(page, "buyer", "/buyer/addresses");

    await expect(page).toHaveURL(/\/buyer\/addresses/);
    await expect(page.locator("h1, h2").first()).toContainText(/Address/i);

    // Open Add Address modal
    const addBtn = page.getByRole("button", { name: "Add New Address" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Verify address form modal opens with contact fields
    const contactInput = page.locator("#contact-name-input");
    await expect(contactInput).toBeVisible();
    const phoneInput = page.locator("#phone-input");
    await expect(phoneInput).toBeVisible();

    // Close modal to avoid mutating protected hosted database
    const cancelBtn = page.getByRole("button", { name: "Cancel" });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.locator('button[aria-label="Close dialog"]').click({ force: true });
    }
    await expect(contactInput).toBeHidden();
  });

  test("verifies buyer profile display and session logout", async ({ page }) => {
    await loginAs(page, "buyer", "/buyer/profile");

    await expect(page).toHaveURL(/\/buyer\/profile/);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Execute logout
    await logoutUser(page);
    await expect(page).toHaveURL(/\/login|\/$/);
  });
});
