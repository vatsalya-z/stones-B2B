import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@stone/validation";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Handles the PKCE code→session exchange for email confirmation links.
 * Supabase redirects to /auth/callback?code=<code> after the user clicks
 * the verification link in their inbox.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = sanitizeNextPath(searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }
  // Exchange failed or no code — redirect to error page
  return NextResponse.redirect(new URL("/auth/verify-email?error=verification_failed", origin));
}
