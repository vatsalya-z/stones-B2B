import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { validateUploadBytes } from "@stone/utils";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { resolveStorageUrl } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase";
import { MAX_PRODUCT_IMAGE_BYTES } from "@/features/seller/seller-meta";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const isSeller = await hasRole("seller");
    if (!isSeller) {
      return NextResponse.json({ error: "Seller privileges required." }, { status: 403 });
    }

    const { productId } = await context.params;
    const supabase = await getSupabaseServerClient();

    // 1. Resolve seller profile for authenticated user
    const { data: seller } = await supabase
      .from("seller_profiles")
      .select("id, verification_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!seller) {
      return NextResponse.json(
        { error: "Seller profile not found. Complete seller onboarding first." },
        { status: 403 },
      );
    }

    // 2. Verify product ownership BEFORE touching storage (prevents cross-seller uploads)
    const { data: product } = await supabase
      .from("products")
      .select("id, seller_id, name, slug, moderation_status")
      .eq("id", productId)
      .eq("seller_id", seller.id)
      .maybeSingle();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found or you do not have permission to upload images for it." },
        { status: 403 },
      );
    }

    if (product.moderation_status === "approved" && seller.verification_status !== "verified") {
      return NextResponse.json(
        { error: "Your seller account must be verified to modify a published product." },
        { status: 403 },
      );
    }

    // 3. Parse multipart payload & sniff real file bytes (never trust client paths/MIME alone)
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const rawAlt = formData.get("altText");
    const altText =
      typeof rawAlt === "string" && rawAlt.trim().length > 0
        ? rawAlt.trim().slice(0, 200)
        : product.name;
    const makePrimary = formData.get("makePrimary") === "true";

    const bytes = new Uint8Array(await fileEntry.arrayBuffer());
    const validation = validateUploadBytes(bytes, {
      allowedMimes: ["image/jpeg", "image/png", "image/webp"],
      maxBytes: MAX_PRODUCT_IMAGE_BYTES,
      declaredMime: fileEntry.type || null,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 4. Server-generated canonical path: <seller_id>/<product_id>/<unique-filename>
    const storagePath = `${seller.id}/${product.id}/${Date.now()}-${randomUUID()}.${validation.ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(storagePath, bytes, {
        contentType: validation.mime,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Failed to store product image." },
        { status: 500 },
      );
    }

    // 5. Inspect existing images to determine display_order and primary flag
    const { data: existingImages } = await supabase
      .from("product_images")
      .select("id, is_primary, display_order")
      .eq("product_id", product.id)
      .order("display_order", { ascending: false });

    const maxOrder = existingImages?.[0]?.display_order ?? -1;
    const hasPrimary = (existingImages ?? []).some((img) => img.is_primary);
    const shouldBePrimary = !hasPrimary || makePrimary;

    if (shouldBePrimary && hasPrimary) {
      const { error: clearErr } = await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", product.id)
        .eq("is_primary", true);

      if (clearErr) {
        await supabase.storage.from("product-images").remove([storagePath]);
        return NextResponse.json({ error: clearErr.message }, { status: 500 });
      }
    }

    // 6. Insert product_images metadata row; roll back storage object on failure (zero orphans)
    const { data: inserted, error: dbError } = await supabase
      .from("product_images")
      .insert({
        product_id: product.id,
        storage_path: storagePath,
        alt_text: altText,
        is_primary: shouldBePrimary,
        display_order: maxOrder + 1,
      })
      .select("*")
      .single();

    if (dbError || !inserted) {
      await supabase.storage.from("product-images").remove([storagePath]);
      return NextResponse.json(
        { error: dbError?.message || "Failed to record product image metadata." },
        { status: 500 },
      );
    }

    revalidatePath(`/seller/products/${product.id}/edit`);
    revalidatePath("/seller/products");
    revalidatePath("/seller/dashboard");
    revalidatePath(`/products/${product.slug}`);

    return NextResponse.json({
      image: {
        ...inserted,
        url: resolveStorageUrl(inserted.storage_path, "product-images"),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected image upload error." },
      { status: 500 },
    );
  }
}

