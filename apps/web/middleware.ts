import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protected route prefixes — any path starting with these requires an active
 * Supabase session. Role-level checks (buyer / seller / admin) are enforced
 * again inside the page/route handlers and via RLS; middleware is a UX guard,
 * not the security boundary.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/seller", "/buyer", "/admin"];

/**
 * Public routes that authenticated users should be redirected away from
 * (e.g. sending a logged-in user back to /dashboard from /login).
 */
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are missing (e.g. CI without secrets) just pass through.
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () =>
        request.cookies
          .getAll()
          .filter((c) => c.value && c.value.trim() !== ""),
      setAll: (list: { name: string; value: string; options?: CookieOptions }[]) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Always call getUser() to refresh the session cookie.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // Empty or malformed auth cookie — treat as unauthenticated
    user = null;
  }

  // Never redirect Server Action mutations — let Next.js dispatch actions cleanly
  if (request.headers.has("next-action")) {
    return response;
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
