import { defineConfig } from "@playwright/test";

/**
 * StoneB2B Playwright E2E Configuration
 * Tests natural stone marketplace workflows across 5 responsive breakpoints:
 * - 1440 × 900 (Large Desktop)
 * - 1280 × 800 (Standard Laptop)
 * - 768 × 1024 (Tablet / iPad Portrait)
 * - 390 × 844 (Mobile Standard / iPhone)
 * - 360 × 800 (Mobile Compact / Android)
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-1440",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "desktop-1280",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "tablet-768",
      use: {
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile-390",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "mobile-360",
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 800 },
      },
    },
  ],
  webServer: {
    command: "pnpm exec next start -p 3100 -H 127.0.0.1",
    url: "http://127.0.0.1:3100",
    cwd: __dirname,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
