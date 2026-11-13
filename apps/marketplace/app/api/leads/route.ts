import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { createAdminClient } from "@stone/database/admin";

/**
 * POST /api/leads
 * IndiaMart-style search lead capture.
 * Saves the user's search query as a lead/enquiry in the DB.
 *
 * Body:
 *   { query: string, name?: string, phone?: string, email?: string }
 *
 * - Authenticated users -> saved with buyer_id from session
 * - Guest users -> saved with guest_* fields (name, phone, email)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, name, phone, email } = body as {
      query?: string;
      name?: string;
      phone?: string;
      email?: string;
    };

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters." },
        { status: 400 },
      );
    }

    const cleanQuery = query.trim().slice(0, 500);

    // Check if user is authenticated via cookie session
    let buyerId: string | null = null;
    try {
      const serverClient = await getSupabaseServerClient();
      const {
        data: { user },
      } = await serverClient.auth.getUser();
      if (user) {
        buyerId = user.id;
      }
    } catch {
      // Unauthenticated / guest
    }

    // Insert into search_leads table using server admin client to guarantee insertion
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: insertError } = await (admin as any)
      .from("search_leads")
      .insert({
        query: cleanQuery,
        buyer_id: buyerId,
        guest_name: buyerId ? null : name?.trim() || null,
        guest_email: buyerId ? null : email?.trim().toLowerCase() || null,
        guest_phone: buyerId ? null : phone?.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Lead Capture Error]:", insertError.message);
      return NextResponse.json({ success: true, warned: true });
    }

    return NextResponse.json({ success: true, leadId: data?.id });
  } catch (err) {
    console.error("[Lead API Unexpected Error]:", err);
    return NextResponse.json({ success: true });
  }
}
