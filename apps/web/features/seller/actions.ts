"use server";

import { revalidatePath } from "next/cache";
import { slugify } from "@stone/utils";
import {
  orderStatusTransitionSchema,
  productFormSchema,
  quotationFormSchema,
  sellerEnquiryTransitionSchema,
  sellerProfileSchema,
  storeSettingsSchema,
  type OrderStatusTransitionInput,
  type ProductFormInput,
  type QuotationFormInput,
  type SellerProfileInput,
  type StoreSettingsInput,
} from "@stone/validation";
import { requireSeller } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  buildProductSpecificationRows,
  computeQuotationTotals,
  decodeSellerDescription,
  encodeSellerDescription,
} from "./seller-meta";

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
}

async function getAuthenticatedSellerRow() {
  const user = await requireSeller();
  const supabase = await getSupabaseServerClient();
  const { data: seller, error } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load seller profile.");
  }

  return { user, supabase, seller };
}

async function generateUniqueSellerSlug(
  baseInput: string,
  excludeSellerId?: string,
): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const base = slugify(baseInput) || "stone-supplier";
  let candidate = base;

  for (let attempt = 0; attempt < 15; attempt++) {
    let query = supabase.from("seller_profiles").select("id").eq("slug", candidate);
    if (excludeSellerId) {
      query = query.neq("id", excludeSellerId);
    }
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    const suffix = Math.random().toString(36).slice(2, 6);
    candidate = `${base.slice(0, 72)}-${suffix}`;
  }

  return `${base.slice(0, 68)}-${Date.now().toString(36)}`;
}

async function generateUniqueProductSlug(
  baseInput: string,
  excludeProductId?: string,
): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const base = slugify(baseInput) || "natural-stone";
  let candidate = base;

  for (let attempt = 0; attempt < 15; attempt++) {
    let query = supabase.from("products").select("id").eq("slug", candidate);
    if (excludeProductId) {
      query = query.neq("id", excludeProductId);
    }
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    const suffix = Math.random().toString(36).slice(2, 6);
    candidate = `${base.slice(0, 72)}-${suffix}`;
  }

  return `${base.slice(0, 68)}-${Date.now().toString(36)}`;
}

function formatZodErrors(
  issues: ReadonlyArray<{ path: (string | number)[]; message: string }>,
): { message: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return {
    message: issues[0]?.message ?? "Please check the highlighted form fields.",
    fieldErrors,
  };
}

// ---------------------------------------------------------------------------
// 1. Seller Onboarding & Business Profile (/seller/profile)
// ---------------------------------------------------------------------------

