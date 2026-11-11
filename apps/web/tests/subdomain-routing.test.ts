import { describe, it, expect } from "vitest";
import {
  parseHost,
  sanitizeHostHeader,
  getSubdomainUrl,
  isRouteAllowedOnPanel,
} from "../lib/subdomains";
import { middleware } from "../middleware";
import { NextRequest } from "next/server";

describe("Phase 1 & 3: Hostname Resolution and Parsing", () => {
  it("resolves production subdomains correctly", () => {
    expect(parseHost("admin.stonesdekho.com")).toMatchObject({
      subdomain: "admin",
      rootDomain: "stonesdekho.com",
      isLocal: false,
      isProduction: true,
    });

    expect(parseHost("seller.stonesdekho.com")).toMatchObject({
      subdomain: "seller",
      rootDomain: "stonesdekho.com",
      isLocal: false,
      isProduction: true,
    });

    expect(parseHost("buyer.stonesdekho.com")).toMatchObject({
      subdomain: "buyer",
      rootDomain: "stonesdekho.com",
      isLocal: false,
      isProduction: true,
    });

    expect(parseHost("www.stonesdekho.com")).toMatchObject({
      subdomain: "www",
      rootDomain: "stonesdekho.com",
      isLocal: false,
      isProduction: true,
    });

    expect(parseHost("stonesdekho.com")).toMatchObject({
      subdomain: "root",
      rootDomain: "stonesdekho.com",
      isLocal: false,
      isProduction: true,
    });
  });

  it("resolves local development subdomains with port correctly", () => {
    expect(parseHost("admin.localhost:3000")).toMatchObject({
      subdomain: "admin",
      rootDomain: "localhost",
      isLocal: true,
      port: "3000",
      isProduction: false,
    });

    expect(parseHost("seller.localhost:3000")).toMatchObject({
      subdomain: "seller",
      rootDomain: "localhost",
      isLocal: true,
      port: "3000",
      isProduction: false,
    });

    expect(parseHost("buyer.localhost:3000")).toMatchObject({
      subdomain: "buyer",
      rootDomain: "localhost",
      isLocal: true,
      port: "3000",
      isProduction: false,
    });

    expect(parseHost("www.localhost:3000")).toMatchObject({
      subdomain: "www",
      rootDomain: "localhost",
      isLocal: true,
      port: "3000",
      isProduction: false,
    });

    expect(parseHost("localhost:3000")).toMatchObject({
      subdomain: "local",
      rootDomain: "localhost",
      isLocal: true,
      port: "3000",
      isProduction: false,
    });

    expect(parseHost("127.0.0.1:3000")).toMatchObject({
      subdomain: "local",
      rootDomain: "localhost",
      isLocal: true,
      port: "3000",
      isProduction: false,
    });
  });

  it("identifies preview environments", () => {
    expect(parseHost("stone-web-preview.vercel.app")).toMatchObject({
      subdomain: "preview",
      rootDomain: "vercel.app",
      isPreview: true,
      isLocal: false,
    });
  });

  it("rejects unknown and unrecognized hostnames safely", () => {
    expect(parseHost("unauthorized.stonesdekho.com").subdomain).toBe("unknown");
    expect(parseHost("malicious-phishing.com").subdomain).toBe("unknown");
    expect(parseHost("hack.localhost").subdomain).toBe("unknown");
  });

  it("sanitizes host headers to prevent header injection spoofing", () => {
    expect(sanitizeHostHeader("admin.stonesdekho.com")).toBe("admin.stonesdekho.com");
    expect(sanitizeHostHeader("admin.stonesdekho.com:3000")).toBe("admin.stonesdekho.com:3000");
    // Invalid characters: newlines, semicolons, control characters
    expect(sanitizeHostHeader("admin.stonesdekho.com\r\nX-Injected: 1")).toBeNull();
    expect(sanitizeHostHeader("evil<script>.com")).toBeNull();
    expect(sanitizeHostHeader("evil;rm -rf")).toBeNull();
    expect(sanitizeHostHeader("")).toBeNull();
    expect(sanitizeHostHeader(null)).toBeNull();
  });
});

describe("Cross-Subdomain URL Generation", () => {
  it("generates production URLs correctly", () => {
    const prodHost = "www.stonesdekho.com";
    expect(getSubdomainUrl("admin", "/dashboard", prodHost)).toBe(
      "https://admin.stonesdekho.com/dashboard",
    );
    expect(getSubdomainUrl("seller", "/products", prodHost)).toBe(
      "https://seller.stonesdekho.com/products",
    );
    expect(getSubdomainUrl("buyer", "/rfqs", prodHost)).toBe(
      "https://buyer.stonesdekho.com/rfqs",
    );
    expect(getSubdomainUrl("www", "/categories", prodHost)).toBe(
      "https://www.stonesdekho.com/categories",
    );
    expect(getSubdomainUrl("root", "/", prodHost)).toBe(
      "https://stonesdekho.com/",
    );
  });

  it("generates local development URLs correctly", () => {
    const localHost = "localhost:3000";
    expect(getSubdomainUrl("admin", "/dashboard", localHost)).toBe(
      "http://admin.localhost:3000/dashboard",
    );
    expect(getSubdomainUrl("seller", "/products", localHost)).toBe(
      "http://seller.localhost:3000/products",
    );
    expect(getSubdomainUrl("buyer", "/rfqs", localHost)).toBe(
      "http://buyer.localhost:3000/rfqs",
    );
    expect(getSubdomainUrl("www", "/", localHost)).toBe(
      "http://localhost:3000/",
    );
  });
});

