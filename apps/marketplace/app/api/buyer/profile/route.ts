import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { createAdminClient } from "@stone/database/admin";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { fullName, phone, city, state } = body as {
      fullName?: string;
      phone?: string;
      city?: string;
      state?: string;
    };

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        full_name: fullName ? fullName.trim() : null,
        phone: phone ? phone.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[Profile Update Error]:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Profile API Error]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
