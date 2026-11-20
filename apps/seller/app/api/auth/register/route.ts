import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { registerSchema, sanitizeNextPath } from "@stone/validation";
import { checkAuthRateLimits, resetAuthRateLimits, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const body = await request.json();

    const parsed = registerSchema.safeParse({
      ...body,
      accountType: "seller", // strictly enforce seller role for supplier portal registration
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid registration details" },
        { status: 400 },
      );
    }

    const { email, password, fullName } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const rateCheck = checkAuthRateLimits(clientIp, normalizedEmail);

    if (!rateCheck.allowed) {
      const reason =
        rateCheck.scope === "account"
          ? "Too many registration attempts for this account. Please wait before trying again."
          : "Too many registration attempts from this network. Please wait before trying again.";

      return NextResponse.json(
        {
          error: `${reason} (${rateCheck.retryAfterSeconds}s remaining)`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
          scope: rateCheck.scope,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds),
          },
        },
      );
    }

    const safeNext = sanitizeNextPath(body.next, "/seller/dashboard");
    const origin = request.nextUrl.origin;
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: fullName, account_type: "seller" },
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      console.error("[Seller Portal SignUp Error]:", error.name, error.message);
      if (
        error.name === "AuthRetryableFetchError" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("fetch failed"))
      ) {
        return NextResponse.json(
          {
            error:
              "Authentication service is temporarily unreachable. Please check connection and try again.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Reset rate limiter on successful registration
    resetAuthRateLimits(clientIp, normalizedEmail);

    if (data.session) {
      return NextResponse.json({
        success: true,
        redirectTo: safeNext,
      });
    }

    return NextResponse.json({
      success: true,
      requiresEmailVerification: true,
      message:
        "Registration received! Please check your email to verify your seller account or proceed to sign in.",
      redirectTo: safeNext,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
