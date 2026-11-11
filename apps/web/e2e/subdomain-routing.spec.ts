import { test, expect } from "@playwright/test";

test.describe("Subdomain Routing & Enterprise Access Boundaries", () => {
  test("Public marketplace renders correctly on public host", async ({ page }) => {
    // Visit root on public marketplace
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);

    // Verify public marketplace elements are present
    const mainHeader = page.locator("header");
    await expect(mainHeader).toBeVisible();
    await expect(page.locator("text=StonesDekho").first()).toBeVisible();
  });

  test("Unknown subdomain returns 404 Not Found", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/`, {
      headers: {
        host: "unknown.stonesdekho.com",
      },
    });
    expect(res.status()).toBe(404);
    const body = await res.text();
    expect(body).toContain("Unrecognized Hostname");
  });

  test("Admin subdomain disallows indexing in robots.txt", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/robots.txt`, {
      headers: {
        host: "admin.localhost:3100",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Disallow: /");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("Seller subdomain disallows indexing in robots.txt", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/robots.txt`, {
      headers: {
        host: "seller.localhost:3100",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Disallow: /");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("Buyer subdomain disallows indexing in robots.txt", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/robots.txt`, {
      headers: {
        host: "buyer.localhost:3100",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Disallow: /");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("Admin subdomain blocks cross-panel routes with 404", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/seller/products`, {
      headers: {
        host: "admin.localhost:3100",
      },
    });
    expect(res.status()).toBe(404);
    const body = await res.text();
    expect(body).toContain("Invalid Route for Subdomain");
  });

  test("Seller subdomain blocks cross-panel routes with 404", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/admin/users`, {
      headers: {
        host: "seller.localhost:3100",
      },
    });
    expect(res.status()).toBe(404);
    const body = await res.text();
    expect(body).toContain("Invalid Route for Subdomain");
  });

  test("Buyer subdomain blocks cross-panel routes with 404", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/admin/users`, {
      headers: {
        host: "buyer.localhost:3100",
      },
    });
    expect(res.status()).toBe(404);
    const body = await res.text();
    expect(body).toContain("Invalid Route for Subdomain");
  });

  test("Unauthenticated user on admin subdomain is redirected to /login with next parameter", async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(`${baseURL}/dashboard`, {
      headers: {
        host: "admin.localhost:3100",
      },
      maxRedirects: 0,
    });
    // Next.js returns redirect (307)
    expect([302, 307, 308]).toContain(res.status());
    const location = res.headers()["location"] || "";
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fdashboard");
  });

  test("Unauthenticated user on seller subdomain is redirected to /login", async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(`${baseURL}/products`, {
      headers: {
        host: "seller.localhost:3100",
      },
      maxRedirects: 0,
    });
    expect([302, 307, 308]).toContain(res.status());
    const location = res.headers()["location"] || "";
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fproducts");
  });

  test("Unauthenticated user on buyer subdomain is redirected to /login", async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(`${baseURL}/rfqs`, {
      headers: {
        host: "buyer.localhost:3100",
      },
      maxRedirects: 0,
    });
    expect([302, 307, 308]).toContain(res.status());
    const location = res.headers()["location"] || "";
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Frfqs");
  });
});

