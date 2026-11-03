import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { validateUploadBytes } from "@stone/utils";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  ALLOWED_ENQUIRY_ATTACHMENT_MIMES,
  MAX_ENQUIRY_ATTACHMENT_BYTES,
} from "@/features/buyer/buyer-meta";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ATTACHMENTS_PER_ENQUIRY = 8;

function sanitizeBaseFilename(originalName: string): string {
  const withoutExt = originalName.replace(/\.[a-zA-Z0-9]{1,8}$/, "");
  const cleaned = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return cleaned || "attachment";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ enquiryId: string }> },
) {
  try {
    const { enquiryId } = await context.params;
    if (!UUID_REGEX.test(enquiryId)) {
      return NextResponse.json(
        { error: "Invalid enquiry identifier." },
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

    const isBuyer = await hasRole("buyer");
    if (!isBuyer) {
      return NextResponse.json(
        { error: "Buyer permissions are required to upload enquiry attachments." },
        { status: 403 },
      );
    }

    const supabase = await getSupabaseServerClient();

    // Server-side ownership verification BEFORE reading or storing file bytes (IDOR guard)
    const { data: enquiry } = await supabase
      .from("enquiries")
      .select("id, buyer_id, status")
      .eq("id", enquiryId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (!enquiry) {
      return NextResponse.json(
        { error: "Enquiry not found or access denied." },
        { status: 404 },
      );
    }

    if (enquiry.status === "closed" || enquiry.status === "cancelled") {
      return NextResponse.json(
        { error: "Attachments cannot be added to closed or cancelled enquiries." },
        { status: 400 },
      );
    }

    const { data: existingFiles } = await supabase.storage
      .from("enquiry-attachments")
      .list(enquiry.id, { limit: MAX_ATTACHMENTS_PER_ENQUIRY + 2 });

    const existingCount = (existingFiles ?? []).filter(
      (f) => f.name && f.name !== ".emptyFolderPlaceholder",
    ).length;

    if (existingCount >= MAX_ATTACHMENTS_PER_ENQUIRY) {
      return NextResponse.json(
        {
          error: `Maximum of ${MAX_ATTACHMENTS_PER_ENQUIRY} attachments reached for this enquiry.`,
        },
        { status: 400 },
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

    if (fileEntry.size > MAX_ENQUIRY_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: "Attachment exceeds the 10 MB file size limit." },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await fileEntry.arrayBuffer());
    const validation = validateUploadBytes(bytes, {
      allowedMimes: ALLOWED_ENQUIRY_ATTACHMENT_MIMES,
      maxBytes: MAX_ENQUIRY_ATTACHMENT_BYTES,
      declaredMime: fileEntry.type || null,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const safeBase = sanitizeBaseFilename(fileEntry.name || "spec");
    // Mandatory path rule (`20261030100500_storage.sql`): `<enquiry_id>/<unique-file>`
    const storagePath = `${enquiry.id}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeBase}.${validation.ext}`;

    const { error: uploadError } = await supabase.storage
      .from("enquiry-attachments")
      .upload(storagePath, bytes, {
        contentType: validation.mime,
        upsert: false,
      });

    if (uploadError) {
      console.error("[buyer/attachments] upload error:", uploadError.message);
      return NextResponse.json(
        { error: "Failed to store attachment securely. Please try again." },
        { status: 500 },
      );
    }

    const { data: signed } = await supabase.storage
      .from("enquiry-attachments")
      .createSignedUrl(storagePath, 900);

    revalidatePath(`/buyer/enquiries/${enquiry.id}`);
    revalidatePath(`/buyer/rfqs/${enquiry.id}`);

    return NextResponse.json({
      name: `${safeBase}.${validation.ext}`,
      storagePath,
      mimeType: validation.mime,
      sizeBytes: bytes.byteLength,
      signedUrl: signed?.signedUrl ?? null,
    });
  } catch (err) {
    console.error("[buyer/attachments] unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected upload error occurred." },
      { status: 500 },
    );
  }
}

