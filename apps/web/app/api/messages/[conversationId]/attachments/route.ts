import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { CHAT_ATTACHMENT_MIMES, MAX_CHAT_ATTACHMENT_BYTES } from "@stone/types";
import { validateUploadBytes } from "@stone/utils";
import { sanitizeAttachmentFilename } from "@stone/validation";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeSlugStem(originalName: string): string {
  const withoutExt = originalName.replace(/\.[a-zA-Z0-9]{1,8}$/, "");
  const cleaned = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return cleaned || "attachment";
}

export async function POST(
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

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify conversation participation server-side BEFORE reading file bytes
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
        { error: "Conversation not found or access denied." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "No attachment file provided." },
        { status: 400 },
      );
    }

    if (fileEntry.size <= 0) {
      return NextResponse.json(
        { error: "Attachment file cannot be empty." },
        { status: 400 },
      );
    }

    if (fileEntry.size > MAX_CHAT_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: "Attachment exceeds the 10 MB file size limit." },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await fileEntry.arrayBuffer());
    const validation = validateUploadBytes(bytes, {
      allowedMimes: CHAT_ATTACHMENT_MIMES,
      maxBytes: MAX_CHAT_ATTACHMENT_BYTES,
      declaredMime: fileEntry.type || null,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const displayFilename = sanitizeAttachmentFilename(
      fileEntry.name || `attachment.${validation.ext}`,
    );
    const stem = sanitizeSlugStem(displayFilename);
    // Strict private storage path convention: <conversation_id>/<unique-file>
    const storagePath = `${conversation.id}/${Date.now()}-${randomUUID().slice(0, 8)}-${stem}.${validation.ext}`;

    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(storagePath, bytes, {
        contentType: validation.mime,
        upsert: false,
      });

    if (uploadError) {
      console.error("[messages/attachments] storage upload error:", uploadError.message);
      return NextResponse.json(
        { error: "Failed to store attachment securely. Please try again." },
        { status: 500 },
      );
    }

    const { data: signed } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(storagePath, 900);

    return NextResponse.json(
      {
        attachmentPath: storagePath,
        attachmentName: displayFilename,
        attachmentMime: validation.mime,
        attachmentSize: bytes.byteLength,
        signedUrl: signed?.signedUrl ?? null,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (err) {
    console.error("[messages/attachments] unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected attachment upload error occurred." },
      { status: 500 },
    );
  }
}

