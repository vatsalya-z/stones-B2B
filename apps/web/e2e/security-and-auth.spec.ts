import { test, expect } from "@playwright/test";

test.describe("Security, Role Boundaries & Route Protection", () => {
  test("redirects unauthenticated visitor from /buyer/dashboard to /login", async ({ page }) => {
    await page.goto("/buyer/dashboard");
    // App Router middleware or requireBuyer() redirect
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated visitor from /buyer/orders to /login", async ({ page }) => {
    await page.goto("/buyer/orders");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated visitor from /buyer/addresses to /login", async ({ page }) => {
    await page.goto("/buyer/addresses");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated visitor from /seller/dashboard to /login", async ({ page }) => {
    await page.goto("/seller/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated visitor from /admin/dashboard to /login or /unauthorized", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login|\/unauthorized/);
  });

  test("renders login page with email and password inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

