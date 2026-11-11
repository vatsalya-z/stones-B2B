import "server-only";
import type { CookieOptions } from "@supabase/ssr";

export interface CookieConfigOptions {
  cookieDomain?: string | null;
  isProduction?: boolean;
}

/**
 * Derives production-grade cookie options for cross-subdomain SSO.
 * In production with ROOT_DOMAIN=stonesdekho.com, sets domain=.stonesdekho.com.
 * In local development, domain is left undefined (host-only) to allow natural
 * RFC 6265 sharing across localhost ports.
 */
export function getCrossSubdomainCookieOptions(
  options: CookieConfigOptions = {}
): Partial<CookieOptions> {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";
  const rawDomain = options.cookieDomain ?? process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

  // In local development or when no domain is provided, omit domain attribute for host-only cookies
  if (!isProduction || !rawDomain || rawDomain.includes("localhost") || rawDomain.includes("127.0.0.1")) {
    return {
      path: "/",
      sameSite: "lax",
      secure: isProduction,
    };
  }

  // Ensure leading dot for cross-subdomain sharing across www, buyer, seller, admin
  const normalizedDomain = rawDomain.startsWith(".") ? rawDomain : `.${rawDomain}`;

  return {
    domain: normalizedDomain,
    path: "/",
    sameSite: "lax",
    secure: true,
  };
}

