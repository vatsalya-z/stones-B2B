import React, { type ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Public Marketplace Layout
 *
 * Dedicated layout for all public marketplace routes:
 * - Homepage (/)
 * - Products (/products, /products/[slug], /products/[slug]/enquiry)
 * - Categories (/categories, /categories/[slug])
 * - Suppliers (/suppliers, /suppliers/[slug])
 * - Informational & Legal (/about, /contact, /privacy, /terms)
 * - Search (/search)
 * - Unauthorized (/unauthorized)
 *
 * Excludes all authenticated portal dashboards (Buyer, Seller, Admin)
 * so the public navbar never leaks into authenticated workspaces.
 */
export default function PublicMarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 overflow-x-hidden">
      <SiteHeader />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <SiteFooter />
    </div>
  );
}