export async function saveSellerProfileAction(
  rawInput: SellerProfileInput,
): Promise<ActionResult<{ sellerId: string; slug: string; verificationReset?: boolean }>> {
  const parsed = sellerProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    const { message, fieldErrors } = formatZodErrors(parsed.error.issues);
    return { success: false, error: message, fieldErrors };
  }

  const { user, supabase, seller } = await getAuthenticatedSellerRow();
  const values = parsed.data;

  if (seller?.verification_status === "suspended") {
    return {
      success: false,
      error: "Suspended seller accounts cannot edit their profile. Contact support.",
    };
  }

  const existingMeta = decodeSellerDescription(seller?.description);
  const encodedDescription = encodeSellerDescription({
    cleanDescription: values.description,
    hasManufacturing: values.hasManufacturing,
    hasQuarry: values.hasQuarry,
    hasExport: values.hasExport,
    productCategories: values.productCategories,
    showWebsitePublicly: values.showWebsitePublicly ?? existingMeta.showWebsitePublicly,
    acceptBulkExportEnquiries:
      values.acceptBulkExportEnquiries ?? existingMeta.acceptBulkExportEnquiries,
  });

  const desiredSlug = values.slug || seller?.slug || values.businessName;
  const finalSlug =
    seller && seller.slug === desiredSlug
      ? seller.slug
      : await generateUniqueSellerSlug(desiredSlug, seller?.id);

  // Sync owner name / location convenience fields to base profile if provided
  if (values.ownerName || values.city || values.state) {
    await supabase
      .from("profiles")
      .update({
        ...(values.ownerName ? { full_name: values.ownerName } : {}),
        ...(values.city ? { city: values.city } : {}),
        ...(values.state ? { state: values.state } : {}),
        country: values.country,
      })
      .eq("id", user.id);
  }

  const payload = {
    business_name: values.businessName,
    slug: finalSlug,
    business_type: values.businessType,
    owner_name: values.ownerName,
    business_email: values.businessEmail,
    phone: values.phone,
    whatsapp_number: values.whatsappNumber,
    gst_number: values.gstNumber,
    business_address: values.businessAddress,
    city: values.city,
    state: values.state,
    country: values.country,
    pincode: values.pincode,
    website: values.website,
    years_in_business: values.yearsInBusiness,
    description: encodedDescription,
  };

  if (!seller) {
    const { data: created, error } = await supabase
      .from("seller_profiles")
      .insert({
        user_id: user.id,
        ...payload,
      })
      .select("id, slug")
      .single();

    if (error || !created) {
      if (error?.code === "23505") {
        if (error.message.includes("gst_key")) {
          return {
            success: false,
            error: "This GSTIN is already registered to another seller account.",
            fieldErrors: { gstNumber: "GSTIN is already registered." },
          };
        }
        return {
          success: false,
          error: "Storefront URL slug is already taken. Please try another slug.",
          fieldErrors: { slug: "Slug already in use." },
        };
      }
      return { success: false, error: error?.message ?? "Failed to create seller profile." };
    }

    revalidatePath("/seller", "layout");
    revalidatePath("/suppliers");
    return {
      success: true,
      data: { sellerId: created.id, slug: created.slug },
    };
  }

  const wasVerified = seller.verification_status === "verified";
  const identityChanged =
    wasVerified &&
    (seller.business_name !== values.businessName ||
      (seller.gst_number ?? null) !== (values.gstNumber ?? null));

  const { data: updated, error } = await supabase
    .from("seller_profiles")
    .update(payload)
    .eq("id", seller.id)
    .select("id, slug")
    .single();

  if (error || !updated) {
    if (error?.code === "23505") {
      if (error.message.includes("gst_key")) {
        return {
          success: false,
          error: "This GSTIN is already registered to another seller account.",
          fieldErrors: { gstNumber: "GSTIN is already registered." },
        };
      }
      return {
        success: false,
        error: "Storefront URL slug is already taken. Please try another slug.",
        fieldErrors: { slug: "Slug already in use." },
      };
    }
    return { success: false, error: error?.message ?? "Failed to update seller profile." };
  }

  revalidatePath("/seller", "layout");
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${seller.slug}`);
  revalidatePath(`/suppliers/${updated.slug}`);

  return {
    success: true,
    data: {
      sellerId: updated.id,
      slug: updated.slug,
      verificationReset: identityChanged,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Storefront Settings (/seller/store)
// ---------------------------------------------------------------------------

export async function saveStoreSettingsAction(
  rawInput: StoreSettingsInput,
): Promise<ActionResult<{ slug: string }>> {
  const parsed = storeSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    const { message, fieldErrors } = formatZodErrors(parsed.error.issues);
    return { success: false, error: message, fieldErrors };
  }

  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return {
      success: false,
      error: "Complete your basic seller onboarding profile first.",
    };
  }
  if (seller.verification_status === "suspended") {
    return {
      success: false,
      error: "Suspended seller accounts cannot update store settings.",
    };
  }

  const values = parsed.data;
  const finalSlug =
    seller.slug === values.slug
      ? seller.slug
      : await generateUniqueSellerSlug(values.slug, seller.id);

  const encodedDescription = encodeSellerDescription({
    cleanDescription: values.description,
    hasManufacturing: values.hasManufacturing,
    hasQuarry: values.hasQuarry,
    hasExport: values.hasExport,
    productCategories: values.productCategories,
    showWebsitePublicly: values.showWebsitePublicly,
    acceptBulkExportEnquiries: values.acceptBulkExportEnquiries,
  });

  const { data: updated, error } = await supabase
    .from("seller_profiles")
    .update({
      business_name: values.businessName,
      slug: finalSlug,
      business_type: values.businessType,
      city: values.city,
      state: values.state,
      country: values.country,
      website: values.showWebsitePublicly ? values.website : null,
      years_in_business: values.yearsInBusiness,
      description: encodedDescription,
    })
    .eq("id", seller.id)
    .select("slug")
    .single();

  if (error || !updated) {
    if (error?.code === "23505") {
      return {
        success: false,
        error: "That storefront slug is already in use by another supplier.",
        fieldErrors: { slug: "Slug already in use." },
      };
    }
    return { success: false, error: error?.message ?? "Failed to update storefront settings." };
  }

  revalidatePath("/seller", "layout");
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${seller.slug}`);
  revalidatePath(`/suppliers/${updated.slug}`);

  return { success: true, data: { slug: updated.slug } };
}

