import { NextResponse, type NextRequest } from "next/server";

// Active hosted Supabase reference for StonesDekho
const ACTIVE_SUPABASE_PROJECT_REF = "rgmasamasslqintssyrh";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const allCookies = request.cookies.getAll();

  for (const cookie of allCookies) {
    const name = cookie.name;

    // Detect obsolete Supabase auth or leftover Docker/Localhost cookies:
    // 1. Old docker/local instance cookies: sb-127-*, sb-localhost-*
    // 2. Old supabase project tokens that don't match the current active project
    const isStaleLocalSupabase =
      name.startsWith("sb-127-") ||
      name.startsWith("sb-localhost-") ||
      name.includes("127-0-0-1");

    const isObsoleteSupabaseRef =
      name.startsWith("sb-") &&
      !name.startsWith(`sb-${ACTIVE_SUPABASE_PROJECT_REF}-`) &&
      !name.startsWith(`sb-${ACTIVE_SUPABASE_PROJECT_REF}`);

    if (isStaleLocalSupabase || isObsoleteSupabaseRef) {
      // Purge the stale cookie across root path
      response.cookies.delete(name);
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
