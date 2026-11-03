import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await context.params;
    if (!UUID_REGEX.test(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation identifier." },
        { status: 400 },
      );
    }

    const rawPath = request.nextUrl.searchParams.get("path")?.trim() ?? "";
    if (
      !rawPath ||
      !rawPath.startsWith(`${conversationId}/`) ||
      rawPath.includes("..") ||
      rawPath.includes("\\")
    ) {
      return NextResponse.json(
        { error: "Invalid attachment path for this conversation." },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const supabase = await getSupabaseServerClient();

    const [{ data: conversation }, { data: sellerProfile }] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, buyer_id, seller_id")
        .eq("id", conversationId)
        .maybeSingle(),
      supabase
        .from("seller_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const isBuyerParticipant = conversation?.buyer_id === user.id;
    const isSellerParticipant =
      Boolean(sellerProfile?.id) && conversation?.seller_id === sellerProfile?.id;

    if (!conversation || (!isBuyerParticipant && !isSellerParticipant)) {
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 },
      );
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(rawPath, 600);

    if (signError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: "Attachment not found or no longer accessible." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        signedUrl: signed.signedUrl,
        expiresInSeconds: 600,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (err) {
    console.error("[messages/signed-url] error:", err);
    return NextResponse.json(
      { error: "Unable to generate signed attachment URL." },
      { status: 500 },
    );
  }
}