// ---------------------------------------------------------------------------
// 3. Seller Verification (/seller/verification)
// ---------------------------------------------------------------------------

export async function getVerificationDocumentSignedUrlAction(
  documentId: string,
): Promise<ActionResult<{ signedUrl: string; isPdf: boolean }>> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: doc, error } = await supabase
    .from("seller_verification_documents")
    .select("id, seller_id, storage_path")
    .eq("id", documentId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (error || !doc) {
    return { success: false, error: "Document not found or access denied." };
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("seller-verification-documents")
    .createSignedUrl(doc.storage_path, 300);

  if (signErr || !signed?.signedUrl) {
    return { success: false, error: "Unable to generate secure preview URL." };
  }

  const isPdf = doc.storage_path.toLowerCase().endsWith(".pdf");
  return {
    success: true,
    data: { signedUrl: signed.signedUrl, isPdf },
  };
}

export async function deleteVerificationDocumentAction(
  documentId: string,
): Promise<ActionResult> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: doc, error } = await supabase
    .from("seller_verification_documents")
    .select("id, seller_id, storage_path, verification_status")
    .eq("id", documentId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (error || !doc) {
    return { success: false, error: "Document not found or access denied." };
  }

  if (doc.verification_status !== "pending") {
    return {
      success: false,
      error: "Reviewed verification documents are retained for compliance audit.",
    };
  }

  const { error: deleteErr } = await supabase
    .from("seller_verification_documents")
    .delete()
    .eq("id", doc.id)
    .eq("seller_id", seller.id);

  if (deleteErr) {
    return { success: false, error: deleteErr.message };
  }

  await supabase.storage.from("seller-verification-documents").remove([doc.storage_path]);
  revalidatePath("/seller/verification");
  revalidatePath("/seller/dashboard");
  return { success: true };
}

