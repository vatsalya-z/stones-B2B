import { test } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR =
  "/Users/vatsalyabhardwaj/.gemini/antigravity/brain/bf0543ef-d839-4f85-81f2-b50c4baeba20";

test.describe("Capture Subdomain Entrypoint Screenshots", () => {
  test("Capture Public Marketplace Entrypoint (Desktop 1440px)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "subdomain-public-marketplace-1440.png"),
      fullPage: false,
    });
  });

  test("Capture Admin Portal Login & Security Gate", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login?next=/admin/dashboard", { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "subdomain-admin-entry-1440.png"),
      fullPage: false,
    });
  });

  test("Capture Seller Portal Workspace Entry", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login?next=/seller/dashboard", { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "subdomain-seller-entry-1440.png"),
      fullPage: false,
    });
  });

  test("Capture Buyer Portal Procurement Entry", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login?next=/buyer/dashboard", { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "subdomain-buyer-entry-1440.png"),
      fullPage: false,
    });
  });

  test("Capture Mobile Responsive Entrypoint (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "subdomain-public-mobile-390.png"),
      fullPage: false,
    });
  });
});
