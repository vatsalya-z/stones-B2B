import { test, expect } from "@playwright/test";

test.describe("RFQ & Sourcing Workflows", () => {
  test("renders public RFQ request form with all required architectural controls", async ({ page }) => {
    await page.goto("/request-quote");
    await expect(page.locator("h1, h2").first()).toContainText(/Request.*Quote|RFQ/i);

    // Unconditionally verify form presence
    const form = page.locator("form").first();
    await expect(form).toBeVisible();

    // Verify all essential stone specification inputs
    await expect(form.locator('select[name="material_type"]')).toBeVisible();
    await expect(form.locator('input[name="quantity"]')).toBeVisible();
    await expect(form.locator('select[name="unit"]')).toBeVisible();
    await expect(form.locator('select[name="thickness"]')).toBeVisible();
    await expect(form.locator('select[name="finish"]')).toBeVisible();

    // Verify logistics inputs
    await expect(form.locator('input[name="delivery_location"]')).toBeVisible();
    await expect(form.locator('textarea[name="project_notes"]')).toBeVisible();

    // Verify procurement contact inputs
    await expect(form.locator('input[name="name"]')).toBeVisible();
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.locator('input[name="phone"]')).toBeVisible();

    // Verify submission button
    await expect(form.locator('button[type="submit"]')).toBeVisible();
  });

  test("verifies client-side HTML5 validation prevents empty form submission", async ({ page }) => {
    await page.goto("/request-quote");
    const form = page.locator("form").first();
    await expect(form).toBeVisible();

    // Empty form must fail HTML5 validation constraint check
    const isFormValid = await form.evaluate((f: HTMLFormElement) => f.checkValidity());
    expect(isFormValid).toBe(false);

    // Unconditionally verify mandatory required field constraints
    const requiredInputs = [
      'input[name="quantity"]',
      'input[name="delivery_location"]',
      'textarea[name="project_notes"]',
      'input[name="name"]',
      'input[name="email"]',
      'input[name="phone"]',
    ];

    for (const selector of requiredInputs) {
      const fieldValid = await form.locator(selector).evaluate(
        (el: HTMLInputElement | HTMLTextAreaElement) => el.checkValidity()
      );
      expect(fieldValid).toBe(false);
    }

    // Attempt form submission while empty
    const submitBtn = form.locator('button[type="submit"]');
    await submitBtn.click();

    // Browser HTML5 validation prevents submission; stays securely on /request-quote
    expect(page.url()).toContain("/request-quote");
  });

  test("verifies complete synthetic RFQ validation passes without database mutation", async ({ page }) => {
    await page.goto("/request-quote");
    const form = page.locator("form").first();
    await expect(form).toBeVisible();

    // Populate valid synthetic data across all required fields
    await form.locator('select[name="material_type"]').selectOption("Granite");
    await form.locator('input[name="quantity"]').fill("2500");
    await form.locator('select[name="unit"]').selectOption("sq_ft");
    await form.locator('select[name="thickness"]').selectOption("20mm");
    await form.locator('select[name="finish"]').selectOption("Mirror Polished");
    await form.locator('input[name="delivery_location"]').fill("Mundra Port (FOB)");
    await form.locator('textarea[name="project_notes"]').fill(
      "Synthetic architectural RFQ test: 20mm polished granite slabs with ISPM-15 export-grade crating."
    );
    await form.locator('input[name="name"]').fill("Synthetic Quality Lead");
    await form.locator('input[name="email"]').fill("qa-synthetic@stoneb2b.internal");
    await form.locator('input[name="phone"]').fill("+919876543210");

    // Assert form is now fully valid client-side
    const isFormValid = await form.evaluate((f: HTMLFormElement) => f.checkValidity());
    expect(isFormValid).toBe(true);

    // Explicitly DO NOT submit the form to maintain read-only protection of remote database
  });
});
