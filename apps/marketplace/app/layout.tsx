import React, { type ReactNode } from "react";
import type { Metadata } from "next";
import { cn } from "@stone/ui";
import "../styles/globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stonesdekho.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "StonesDekho — Premium Natural Stone Marketplace",
    template: "%s | StonesDekho",
  },
  description:
    "B2B marketplace for natural stone, marble, granite, sandstone and architectural stone products. Connect with verified Indian stone suppliers and exporters on StonesDekho.",
  openGraph: {
    siteName: "StonesDekho",
    type: "website",
    locale: "en_IN",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/icon.svg",
  },
};

/**
 * Global Root Layout
 *
 * Houses ONLY global document structure:
 * - HTML and body tags
 * - Global CSS stylesheet (Tailwind base, fonts, utilities)
 * - Metadata definitions
 *
 * Navigation is strictly decoupled:
 * - Public Marketplace routes render SiteHeader & SiteFooter via app/(public)/layout.tsx
 * - Buyer routes render BuyerShell via app/buyer/layout.tsx
 * - Seller routes render SellerShell via app/seller/layout.tsx
 * - Admin routes render AdminShell via app/admin/layout.tsx
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className="h-full">
      <head>
        <link
          rel="preload"
          href="/fonts/PlayfairDisplay-Bold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/PlayfairDisplay-ExtraBold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className={cn("min-h-full bg-stone-50 text-stone-900 antialiased")}>
        {children}
      </body>
    </html>
  );
}
