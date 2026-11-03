import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { loginSchema, sanitizeNextPath } from "@stone/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const safeNext = sanitizeNextPath(body.next, "/dashboard");

    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("[Login Auth Error]:", error.name, error.message);
      if (
        error.name === "AuthRetryableFetchError" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("fetch failed"))
      ) {
        return NextResponse.json(
          { error: "Authentication service is temporarily unreachable. Please check connection and try again." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ success: true, redirectTo: safeNext });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

