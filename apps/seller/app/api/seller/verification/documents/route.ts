import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { validateUploadBytes } from "@stone/utils";
import {
  VERIFICATION_DOCUMENT_TYPES,
  type VerificationDocumentType,
} from "@stone/validation";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { MAX_VERIFICATION_DOC_BYTES } from "@/features/seller/seller-meta";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const isSeller = await hasRole("seller");
    if (!isSeller) {
      return NextResponse.json({ error: "Seller privileges required." }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: seller } = await supabase
      .from("seller_profiles")
      .select("id, verification_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!seller) {
      return NextResponse.json(
        { error: "Please complete your seller business profile before uploading documents." },
        { status: 400 },
      );
    }

    if (seller.verification_status === "suspended") {
      return NextResponse.json(
        { error: "Suspended seller accounts cannot upload documents." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const rawDocType = formData.get("documentType");
    if (
      typeof rawDocType !== "string" ||
      !(VERIFICATION_DOCUMENT_TYPES as readonly string[]).includes(rawDocType)
    ) {
      return NextResponse.json({ error: "Select a valid document category." }, { status: 400 });
    }
    const documentType = rawDocType as VerificationDocumentType;

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No document file provided." }, { status: 400 });
    }

    const bytes = new Uint8Array(await fileEntry.arrayBuffer());
    const validation = validateUploadBytes(bytes, {
      allowedMimes: ["application/pdf", "image/jpeg", "image/png"],
      maxBytes: MAX_VERIFICATION_DOC_BYTES,
      declaredMime: fileEntry.type || null,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Private bucket path: <seller_id>/<doc-type>-<timestamp>-<uuid>.<ext>
    const storagePath = `${seller.id}/${documentType}-${Date.now()}-${randomUUID()}.${validation.ext}`;

    const { error: uploadError } = await supabase.storage
      .from("seller-verification-documents")
      .upload(storagePath, bytes, {
        contentType: validation.mime,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Failed to store verification document." },
        { status: 500 },
      );
    }

    const { data: inserted, error: dbError } = await supabase
      .from("seller_verification_documents")
      .insert({
        seller_id: seller.id,
        document_type: documentType,
        storage_path: storagePath,
      })
      .select("*")
      .single();

    if (dbError || !inserted) {
      await supabase.storage.from("seller-verification-documents").remove([storagePath]);
      return NextResponse.json(
        { error: dbError?.message || "Failed to record verification document." },
        { status: 500 },
      );
    }

    revalidatePath("/seller/verification");
    revalidatePath("/seller/dashboard");

    return NextResponse.json({ document: inserted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected document upload error." },
      { status: 500 },
    );
  }
}

