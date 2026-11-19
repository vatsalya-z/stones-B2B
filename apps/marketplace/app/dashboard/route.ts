import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    // Fetch user roles
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (roleRows || []).map((r) => r.role);

    if (roles.includes("seller")) {
      const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL;
      if (sellerUrl && sellerUrl !== origin) {
        return NextResponse.redirect(new URL("/seller/dashboard", sellerUrl));
      }
      return NextResponse.redirect(new URL("/auth/pending", origin));
    }

    if (roles.includes("admin")) {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
      if (adminUrl && adminUrl !== origin) {
        return NextResponse.redirect(new URL("/admin/dashboard", adminUrl));
      }
      return NextResponse.redirect(new URL("/", origin));
    }

    // Buyer or default user
    const buyerUrl = process.env.NEXT_PUBLIC_BUYER_URL;
    if (buyerUrl && buyerUrl !== origin) {
      return NextResponse.redirect(new URL("/buyer/dashboard", buyerUrl));
    }
    return NextResponse.redirect(new URL("/profile", origin));
  } catch (err) {
    console.error("[Dashboard Route Error]:", err);
    return NextResponse.redirect(new URL("/profile", origin));
  }
}
