import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@stone/validation";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Handles the PKCE code→session exchange for email confirmation links on seller.stonesdekho.com.
 * Supabase redirects to /auth/callback?code=<code> after the user clicks
 * the verification link in their email inbox.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = sanitizeNextPath(searchParams.get("next"), "/seller/dashboard");

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }
    console.error("[Seller Auth Callback Error]:", error);
  }

  // Redirect to login with error notice if code exchange fails
  return NextResponse.redirect(new URL("/login?error=verification_failed", origin));
}
