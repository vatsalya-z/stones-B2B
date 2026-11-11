export type PortalName = "marketplace" | "buyer" | "seller" | "admin";

/**
 * Derives the base URL for any of the four StoneB2B portal applications.
 * In production:
 * - marketplace -> https://stonesdekho.com
 * - buyer -> https://buyer.stonesdekho.com
 * - seller -> https://seller.stonesdekho.com
 * - admin -> https://admin.stonesdekho.com
 *
 * In local development:
 * - marketplace -> http://localhost:3000
 * - buyer -> http://localhost:3001
 * - seller -> http://localhost:3002
 * - admin -> http://localhost:3003
 */
export function getPortalBaseUrl(portal: PortalName): string {
  const isProd = process.env.NODE_ENV === "production";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "stonesdekho.com";

  switch (portal) {
    case "marketplace":
      return (
        process.env.NEXT_PUBLIC_MARKETPLACE_URL ||
        (isProd ? `https://${rootDomain}` : "http://localhost:3000")
      );
    case "buyer":
      return (
        process.env.NEXT_PUBLIC_BUYER_URL ||
        (isProd ? `https://buyer.${rootDomain}` : "http://localhost:3001")
      );
    case "seller":
      return (
        process.env.NEXT_PUBLIC_SELLER_URL ||
        (isProd ? `https://seller.${rootDomain}` : "http://localhost:3002")
      );
    case "admin":
      return (
        process.env.NEXT_PUBLIC_ADMIN_URL ||
        (isProd ? `https://admin.${rootDomain}` : "http://localhost:3003")
      );
  }
}

/**
 * Returns a fully qualified cross-portal URL with path.
 */
export function getPortalUrl(portal: PortalName, path = "/"): string {
  const base = getPortalBaseUrl(portal).replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

