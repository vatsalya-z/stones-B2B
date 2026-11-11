/**
 * Enterprise Subdomain Configuration & Hostname Utilities
 *
 * Defines the domain mapping and routing rules for StonesDekho:
 * - Public Marketplace : www.YOUR_DOMAIN.com & YOUR_DOMAIN.com
 * - Admin Panel        : admin.YOUR_DOMAIN.com
 * - Seller Panel       : seller.YOUR_DOMAIN.com
 * - Buyer Panel        : buyer.YOUR_DOMAIN.com
 *
 * Supports local development (*.localhost, localhost:3000), preview deployments
 * (*.vercel.app), and production hostnames with spoofing prevention.
 */

export type SubdomainType =
  | "admin"
  | "seller"
  | "buyer"
  | "www"
  | "root"
  | "local"
  | "preview"
  | "unknown";

export interface ParsedHostInfo {
  subdomain: SubdomainType;
  hostname: string;
  port: string | null;
  rootDomain: string;
  isLocal: boolean;
  isPreview: boolean;
  isProduction: boolean;
}

/** Configured primary root domain (e.g. stonesdekho.com) */
export const PRIMARY_ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "stonesdekho.com";

/** Alternate root domains supported for backward compatibility or domain aliases */
export const RECOGNIZED_ROOT_DOMAINS: string[] = [
  PRIMARY_ROOT_DOMAIN.toLowerCase(),
  "stoneb2b.com",
];

/** Valid subdomains for panel routing */
export const VALID_SUBDOMAINS: ReadonlySet<string> = new Set([
  "admin",
  "seller",
  "buyer",
  "www",
]);

/**
 * Known subpaths for each panel.
 * Used by middleware to recognize clean URLs (e.g., admin.domain.com/users)
 * and rewrite them internally to the App Router path (/admin/users).
 */
export const ADMIN_ROUTES: ReadonlySet<string> = new Set([
  "dashboard",
  "users",
  "sellers",
  "buyers",
  "products",
  "categories",
  "enquiries",
  "quotes",
  "orders",
  "reports",
  "audit",
  "settings",
]);

export const SELLER_ROUTES: ReadonlySet<string> = new Set([
  "dashboard",
  "products",
  "quotes",
  "orders",
  "enquiries",
  "messages",
  "notifications",
  "analytics",
  "store",
  "verification",
  "profile",
]);

export const BUYER_ROUTES: ReadonlySet<string> = new Set([
  "dashboard",
  "rfqs",
  "quotations",
  "quotes",
  "orders",
  "enquiries",
  "favourites",
  "messages",
  "notifications",
  "addresses",
  "profile",
  "settings",
]);

/** Auth routes allowed across all panels so users can sign in on any subdomain */
export const SHARED_AUTH_ROUTES: ReadonlySet<string> = new Set([
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "unauthorized",
]);

/**
 * Sanitizes and validates a raw Host header.
 * Rejects illegal characters to prevent host header injection attacks.
 */