describe("Panel Route Boundary Verification", () => {
  it("authorizes valid routes on the Admin panel", () => {
    expect(isRouteAllowedOnPanel("admin", "/")).toBe(true);
    expect(isRouteAllowedOnPanel("admin", "/dashboard")).toBe(true);
    expect(isRouteAllowedOnPanel("admin", "/users")).toBe(true);
    expect(isRouteAllowedOnPanel("admin", "/sellers")).toBe(true);
    expect(isRouteAllowedOnPanel("admin", "/products")).toBe(true);
    expect(isRouteAllowedOnPanel("admin", "/login")).toBe(true);
    expect(isRouteAllowedOnPanel("admin", "/admin/dashboard")).toBe(true);
  });

  it("blocks cross-panel routes on the Admin panel", () => {
    expect(isRouteAllowedOnPanel("admin", "/seller/products")).toBe(false);
    expect(isRouteAllowedOnPanel("admin", "/buyer/rfqs")).toBe(false);
    expect(isRouteAllowedOnPanel("admin", "/how-it-works")).toBe(false);
    expect(isRouteAllowedOnPanel("admin", "/suppliers")).toBe(false);
  });

  it("authorizes valid routes on the Seller panel", () => {
    expect(isRouteAllowedOnPanel("seller", "/")).toBe(true);
    expect(isRouteAllowedOnPanel("seller", "/dashboard")).toBe(true);
    expect(isRouteAllowedOnPanel("seller", "/products")).toBe(true);
    expect(isRouteAllowedOnPanel("seller", "/quotes")).toBe(true);
    expect(isRouteAllowedOnPanel("seller", "/orders")).toBe(true);
    expect(isRouteAllowedOnPanel("seller", "/seller/dashboard")).toBe(true);
  });

  it("blocks cross-panel routes on the Seller panel", () => {
    expect(isRouteAllowedOnPanel("seller", "/admin/users")).toBe(false);
    expect(isRouteAllowedOnPanel("seller", "/buyer/rfqs")).toBe(false);
    expect(isRouteAllowedOnPanel("seller", "/suppliers")).toBe(false);
  });

  it("authorizes valid routes on the Buyer panel", () => {
    expect(isRouteAllowedOnPanel("buyer", "/")).toBe(true);
    expect(isRouteAllowedOnPanel("buyer", "/dashboard")).toBe(true);
    expect(isRouteAllowedOnPanel("buyer", "/rfqs")).toBe(true);
    expect(isRouteAllowedOnPanel("buyer", "/quotations")).toBe(true);
    expect(isRouteAllowedOnPanel("buyer", "/buyer/dashboard")).toBe(true);
  });

  it("blocks cross-panel routes on the Buyer panel", () => {
    expect(isRouteAllowedOnPanel("buyer", "/admin/users")).toBe(false);
    expect(isRouteAllowedOnPanel("buyer", "/seller/products")).toBe(false);
    expect(isRouteAllowedOnPanel("buyer", "/how-it-works")).toBe(false);
  });
});

describe("Phase 3 & 13: Subdomain Middleware Routing & Security Gate", () => {
  function createReq(url: string, host: string) {
    return new NextRequest(new URL(url), {
      headers: {
        host,
      },
    });
  }

  it("returns 404 for unknown hostnames", async () => {
    const req = createReq("http://unknown.stonesdekho.com/test", "unknown.stonesdekho.com");
    const res = await middleware(req);
    expect(res.status).toBe(404);
  });

  it("blocks cross-panel access with 404 on panel subdomains", async () => {
    const req = createReq("http://admin.localhost:3000/seller/products", "admin.localhost:3000");
    const res = await middleware(req);
    expect(res.status).toBe(404);
  });

  it("serves custom disallow robots.txt on admin, seller and buyer subdomains", async () => {
    const adminReq = createReq("http://admin.localhost:3000/robots.txt", "admin.localhost:3000");
    const adminRes = await middleware(adminReq);
    expect(adminRes.status).toBe(200);
    const text = await adminRes.text();
    expect(text).toContain("Disallow: /");
    expect(adminRes.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("redirects root domain to www canonically with status 308 in production", async () => {
    const req = createReq("https://stonesdekho.com/products?cat=marble", "stonesdekho.com");
    const res = await middleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://www.stonesdekho.com/products?cat=marble");
  });

  it("redirects /admin on www to admin subdomain with status 307", async () => {
    const req = createReq("https://www.stonesdekho.com/admin/dashboard", "www.stonesdekho.com");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://admin.stonesdekho.com/dashboard");
  });

  it("redirects /seller on www to seller subdomain with status 307", async () => {
    const req = createReq("https://www.stonesdekho.com/seller/products", "www.stonesdekho.com");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://seller.stonesdekho.com/products");
  });

  it("redirects /buyer on www to buyer subdomain with status 307", async () => {
    const req = createReq("https://www.stonesdekho.com/buyer/rfqs", "www.stonesdekho.com");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://buyer.stonesdekho.com/rfqs");
  });
});
