import { type Page } from "@playwright/test";

/**
 * StoneB2B E2E Security Safeguard & Credential Isolation
 * 
 * Strict denylist of protected production projects.
 * Automated logins against any environment matching these project references
 * are strictly blocked to protect production credentials, user sessions,
 * and hosted database integrity.
 */
export const PROTECTED_PROJECT_DENYLIST = [
  "rgmasamasslqintssyrh",
];

/**
 * Evaluates whether live browser authentication is authorized.
 * 
 * Fail-Closed Security Policy:
 * 1. Must explicitly opt in via ALLOW_E2E_STAGING_AUTH="true"
 * 2. Neither NEXT_PUBLIC_SUPABASE_URL nor DATABASE_URL may contain any denied project reference
 * 3. Synthetic staging credentials must be provided via dedicated test environment variables
 */
export function isLiveAuthPermitted(): boolean {
  if (process.env.ALLOW_E2E_STAGING_AUTH !== "true") {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const databaseUrl = process.env.DATABASE_URL || "";
  const directUrl = process.env.DIRECT_URL || "";

  const matchesDenylist = PROTECTED_PROJECT_DENYLIST.some(
    (deniedRef) =>
      supabaseUrl.includes(deniedRef) ||
      databaseUrl.includes(deniedRef) ||
      directUrl.includes(deniedRef),
  );

  if (matchesDenylist) {
    return false;
  }

  // Ensure test credentials exist in environment variables (never hardcoded)
  const hasCredentials = Boolean(
    process.env.E2E_BUYER_EMAIL &&
    process.env.E2E_BUYER_PASSWORD &&
    process.env.E2E_SELLER_EMAIL &&
    process.env.E2E_SELLER_PASSWORD &&
    process.env.E2E_ADMIN_EMAIL &&
    process.env.E2E_ADMIN_PASSWORD,
  );

  return hasCredentials;
}

export type SupportedRole = "buyer" | "seller" | "admin";

/**
 * Retrieves role credentials exclusively from secure environment variables.
 * Fails closed if live authentication is not authorized.
 */
export function getTestCredentials(role: SupportedRole) {
  if (!isLiveAuthPermitted()) {
    throw new Error(
      `[SECURITY SAFEGUARD] Automated authentication against production/protected environment is prohibited. ` +
      `To execute authenticated E2E tests, provision a dedicated staging project and set ALLOW_E2E_STAGING_AUTH=true ` +
      `with synthetic staging credentials in environment variables.`
    );
  }

  switch (role) {
    case "buyer":
      return {
        email: process.env.E2E_BUYER_EMAIL!,
        password: process.env.E2E_BUYER_PASSWORD!,
        role: "buyer" as const,
        targetUrl: "/buyer/dashboard",
        expectedUrlPattern: /\/buyer\/dashboard/,
      };
    case "seller":
      return {
        email: process.env.E2E_SELLER_EMAIL!,
        password: process.env.E2E_SELLER_PASSWORD!,
        role: "seller" as const,
        targetUrl: "/seller/dashboard",
        expectedUrlPattern: /\/seller\/dashboard/,
      };
    case "admin":
      return {
        email: process.env.E2E_ADMIN_EMAIL!,
        password: process.env.E2E_ADMIN_PASSWORD!,
        role: "admin" as const,
        targetUrl: "/admin/dashboard",
        expectedUrlPattern: /\/admin\/dashboard/,
      };
  }
}

/**
 * Performs interactive form login through the StonesDekho UI
 * with explicit direct redirect to target portal.
 * 
 * Throws immediately if live authentication is disabled.
 */
export async function loginAs(
  page: Page,
  role: SupportedRole,
  destinationPath?: string,
) {
  const credentials = getTestCredentials(role);
  const targetPath = destinationPath || credentials.targetUrl;

  await page.goto(`/login?next=${encodeURIComponent(targetPath)}`);
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  const submitButton = page.locator('button[type="submit"]');

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);
  await submitButton.click();

  // Wait for direct portal navigation with transient error retry
  const expectedPattern = destinationPath
    ? new RegExp(destinationPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    : credentials.expectedUrlPattern;

  try {
    await page.waitForURL(expectedPattern, { timeout: 10_000 });
  } catch (err) {
    const alert = page.locator('div[role="alert"]');
    if (await alert.isVisible()) {
      await page.waitForTimeout(1500);
      await submitButton.click();
      await page.waitForURL(expectedPattern, { timeout: 15_000 });
    } else {
      throw err;
    }
  }

  await page.waitForLoadState("domcontentloaded");
}

/**
 * Gracefully logs out the active session via UI or API action
 */
export async function logoutUser(page: Page) {
  try {
    await page.request.post("/api/auth/signout");
  } catch {
    // ignore
  }
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
}
