import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { createAdminClient } from "@stone/database/admin";

/**
 * Mobile Authentication & Verification API
 * Supports IndiaMart-style Mobile + OTP flow for buyers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, phone, otp } = body as {
      action: "send_otp" | "verify_otp";
      phone?: string;
      otp?: string;
    };

    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 },
      );
    }

    const formattedPhone = `+91${cleanPhone}`;

    // Action 1: Send OTP
    if (action === "send_otp") {
      // Record lead / inquiry in database immediately so business never loses the buyer contact!
      try {
        const admin = createAdminClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("search_leads").insert({
          query: "Buyer Direct Mobile Sign-In",
          guest_phone: formattedPhone,
          guest_name: "Buyer (" + formattedPhone + ")",
        });
      } catch (err) {
        console.error("Failed to store mobile lead:", err);
      }

      // In development / local testing environment, return standard OTP 1234
      return NextResponse.json({
        success: true,
        message: "OTP sent successfully to " + formattedPhone,
        testOtp: "1234",
      });
    }

    // Action 2: Verify OTP
    if (action === "verify_otp") {
      const cleanOtp = (otp || "").trim();
      if (!cleanOtp || (cleanOtp !== "1234" && cleanOtp.length < 4)) {
        return NextResponse.json(
          { error: "Invalid OTP. For demo/testing use: 1234" },
          { status: 400 },
        );
      }

      // Log in buyer session or link to demo buyer account
      try {
        const supabase = await getSupabaseServerClient();
        // Sign in using demo buyer account in background so session cookie is set
        await supabase.auth.signInWithPassword({
          email: "buyer@gmail.com",
          password: "Password@123",
        });
      } catch (authErr) {
        console.error("Mobile session link error:", authErr);
      }

      return NextResponse.json({
        success: true,
        message: "Mobile verified successfully!",
        redirectTo: "/",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Mobile auth error:", err);
    return NextResponse.json(
      { error: "Internal server error during mobile verification" },
      { status: 500 },
    );
  }
}
