/**
 * Returns the correct public marketplace (stonesdekho.com) base URL.
 *
 * Priority:
 *  1. Client-side runtime: if in browser and on production hostname (e.g. seller.stonesdekho.com),
 *     automatically derive "https://stonesdekho.com" (or stripped root domain)
 *  2. Explicit NEXT_PUBLIC_MARKETPLACE_URL
 *  3. Derived from NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL
 *  4. Production environment fallback -> "https://stonesdekho.com" (or configured NEXT_PUBLIC_ROOT_DOMAIN)
 *  5. Local development fallback -> "http://localhost:3000"
 */
export function getMarketplaceBaseUrl(): string {
  // 1. Client-side runtime detection (always accurate in user's browser)
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname.toLowerCase();
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost");

    if (!isLocal) {
      if (hostname.endsWith("stonesdekho.com")) {
        return "https://stonesdekho.com";
      }
      if (hostname.endsWith("stoneb2b.com")) {
        return "https://stoneb2b.com";
      }
      // Other custom domains: strip subdomain
      const rootHost = hostname.replace(/^(seller|admin|buyer|www)\./i, "");
      return `${window.location.protocol}//${rootHost}`;
    }
  }

  // 2. Explicit environment override
  if (process.env.NEXT_PUBLIC_MARKETPLACE_URL) {
    return process.env.NEXT_PUBLIC_MARKETPLACE_URL;
  }

  // 3. Derive from site/app URL
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

  if (siteUrl && !siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1")) {
    try {
      const url = new URL(siteUrl);
      const host = url.hostname.replace(/^(seller|admin|buyer|www)\./i, "");
      return `${url.protocol}//${host}`;
    } catch {
      // Fall through
    }
  }

  // 4. In production build/server environment, never fall back to localhost
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProd) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "stonesdekho.com";
    return `https://${rootDomain}`;
  }

  // 5. Local development fallback
  return "http://localhost:3000";
}