export async function submitSellerVerificationAction(): Promise<ActionResult> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return {
      success: false,
      error: "Please complete your seller business profile before submitting verification.",
    };
  }

  const { error } = await supabase.rpc("submit_seller_verification");
  if (error) {
    return {
      success: false,
      error: error.message || "Unable to submit verification application.",
    };
  }

  revalidatePath("/seller", "layout");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. Product Creation, Editing & Moderation Workflow (/seller/products/*)
// ---------------------------------------------------------------------------

export async function createSellerProductAction(
  rawInput: ProductFormInput,
): Promise<ActionResult<{ productId: string; slug: string; moderationStatus: string }>> {
  const parsed = productFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    const { message, fieldErrors } = formatZodErrors(parsed.error.issues);
    return { success: false, error: message, fieldErrors };
  }

  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return {
      success: false,
      error: "Please create your seller business profile before adding products.",
    };
  }

  const values = parsed.data;
  if (values.intent === "pending_review" && seller.verification_status !== "verified") {
    return {
      success: false,
      error:
        "Your seller account must be Verified before submitting products for marketplace review. You can save products as Draft now.",
    };
  }

  const effectiveCategoryId = values.subcategoryId || values.categoryId || null;
  const finalSlug = await generateUniqueProductSlug(values.slug || values.name);
  const effectivePrice = values.priceType === "on_request" ? null : values.price;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      seller_id: seller.id,
      category_id: effectiveCategoryId,
      name: values.name,
      slug: finalSlug,
      sku: values.sku,
      description: values.description,
      material_type: values.materialType,
      stone_origin: values.stoneOrigin,
      colour: values.colour,
      finish: values.finish,
      thickness: values.thickness,
      length: values.length,
      width: values.width,
      minimum_order_quantity: values.minimumOrderQuantity,
      unit: values.unit,
      price_type: values.priceType,
      price: effectivePrice,
      currency: values.currency,
      stock_status: values.stockStatus,
      lead_time: values.leadTime,
      moderation_status: values.intent,
    })
    .select("id, slug, moderation_status")
    .single();

  if (error || !product) {
    return {
      success: false,
      error: error?.message ?? "Failed to create product.",
    };
  }

  const specRows = buildProductSpecificationRows({
    productId: product.id,
    availableSizes: values.availableSizes,
    surfaceTreatment: values.surfaceTreatment,
    availableQuantity: values.availableQuantity,
    packagingInfo: values.packagingInfo,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    customSpecifications: values.customSpecifications,
  });

  if (specRows.length > 0) {
    const { error: specErr } = await supabase
      .from("product_specifications")
      .insert(specRows);
    if (specErr) {
      return {
        success: false,
        error: `Product saved, but specifications failed: ${specErr.message}`,
        data: {
          productId: product.id,
          slug: product.slug,
          moderationStatus: product.moderation_status,
        },
      };
    }
  }

  revalidatePath("/seller/products");
  revalidatePath("/seller/dashboard");
  revalidatePath("/seller/store");
  return {
    success: true,
    data: {
      productId: product.id,
      slug: product.slug,
      moderationStatus: product.moderation_status,
    },
  };
}

export async function updateSellerProductAction(
  productId: string,
  rawInput: ProductFormInput,
): Promise<ActionResult<{ productId: string; slug: string; moderationStatus: string }>> {
  const parsed = productFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    const { message, fieldErrors } = formatZodErrors(parsed.error.issues);
    return { success: false, error: message, fieldErrors };
  }

  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("products")
    .select("id, seller_id, slug, moderation_status")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { success: false, error: "Product not found or access denied." };
  }

  const values = parsed.data;
  if (values.intent === "pending_review" && seller.verification_status !== "verified") {
    return {
      success: false,
      error:
        "Your seller account must be Verified before submitting products for review. Save as Draft instead.",
    };
  }

  const effectiveCategoryId = values.subcategoryId || values.categoryId || null;
  const desiredSlug = values.slug || existing.slug || values.name;
  const finalSlug =
    desiredSlug === existing.slug
      ? existing.slug
      : await generateUniqueProductSlug(desiredSlug, existing.id);
  const effectivePrice = values.priceType === "on_request" ? null : values.price;

  const { data: updated, error: updateErr } = await supabase
    .from("products")
    .update({
      category_id: effectiveCategoryId,
      name: values.name,
      slug: finalSlug,
      sku: values.sku,
      description: values.description,
      material_type: values.materialType,
      stone_origin: values.stoneOrigin,
      colour: values.colour,
      finish: values.finish,
      thickness: values.thickness,
      length: values.length,
      width: values.width,
      minimum_order_quantity: values.minimumOrderQuantity,
      unit: values.unit,
      price_type: values.priceType,
      price: effectivePrice,
      currency: values.currency,
      stock_status: values.stockStatus,
      lead_time: values.leadTime,
      moderation_status: values.intent,
    })
    .eq("id", existing.id)
    .eq("seller_id", seller.id)
    .select("id, slug, moderation_status")
    .single();

  if (updateErr || !updated) {
    return {
      success: false,
      error: updateErr?.message ?? "Failed to update product.",
    };
  }

  // Replace specifications cleanly
  await supabase.from("product_specifications").delete().eq("product_id", existing.id);

  const specRows = buildProductSpecificationRows({
    productId: existing.id,
    availableSizes: values.availableSizes,
    surfaceTreatment: values.surfaceTreatment,
    availableQuantity: values.availableQuantity,
    packagingInfo: values.packagingInfo,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    customSpecifications: values.customSpecifications,
  });

  if (specRows.length > 0) {
    const { error: specErr } = await supabase
      .from("product_specifications")
      .insert(specRows);
    if (specErr) {
      return {
        success: false,
        error: `Product updated, but specifications failed: ${specErr.message}`,
      };
    }
  }

  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${existing.id}/edit`);
  revalidatePath("/seller/dashboard");
  revalidatePath("/seller/store");
  revalidatePath("/products");
  revalidatePath(`/products/${existing.slug}`);
  revalidatePath(`/products/${updated.slug}`);

  return {
    success: true,
    data: {
      productId: updated.id,
      slug: updated.slug,
      moderationStatus: updated.moderation_status,
    },
  };
}

export async function changeProductStatusAction(
  productId: string,
  newStatus: "draft" | "pending_review" | "archived",
): Promise<ActionResult> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  if (newStatus === "pending_review" && seller.verification_status !== "verified") {
    return {
      success: false,
      error: "Only verified sellers can submit products for marketplace review.",
    };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("id, slug, seller_id")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Product not found or access denied." };
  }

  const { error } = await supabase
    .from("products")
    .update({ moderation_status: newStatus })
    .eq("id", existing.id)
    .eq("seller_id", seller.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${existing.id}/edit`);
  revalidatePath("/seller/dashboard");
  revalidatePath("/seller/store");
  revalidatePath("/products");
  revalidatePath(`/products/${existing.slug}`);
  return { success: true };
}

export async function deleteSellerProductAction(productId: string): Promise<ActionResult> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("id, seller_id, moderation_status, product_images(storage_path)")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Product not found or access denied." };
  }

  if (existing.moderation_status !== "draft") {
    return {
      success: false,
      error:
        "Only Draft products can be permanently deleted. Use Archive for submitted or published products.",
    };
  }

  const imageRows =
    (existing as unknown as { product_images?: Array<{ storage_path: string }> }).product_images ??
    [];
  const storagePaths = imageRows.map((i) => i.storage_path).filter(Boolean);

  const { error: deleteErr } = await supabase
    .from("products")
    .delete()
    .eq("id", existing.id)
    .eq("seller_id", seller.id);

  if (deleteErr) {
    if (deleteErr.code === "23503") {
      return {
        success: false,
        error:
          "This product is referenced by commercial enquiries/quotations and cannot be deleted. Archive it instead.",
      };
    }
    return { success: false, error: deleteErr.message };
  }

  if (storagePaths.length > 0) {
    await supabase.storage.from("product-images").remove(storagePaths);
  }

  revalidatePath("/seller/products");
  revalidatePath("/seller/dashboard");
  return { success: true };
}

export async function duplicateSellerProductAction(
  productId: string,
): Promise<ActionResult<{ newProductId: string }>> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: source, error: fetchErr } = await supabase
    .from("products")
    .select("*, product_specifications(*)")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (fetchErr || !source) {
    return { success: false, error: "Source product not found or access denied." };
  }

  const copyName = `${source.name} (Copy)`.slice(0, 200);
  const copySlug = await generateUniqueProductSlug(copyName);

  const { data: cloned, error: insertErr } = await supabase
    .from("products")
    .insert({
      seller_id: seller.id,
      category_id: source.category_id,
      name: copyName,
      slug: copySlug,
      sku: source.sku ? `${source.sku}-COPY`.slice(0, 80) : null,
      description: source.description,
      material_type: source.material_type,
      stone_origin: source.stone_origin,
      colour: source.colour,
      finish: source.finish,
      thickness: source.thickness,
      length: source.length,
      width: source.width,
      minimum_order_quantity: source.minimum_order_quantity,
      unit: source.unit,
      price_type: source.price_type,
      price: source.price,
      currency: source.currency,
      stock_status: source.stock_status,
      lead_time: source.lead_time,
      moderation_status: "draft",
    })
    .select("id")
    .single();

  if (insertErr || !cloned) {
    return { success: false, error: insertErr?.message ?? "Failed to duplicate product." };
  }

  const specs =
    (
      source as unknown as {
        product_specifications?: Array<{
          specification_name: string;
          specification_value: string;
          display_order: number;
        }>;
      }
    ).product_specifications ?? [];

  if (specs.length > 0) {
    await supabase.from("product_specifications").insert(
      specs.map((s) => ({
        product_id: cloned.id,
        specification_name: s.specification_name,
        specification_value: s.specification_value,
        display_order: s.display_order,
      })),
    );
  }

  revalidatePath("/seller/products");
  revalidatePath("/seller/dashboard");
  return { success: true, data: { newProductId: cloned.id } };
}

// ---------------------------------------------------------------------------
// 5. Product Image Management Actions (Primary, Reorder, Delete)
// ---------------------------------------------------------------------------

export async function setPrimaryProductImageAction(
  productId: string,
  imageId: string,
): Promise<ActionResult> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, slug, moderation_status")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (!product) {
    return { success: false, error: "Product not found or access denied." };
  }

  if (product.moderation_status === "approved" && seller.verification_status !== "verified") {
    return {
      success: false,
      error: "Seller must be verified to modify images of a published product.",
    };
  }

  const { data: targetImage } = await supabase
    .from("product_images")
    .select("id")
    .eq("id", imageId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (!targetImage) {
    return { success: false, error: "Image does not belong to this product." };
  }

  // Clear existing primary first to satisfy `product_images_one_primary_idx`
  const { error: clearErr } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", product.id)
    .eq("is_primary", true);

  if (clearErr) {
    return { success: false, error: clearErr.message };
  }

  const { error: setErr } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", targetImage.id)
    .eq("product_id", product.id);

  if (setErr) {
    return { success: false, error: setErr.message };
  }

  revalidatePath(`/seller/products/${product.id}/edit`);
  revalidatePath("/seller/products");
  revalidatePath(`/products/${product.slug}`);
  return { success: true };
}

export async function reorderProductImagesAction(
  productId: string,
  orderedImageIds: string[],
): Promise<ActionResult> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, slug, moderation_status")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (!product) {
    return { success: false, error: "Product not found or access denied." };
  }

  if (product.moderation_status === "approved" && seller.verification_status !== "verified") {
    return {
      success: false,
      error: "Seller must be verified to reorder images of a published product.",
    };
  }

  for (let i = 0; i < orderedImageIds.length; i++) {
    const id = orderedImageIds[i];
    if (!id) continue;
    const { error } = await supabase
      .from("product_images")
      .update({ display_order: i })
      .eq("id", id)
      .eq("product_id", product.id);
    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath(`/seller/products/${product.id}/edit`);
  revalidatePath(`/products/${product.slug}`);
  return { success: true };
}

export async function deleteProductImageAction(
  productId: string,
  imageId: string,
): Promise<ActionResult> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, slug, moderation_status")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (!product) {
    return { success: false, error: "Product not found or access denied." };
  }

  const { data: img } = await supabase
    .from("product_images")
    .select("id, storage_path, is_primary")
    .eq("id", imageId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (!img) {
    return { success: false, error: "Image not found or access denied." };
  }

  const { error: delErr } = await supabase
    .from("product_images")
    .delete()
    .eq("id", img.id)
    .eq("product_id", product.id);

  if (delErr) {
    return { success: false, error: delErr.message };
  }

  await supabase.storage.from("product-images").remove([img.storage_path]);

  // Promote next image to primary if the deleted image was primary
  if (img.is_primary) {
    const { data: remaining } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", product.id)
      .order("display_order", { ascending: true })
      .limit(1);

    const nextPrimary = remaining?.[0];
    if (nextPrimary) {
      await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", nextPrimary.id)
        .eq("product_id", product.id);
    }
  }

  revalidatePath(`/seller/products/${product.id}/edit`);
  revalidatePath("/seller/products");
  revalidatePath(`/products/${product.slug}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. Seller Enquiry Status Transitions (/seller/enquiries/[id])
// ---------------------------------------------------------------------------

export async function updateEnquiryStatusAction(rawInput: {
  enquiryId: string;
  newStatus: "viewed" | "responding" | "rejected" | "closed";
  notes?: string | null;
}): Promise<ActionResult> {
  const parsed = sellerEnquiryTransitionSchema.safeParse(rawInput);
  if (!parsed.success) {
    const { message } = formatZodErrors(parsed.error.issues);
    return { success: false, error: message };
  }

  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  // Server-side ownership verification before RPC call
  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("id, seller_id")
    .eq("id", parsed.data.enquiryId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (!enquiry) {
    return { success: false, error: "Enquiry not found or access denied." };
  }

  const { error } = await supabase.rpc("transition_enquiry_status", {
    _enquiry_id: parsed.data.enquiryId,
    _new_status: parsed.data.newStatus,
    _notes: parsed.data.notes ?? undefined,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/seller/enquiries");
  revalidatePath(`/seller/enquiries/${parsed.data.enquiryId}`);
  revalidatePath("/seller/dashboard");
  revalidatePath("/seller", "layout");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 7. Quotation Management (/seller/quotes/*)
// ---------------------------------------------------------------------------

export async function saveQuotationAction(
  rawInput: QuotationFormInput,
): Promise<ActionResult<{ quotationId: string; quoteNumber: string; status: string }>> {
  const parsed = quotationFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    const { message, fieldErrors } = formatZodErrors(parsed.error.issues);
    return { success: false, error: message, fieldErrors };
  }

  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const values = parsed.data;

  // Verify enquiry belongs to this seller and is in a quotable state
  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("id, seller_id, buyer_id, status")
    .eq("id", values.enquiryId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (!enquiry) {
    return { success: false, error: "Authorized enquiry not found." };
  }

  if (!["submitted", "viewed", "responding", "quoted"].includes(enquiry.status)) {
    return {
      success: false,
      error: `Cannot issue a quotation for an enquiry in "${enquiry.status}" status.`,
    };
  }

  if (!enquiry.buyer_id) {
    return {
      success: false,
      error: "Quotations can only be generated for registered buyers. Please contact the guest directly via their provided contact details.",
    };
  }

  // Deterministic server-side calculation aligned with Postgres check constraints
  let totals;
  try {
    totals = computeQuotationTotals({
      items: values.items,
      discountAmount: values.discountAmount,
      taxAmount: values.taxAmount,
      shippingCharges: values.shippingCharges,
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Invalid quotation amounts.",
    };
  }

  // Verify any linked productIds belong to this seller
  const productIds = totals.items
    .map((i) => i.productId)
    .filter((id): id is string => Boolean(id));
  if (productIds.length > 0) {
    const { data: ownedProducts } = await supabase
      .from("products")
      .select("id")
      .eq("seller_id", seller.id)
      .in("id", productIds);
    const ownedSet = new Set((ownedProducts ?? []).map((p) => p.id));
    for (const pid of productIds) {
      if (!ownedSet.has(pid)) {
        return {
          success: false,
          error: "One or more selected products do not belong to your catalogue.",
        };
      }
    }
  }

  let quotationId = values.quotationId;
  let quoteNumber = "";

  if (quotationId) {
    const { data: existingQuote } = await supabase
      .from("quotations")
      .select("id, quote_number, status")
      .eq("id", quotationId)
      .eq("seller_id", seller.id)
      .maybeSingle();

    if (!existingQuote) {
      return { success: false, error: "Quotation not found or access denied." };
    }
    if (existingQuote.status !== "draft") {
      return {
        success: false,
        error: "Only draft quotations can be edited. Create a revised quotation instead.",
      };
    }

    const { data: updatedQuote, error: updErr } = await supabase
      .from("quotations")
      .update({
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        shipping_charges: totals.shippingCharges,
        discount_amount: totals.discountAmount,
        total_amount: totals.totalAmount,
        currency: values.currency,
        valid_until: values.validUntil,
        terms: values.terms,
        status: "draft",
      })
      .eq("id", existingQuote.id)
      .select("id, quote_number")
      .single();

    if (updErr || !updatedQuote) {
      return { success: false, error: updErr?.message ?? "Failed to update draft quotation." };
    }

    quotationId = updatedQuote.id;
    quoteNumber = updatedQuote.quote_number;

    const { error: delItemsErr } = await supabase
      .from("quotation_items")
      .delete()
      .eq("quotation_id", quotationId);
    if (delItemsErr) {
      return { success: false, error: delItemsErr.message };
    }
  } else {
    // Note: omit `status` and `quote_number` per column-level INSERT grants
    const { data: createdQuote, error: insErr } = await supabase
      .from("quotations")
      .insert({
        enquiry_id: enquiry.id,
        seller_id: seller.id,
        buyer_id: enquiry.buyer_id,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        shipping_charges: totals.shippingCharges,
        discount_amount: totals.discountAmount,
        total_amount: totals.totalAmount,
        currency: values.currency,
        valid_until: values.validUntil,
        terms: values.terms,
      })
      .select("id, quote_number")
      .single();

    if (insErr || !createdQuote) {
      return { success: false, error: insErr?.message ?? "Failed to create quotation." };
    }

    quotationId = createdQuote.id;
    quoteNumber = createdQuote.quote_number;
  }

  const itemPayloads = totals.items.map((item) => ({
    quotation_id: quotationId!,
    product_id: item.productId,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  }));

  const { error: itemsErr } = await supabase.from("quotation_items").insert(itemPayloads);
  if (itemsErr) {
    return { success: false, error: `Failed to save quotation line items: ${itemsErr.message}` };
  }

  let finalStatus = "draft";
  if (values.sendImmediately) {
    const { error: sendErr } = await supabase
      .from("quotations")
      .update({ status: "sent" })
      .eq("id", quotationId);

    if (sendErr) {
      return {
        success: false,
        error: `Draft saved (${quoteNumber}), but sending failed: ${sendErr.message}`,
        data: { quotationId: quotationId!, quoteNumber, status: "draft" },
      };
    }
    finalStatus = "sent";
  }

  revalidatePath("/seller/quotes");
  revalidatePath(`/seller/quotes/${quotationId}`);
  revalidatePath(`/seller/enquiries/${enquiry.id}`);
  revalidatePath("/seller/enquiries");
  revalidatePath("/seller/dashboard");
  revalidatePath("/seller/analytics");

  return {
    success: true,
    data: {
      quotationId: quotationId!,
      quoteNumber,
      status: finalStatus,
    },
  };
}

export async function updateQuotationStatusAction(
  quotationId: string,
  newStatus: "sent" | "cancelled" | "revised",
): Promise<ActionResult<{ enquiryId: string }>> {
  const { supabase, seller } = await getAuthenticatedSellerRow();
  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const { data: quote } = await supabase
    .from("quotations")
    .select("id, enquiry_id, seller_id, status")
    .eq("id", quotationId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (!quote) {
    return { success: false, error: "Quotation not found or access denied." };
  }

  const { error } = await supabase
    .from("quotations")
    .update({ status: newStatus })
    .eq("id", quote.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/seller/quotes");
  revalidatePath(`/seller/quotes/${quote.id}`);
  revalidatePath(`/seller/enquiries/${quote.enquiry_id}`);
  revalidatePath("/seller/enquiries");
  revalidatePath("/seller/dashboard");
  revalidatePath("/seller/analytics");

  return { success: true, data: { enquiryId: quote.enquiry_id } };
}

// ---------------------------------------------------------------------------
// Phase 2: Order Status Transition for Seller (/seller/orders/[id])
// ---------------------------------------------------------------------------
export async function transitionSellerOrderAction(
  input: OrderStatusTransitionInput,
): Promise<ActionResult> {
  try {
    const { seller } = await getAuthenticatedSellerRow();
    if (!seller) {
      return { success: false, error: "Seller profile not found." };
    }

    const parsed = orderStatusTransitionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid status transition.",
      };
    }

    const { orderId, newStatus, notes } = parsed.data;
    if (newStatus !== "confirmed" && newStatus !== "processing" && newStatus !== "dispatched") {
      return {
        success: false,
        error: "Suppliers may only transition orders through confirmed, processing, or dispatched stages.",
      };
    }

    const supabase = await getSupabaseServerClient();
    const { error: rpcError } = await supabase.rpc("transition_order_status", {
      _order_id: orderId,
      _new_status: newStatus,
      _notes: notes ?? null,
    });

    if (rpcError) {
      console.error("[transitionSellerOrderAction] RPC error:", rpcError);
      return {
        success: false,
        error: rpcError.message || "Failed to update order status.",
      };
    }

    revalidatePath("/seller/orders");
    revalidatePath(`/seller/orders/${orderId}`);
    revalidatePath("/buyer/orders");
    revalidatePath(`/buyer/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (err) {
    console.error("[transitionSellerOrderAction] unexpected error:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred.",
    };
  }
}


