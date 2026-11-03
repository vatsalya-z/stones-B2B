import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { validateUploadBytes } from "@stone/utils";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { resolveStorageUrl } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  MAX_SELLER_COVER_BYTES,
  MAX_SELLER_LOGO_BYTES,
} from "@/features/seller/seller-meta";

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
      .select("id, slug, logo_url, cover_image_url, verification_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!seller) {
      return NextResponse.json(
        {
          error:
            "Save your business name and classification first before uploading brand imagery.",
        },
        { status: 400 },
      );
    }

    if (seller.verification_status === "suspended") {
      return NextResponse.json(
        { error: "Suspended seller accounts cannot upload media." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const kind = formData.get("kind");
    if (kind !== "logo" && kind !== "cover") {
      return NextResponse.json(
        { error: "Invalid media kind. Must be 'logo' or 'cover'." },
        { status: 400 },
      );
    }

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const maxBytes = kind === "logo" ? MAX_SELLER_LOGO_BYTES : MAX_SELLER_COVER_BYTES;
    const bucket = kind === "logo" ? "seller-logos" : "seller-cover-images";

    const bytes = new Uint8Array(await fileEntry.arrayBuffer());
    const validation = validateUploadBytes(bytes, {
      allowedMimes: ["image/jpeg", "image/png", "image/webp"],
      maxBytes,
      declaredMime: fileEntry.type || null,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const storagePath = `${seller.id}/${kind}-${Date.now()}-${randomUUID()}.${validation.ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, bytes, {
        contentType: validation.mime,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload brand image." },
        { status: 500 },
      );
    }

    const updatePayload =
      kind === "logo" ? { logo_url: storagePath } : { cover_image_url: storagePath };

    const { error: dbError } = await supabase
      .from("seller_profiles")
      .update(updatePayload)
      .eq("id", seller.id);

    if (dbError) {
      await supabase.storage.from(bucket).remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Clean up replaced internal storage object if owned by this seller
    const previousPath = kind === "logo" ? seller.logo_url : seller.cover_image_url;
    if (
      previousPath &&
      previousPath !== storagePath &&
      previousPath.startsWith(`${seller.id}/`)
    ) {
      await supabase.storage.from(bucket).remove([previousPath]);
    }

    revalidatePath("/seller", "layout");
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${seller.slug}`);

    return NextResponse.json({
      storagePath,
      url: resolveStorageUrl(storagePath, bucket),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected upload error." },
      { status: 500 },
    );
  }
}

