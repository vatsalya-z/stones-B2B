import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  parseHost,
  isRouteAllowedOnPanel,
  SHARED_AUTH_ROUTES,
  ADMIN_ROUTES,
  SELLER_ROUTES,
  BUYER_ROUTES,
} from "@/lib/subdomains";

/**
 * Static file extensions and paths exempted from routing rewrites.
 */
const STATIC_FILE_REGEX =
  /\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|map|txt|woff|woff2|ttf|eot)$/i;

/**
 * Public routes that authenticated users should be redirected away from.
 */
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;

  // 1. Static asset and internal bypasses (excluding /robots.txt which is host-aware)
  if (
    pathname !== "/robots.txt" &&
    (pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/auth/") ||
      pathname === "/favicon.ico" ||
      pathname === "/sitemap.xml" ||
      STATIC_FILE_REGEX.test(pathname))
  ) {
    return NextResponse.next({ request });
  }

  // 2. Parse and validate hostname
  const hostInfo = parseHost(rawHost);
  const { subdomain, rootDomain, isLocal, isProduction } = hostInfo;

  // 3. Subdomain Robots.txt handler: disallow indexing of private panels
  if (pathname === "/robots.txt") {
    if (subdomain === "admin" || subdomain === "seller" || subdomain === "buyer") {
      return new NextResponse("User-agent: *\nDisallow: /\n", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
    // For www or root, let Next.js metadata route handle robots.txt
    return NextResponse.next({ request });
  }

  // 4. Block unknown / unconfigured hostnames
  if (subdomain === "unknown") {
    return new NextResponse("404 Not Found — Unrecognized Hostname", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // 5. Canonical apex redirect: domain.com -> www.domain.com in production
  if (subdomain === "root" && isProduction) {
    const canonicalUrl = new URL(`https://www.${rootDomain}${pathname}${search}`);
    return NextResponse.redirect(canonicalUrl, { status: 308 });
  }

  // 6. Handle cross-subdomain redirects from www
  // If someone requests /admin/*, /seller/*, or /buyer/* on www (or www.localhost)
  if (subdomain === "www") {
    if (pathname.startsWith("/admin")) {
      const targetSub = "admin";
      const cleanSubPath = pathname.replace(/^\/admin/, "") || "/dashboard";
      const redirectUrl = isLocal
        ? new URL(`http://${targetSub}.localhost:${hostInfo.port || 3000}${cleanSubPath}${search}`)
        : new URL(`https://${targetSub}.${rootDomain}${cleanSubPath}${search}`);
      return NextResponse.redirect(redirectUrl, { status: 307 });
    }
    if (pathname.startsWith("/seller")) {
      const targetSub = "seller";
      const cleanSubPath = pathname.replace(/^\/seller/, "") || "/dashboard";
      const redirectUrl = isLocal
        ? new URL(`http://${targetSub}.localhost:${hostInfo.port || 3000}${cleanSubPath}${search}`)
        : new URL(`https://${targetSub}.${rootDomain}${cleanSubPath}${search}`);
      return NextResponse.redirect(redirectUrl, { status: 307 });
    }
    if (pathname.startsWith("/buyer")) {
      const targetSub = "buyer";
      const cleanSubPath = pathname.replace(/^\/buyer/, "") || "/dashboard";
      const redirectUrl = isLocal
        ? new URL(`http://${targetSub}.localhost:${hostInfo.port || 3000}${cleanSubPath}${search}`)
        : new URL(`https://${targetSub}.${rootDomain}${cleanSubPath}${search}`);
      return NextResponse.redirect(redirectUrl, { status: 307 });
    }
  }

  // 7. Check panel boundary authorization for dedicated subdomains
  if (subdomain === "admin" || subdomain === "seller" || subdomain === "buyer") {
    const allowed = isRouteAllowedOnPanel(subdomain, pathname);
    if (!allowed) {
      // Forbidden cross-panel route on this subdomain (e.g. /seller on admin host)
      return new NextResponse("404 Not Found — Invalid Route for Subdomain", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      });
    }
  }

  // 8. Initialize Supabase SSR client to manage sessions and refresh cookies
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

  // Track pending cookies from Supabase SSR
  const pendingCookies: { name: string; value: string; options?: CookieOptions }[] = [];

  let user = null;
  if (url && key) {
    try {
      const supabase = createServerClient(url, key, {
        cookieOptions: cookieDomain
          ? {
              domain: cookieDomain,
              sameSite: "lax",
              secure: isProduction,
              path: "/",
            }
          : undefined,
        cookies: {
          getAll: () =>
            request.cookies
              .getAll()
              .filter((c) => c.value && c.value.trim() !== ""),
          setAll: (list: { name: string; value: string; options?: CookieOptions }[]) => {
            for (const item of list) {
              pendingCookies.push(item);
              request.cookies.set(item.name, item.value);
            }
          },
        },
      });

      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch {
      user = null;
    }
  }

  // Helper to commit Supabase cookies and custom headers to any final response
  function finalizeResponse(res: NextResponse): NextResponse {
    for (const { name, value, options } of pendingCookies) {
      res.cookies.set(name, value, {
        ...options,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      });
    }
    // Enforce noindex on non-public subdomains
    if (subdomain === "admin" || subdomain === "seller" || subdomain === "buyer") {
      res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    }
    return res;
  }

  // Never redirect Server Action mutations — let Next.js dispatch actions cleanly
  if (request.headers.has("next-action")) {
    return finalizeResponse(NextResponse.next({ request }));
  }

  // 9. Protected route & Auth route UX guards
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Determine if requested path is protected on the current subdomain
  let isProtected = false;
  if (subdomain === "admin" || subdomain === "seller" || subdomain === "buyer") {
    // Everything on panel subdomains is protected except auth and unauthorized
    const firstSegment = pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
    isProtected = !SHARED_AUTH_ROUTES.has(firstSegment);
  } else {
    // On www / root / local
    isProtected =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/seller") ||
      pathname.startsWith("/buyer") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/profile");
  }

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return finalizeResponse(NextResponse.redirect(loginUrl));
  }

  if (isAuthRoute && user) {
    const defaultDestination =
      subdomain === "admin" || subdomain === "seller" || subdomain === "buyer"
        ? "/dashboard"
        : "/dashboard";
    return finalizeResponse(NextResponse.redirect(new URL(defaultDestination, request.url)));
  }

  // 10. Prepare forwarded request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-subdomain", subdomain);
  requestHeaders.set("x-hostname", hostInfo.hostname);
  requestHeaders.set("x-root-domain", rootDomain);

  // 11. Determine internal rewrite destination for panel subdomains
  let internalPath: string | null = null;

  if (subdomain === "admin" || subdomain === "seller" || subdomain === "buyer") {
    const panel = subdomain;
    const cleanPath = pathname.replace(/\/+$/, "") || "/";

    if (cleanPath === "/" || cleanPath === "/dashboard") {
      internalPath = `/${panel}/dashboard`;
    } else if (cleanPath.startsWith(`/${panel}/`)) {
      // Already prefixed (e.g. /admin/users)
      internalPath = cleanPath;
    } else if (SHARED_AUTH_ROUTES.has(cleanPath.replace(/^\//, ""))) {
      // Shared auth route (/login, /unauthorized) passes through
      internalPath = cleanPath;
    } else {
      // Clean path like /users -> rewrite to /admin/users
      const seg = cleanPath.replace(/^\//, "").split("/")[0] || "";
      const isKnown =
        (panel === "admin" && ADMIN_ROUTES.has(seg)) ||
        (panel === "seller" && SELLER_ROUTES.has(seg)) ||
        (panel === "buyer" && BUYER_ROUTES.has(seg));

      if (isKnown) {
        internalPath = `/${panel}${cleanPath}`;
      }
    }
  }

  // If internal rewrite target determined, rewrite the request
  if (internalPath) {
    const rewriteUrl = new URL(internalPath, request.url);
    rewriteUrl.search = search;
    const response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
    return finalizeResponse(response);
  }

  // Otherwise, standard passthrough
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return finalizeResponse(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
