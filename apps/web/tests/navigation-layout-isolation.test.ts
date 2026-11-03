import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("server-only", () => ({}));

// Mock layout components
vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => React.createElement("header", { "data-testid": "public-site-header" }, "Public Header"),
}));

vi.mock("@/components/layout/site-footer", () => ({
  SiteFooter: () => React.createElement("footer", { "data-testid": "public-site-footer" }, "Public Footer"),
}));

vi.mock("@/components/buyer/buyer-shell", () => ({
  BuyerShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "buyer-shell" }, children),
}));

vi.mock("@/components/seller/seller-shell", () => ({
  SellerShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "seller-shell" }, children),
}));

vi.mock("@/components/admin/admin-shell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-shell" }, children),
}));

const mockBuyerContext = vi.fn();
vi.mock("@/features/buyer/queries", () => ({
  getBuyerContext: () => mockBuyerContext(),
}));

const mockSellerContext = vi.fn();
vi.mock("@/features/seller/queries", () => ({
  getSellerContext: () => mockSellerContext(),
}));

const mockAdminContext = vi.fn();
vi.mock("@/features/admin/guard", () => ({
  getAdminContext: () => mockAdminContext(),
}));

const mockGetUserRoles = vi.fn();
const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUserRoles: () => mockGetUserRoles(),
  requireAuth: () => mockRequireAuth(),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

import PublicMarketplaceLayout from "../app/(public)/layout";
import RootLayout from "../app/layout";
import BuyerPortalLayout from "../app/buyer/layout";
import SellerLayout from "../app/seller/layout";
import AdminLayout from "../app/admin/layout";
import DashboardRouterPage from "../app/dashboard/page";

describe("Navigation & Layout Isolation Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Root Layout Isolation (Tier 0)", () => {
    it("renders document structure without PublicHeader or PublicFooter", () => {
      const child = React.createElement("div", { "data-testid": "page-content" }, "Hello World");
      const root = RootLayout({ children: child });

      expect(root.type).toBe("html");
      const body = root.props.children;
      expect(body.type).toBe("body");

      // Body must directly contain children, with zero header/footer wrappers
      const bodyContent = body.props.children;
      expect(bodyContent.props["data-testid"]).toBe("page-content");
    });
  });

  describe("2. Public Marketplace Layout (Tier 1)", () => {
    it("renders SiteHeader and SiteFooter around public content", () => {
      const child = React.createElement("div", { "data-testid": "marketplace-page" }, "Marketplace Page");
      const layout = PublicMarketplaceLayout({ children: child });

      expect(layout.props.className).toContain("flex min-h-screen flex-col");
      const [header, main, footer] = layout.props.children;

      expect(header.type.name).toBe("SiteHeader");
      expect(main.type).toBe("main");
      expect(main.props.children.props["data-testid"]).toBe("marketplace-page");
      expect(footer.type.name).toBe("SiteFooter");
    });
  });

  describe("3. Buyer Portal Layout Isolation (Tier 2)", () => {
    it("renders BuyerShell exclusively and does NOT render SiteHeader or SiteFooter", async () => {
      mockBuyerContext.mockResolvedValueOnce({
        user: { id: "buyer-1", email: "buyer@example.com" },
        profile: { full_name: "Buyer One" },
        extendedAddress: { companyName: "Stone Co" },
        unreadNotificationsCount: 2,
        unreadMessagesCount: 0,
        pendingQuotationsCount: 1,
        hasSellerRole: false,
      });

      const child = React.createElement("div", { "data-testid": "buyer-content" }, "Buyer Page");
      const result = await BuyerPortalLayout({ children: child });

      expect(result.type.name).toBe("BuyerShell");
      expect(result.props["userId"]).toBe("buyer-1");
      expect(result.props.children.props["data-testid"]).toBe("buyer-content");
    });
  });

  describe("4. Seller Portal Layout Isolation (Tier 3)", () => {
    it("renders SellerShell exclusively and does NOT render SiteHeader or SiteFooter", async () => {
      mockSellerContext.mockResolvedValueOnce({
        user: { id: "seller-1", email: "seller@example.com" },
        sellerProfile: {
          id: "sp-1",
          business_name: "Granite Quarry Ltd",
          slug: "granite-quarry",
          verification_status: "verified",
          resolvedLogoUrl: null,
        },
        hasBuyerRole: true,
        unreadEnquiriesCount: 3,
        unreadMessagesCount: 1,
        unreadNotificationsCount: 4,
      });

      const child = React.createElement("div", { "data-testid": "seller-content" }, "Seller Page");
      const result = await SellerLayout({ children: child });

      expect(result.type.name).toBe("SellerShell");
      expect(result.props["sellerId"]).toBe("sp-1");
      expect(result.props["hasBuyerRole"]).toBe(true);
      expect(result.props.children.props["data-testid"]).toBe("seller-content");
    });
  });

  describe("5. Admin Console Layout Isolation (Tier 4)", () => {
    it("renders AdminShell exclusively and does NOT render SiteHeader or SiteFooter", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ count: 2 }),
            eq: vi.fn().mockResolvedValue({ count: 5 }),
          })),
        })),
      };

      mockAdminContext.mockResolvedValueOnce({
        user: { id: "admin-1", email: "admin@gmail.com" },
        profile: { full_name: "System Admin" },
        isSuperAdmin: true,
        supabase: mockSupabase,
      });

      const child = React.createElement("div", { "data-testid": "admin-content" }, "Admin Page");
      const result = await AdminLayout({ children: child });

      expect(result.type.name).toBe("AdminShell");
      expect(result.props["userEmail"]).toBe("admin@gmail.com");
      expect(result.props["isSuperAdmin"]).toBe(true);
      expect(result.props.children.props["data-testid"]).toBe("admin-content");
    });
  });

  describe("6. Role Router & Dual-Role Switching (/dashboard)", () => {
    it("redirects to /admin/dashboard when portal=admin requested and user is authorized", async () => {
      mockRequireAuth.mockResolvedValueOnce({ id: "user-1" });
      mockGetUserRoles.mockResolvedValueOnce(["admin", "buyer"]);

      await DashboardRouterPage({ searchParams: Promise.resolve({ portal: "admin" }) });
      expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
    });

    it("redirects to /buyer/dashboard when portal=buyer requested for a dual-role user", async () => {
      mockRequireAuth.mockResolvedValueOnce({ id: "user-1" });
      mockGetUserRoles.mockResolvedValueOnce(["buyer", "seller"]);

      await DashboardRouterPage({ searchParams: Promise.resolve({ portal: "buyer" }) });
      expect(mockRedirect).toHaveBeenCalledWith("/buyer/dashboard");
    });

    it("redirects to /seller/dashboard when portal=seller requested for a dual-role user", async () => {
      mockRequireAuth.mockResolvedValueOnce({ id: "user-1" });
      mockGetUserRoles.mockResolvedValueOnce(["buyer", "seller"]);

      await DashboardRouterPage({ searchParams: Promise.resolve({ portal: "seller" }) });
      expect(mockRedirect).toHaveBeenCalledWith("/seller/dashboard");
    });

    it("falls back to /admin/dashboard by default if user possesses admin role without portal param", async () => {
      mockRequireAuth.mockResolvedValueOnce({ id: "user-1" });
      mockGetUserRoles.mockResolvedValueOnce(["admin", "buyer"]);

      await DashboardRouterPage({ searchParams: Promise.resolve({}) });
      expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
    });
  });
});