export function sanitizeHostHeader(rawHost: string | null | undefined): string | null {
  if (!rawHost) return null;
  const trimmed = rawHost.trim().toLowerCase();
  // Valid host: letters, digits, hyphens, dots, optional :port
  if (!/^[a-z0-9.-]+(:[0-9]+)?$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Parses any incoming hostname into structured subdomain and environment metadata.
 *
 * Examples:
 * - "admin.stonesdekho.com"   -> { subdomain: "admin", rootDomain: "stonesdekho.com", isLocal: false }
 * - "seller.localhost:3000"    -> { subdomain: "seller", rootDomain: "localhost", isLocal: true, port: "3000" }
 * - "www.stonesdekho.com"      -> { subdomain: "www", rootDomain: "stonesdekho.com", isLocal: false }
 * - "stonesdekho.com"          -> { subdomain: "root", rootDomain: "stonesdekho.com", isLocal: false }
 * - "localhost:3000"           -> { subdomain: "local", rootDomain: "localhost", isLocal: true, port: "3000" }
 * - "preview-123.vercel.app"   -> { subdomain: "preview", rootDomain: "vercel.app", isPreview: true }
 * - "unauthorized.domain.com"  -> { subdomain: "unknown", ... }
 */
export function parseHost(rawHost: string | null | undefined): ParsedHostInfo {
  const sanitized = sanitizeHostHeader(rawHost);

  if (!sanitized) {
    return {
      subdomain: "unknown",
      hostname: "",
      port: null,
      rootDomain: PRIMARY_ROOT_DOMAIN,
      isLocal: false,
      isPreview: false,
      isProduction: false,
    };
  }

  const [hostname, port] = sanitized.includes(":")
    ? sanitized.split(":")
    : [sanitized, null];

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  const isPreview =
    hostname.endsWith(".vercel.app") ||
    hostname.includes("preview.") ||
    hostname.includes("-git-");

  const isProduction = !isLocal && !isPreview;

  // Case 1: Standard localhost (no subdomain)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return {
      subdomain: "local",
      hostname,
      port: port ?? null,
      rootDomain: "localhost",
      isLocal: true,
      isPreview: false,
      isProduction: false,
    };
  }

  // Case 2: Localhost with subdomain (e.g. admin.localhost:3000)
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    if (VALID_SUBDOMAINS.has(sub)) {
      return {
        subdomain: sub as SubdomainType,
        hostname,
        port: port ?? null,
        rootDomain: "localhost",
        isLocal: true,
        isPreview: false,
        isProduction: false,
      };
    }
    return {
      subdomain: "unknown",
      hostname,
      port: port ?? null,
      rootDomain: "localhost",
      isLocal: true,
      isPreview: false,
      isProduction: false,
    };
  }

  // Case 3: Production or staging root domain matching
  let matchedRoot: string | null = null;
  for (const root of RECOGNIZED_ROOT_DOMAINS) {
    if (hostname === root || hostname.endsWith("." + root)) {
      matchedRoot = root;
      break;
    }
  }

  if (matchedRoot) {
    if (hostname === matchedRoot) {
      return {
        subdomain: "root",
        hostname,
        port: port ?? null,
        rootDomain: matchedRoot,
        isLocal: false,
        isPreview: false,
        isProduction: true,
      };
    }

    const prefix = hostname.slice(0, -(matchedRoot.length + 1));
    if (VALID_SUBDOMAINS.has(prefix)) {
      return {
        subdomain: prefix as SubdomainType,
        hostname,
        port: port ?? null,
        rootDomain: matchedRoot,
        isLocal: false,
        isPreview: false,
        isProduction: true,
      };
    }

    return {
      subdomain: "unknown",
      hostname,
      port: port ?? null,
      rootDomain: matchedRoot,
      isLocal: false,
      isPreview: false,
      isProduction: true,
    };
  }

  // Case 4: Preview deployments (e.g. Vercel)
  if (isPreview) {
    return {
      subdomain: "preview",
      hostname,
      port: port ?? null,
      rootDomain: "vercel.app",
      isLocal: false,
      isPreview: true,
      isProduction: false,
    };
  }

  // Case 5: Unrecognized domain
  return {
    subdomain: "unknown",
    hostname,
    port: port ?? null,
    rootDomain: PRIMARY_ROOT_DOMAIN,
    isLocal: false,
    isPreview: false,
    isProduction,
  };
}

/**
 * Returns the fully qualified URL for a target subdomain or portal.
 * Respects local development, preview, and production domains.
 *
 * @param targetSubdomain 'admin' | 'seller' | 'buyer' | 'www' | 'root'
 * @param path Optional pathname (defaults to '/')
 * @param currentHost Optional incoming host header for context awareness
 */
export function getSubdomainUrl(
  targetSubdomain: "admin" | "seller" | "buyer" | "www" | "root",
  path: string = "/",
  currentHost?: string | null,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const hostInfo = parseHost(currentHost || process.env.NEXT_PUBLIC_APP_URL || "localhost:3000");

  // Local development handling
  if (hostInfo.isLocal) {
    const portSuffix = hostInfo.port ? `:${hostInfo.port}` : ":3000";
    if (targetSubdomain === "root" || targetSubdomain === "www") {
      return `http://localhost${portSuffix}${normalizedPath}`;
    }
    return `http://${targetSubdomain}.localhost${portSuffix}${normalizedPath}`;
  }

  // Preview environment handling: use path-based routing on preview URL
  if (hostInfo.isPreview) {
    if (targetSubdomain === "root" || targetSubdomain === "www") {
      return `https://${hostInfo.hostname}${normalizedPath}`;
    }
    return `https://${hostInfo.hostname}/${targetSubdomain}${normalizedPath}`;
  }

  // Production handling
  const root = hostInfo.rootDomain || PRIMARY_ROOT_DOMAIN;
  if (targetSubdomain === "root") {
    return `https://${root}${normalizedPath}`;
  }
  return `https://${targetSubdomain}.${root}${normalizedPath}`;
}

/**
 * Determines whether a requested pathname belongs to the specified panel.
 */
export function isRouteAllowedOnPanel(
  panel: "admin" | "seller" | "buyer",
  pathname: string,
): boolean {
  // Strip leading/trailing slashes
  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/");
  const firstSegment = segments[0] || "";

  if (firstSegment === "" || firstSegment === "dashboard") {
    return true;
  }

  // Direct panel prefix e.g. /admin/users or /seller/products
  if (firstSegment === panel) {
    return true;
  }

  // Shared auth & public error routes
  if (SHARED_AUTH_ROUTES.has(firstSegment)) {
    return true;
  }

  // Known panel sub-routes
  if (panel === "admin") return ADMIN_ROUTES.has(firstSegment);
  if (panel === "seller") return SELLER_ROUTES.has(firstSegment);
  if (panel === "buyer") return BUYER_ROUTES.has(firstSegment);

  return false;
}

