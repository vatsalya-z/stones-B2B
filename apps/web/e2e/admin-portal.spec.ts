import { test, expect } from "@playwright/test";
import { loginAs, isLiveAuthPermitted } from "./helpers/auth";

test.describe("Authenticated Admin Console & Authorization Journeys", () => {
  test.beforeEach(() => {
    test.skip(
      !isLiveAuthPermitted(),
      "Live authentication blocked on protected production database. Requires isolated dedicated staging environment.",
    );
  });
  test("authenticates admin and verifies administrative shell and platform overview", async ({ page }) => {
    await loginAs(page, "admin", "/admin/dashboard");

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // Verify governance badge and heading
    const header = page.locator("header");
    await expect(header).toContainText(/Admin/i);
    await expect(main.locator("h1, h2").first()).toBeVisible();
  });

  test("navigates to admin sellers and buyers management views", async ({ page }) => {
    await loginAs(page, "admin", "/admin/sellers");

    await expect(page).toHaveURL(/\/admin\/sellers/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Buyers directory
    await page.goto("/admin/buyers");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/admin\/buyers/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("navigates to admin orders ledger and audit logs", async ({ page }) => {
    await loginAs(page, "admin", "/admin/orders");

    await expect(page).toHaveURL(/\/admin\/orders/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Audit logs
    await page.goto("/admin/audit");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/admin\/audit/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("verifies non-admin denial for unauthenticated visitors and buyer role", async ({ page }) => {
    // Unauthenticated attempt
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login/);

    // Buyer attempt
    await loginAs(page, "buyer", "/buyer/dashboard");
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/unauthorized/);
  });
});
