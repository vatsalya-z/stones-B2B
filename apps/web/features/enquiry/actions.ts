"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getCurrentUser, getUserRoles } from "@/lib/auth";

export interface CreateEnquiryInput {
  productId: string;
  enquiryTitle?: string;
  quantity: number;
  unit: string;
  message: string;
  deliveryLocation?: string;
  expectedBudget?: number;
}

export interface EnquiryResult {
  success: boolean;
  error?: string;
  enquiryId?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_UNITS = [
  "sq_ft",
  "sq_m",
  "piece",
  "ton",
  "metric_ton",
  "slab",
  "box",
  "custom",
];

export async function createEnquiry(
  productId: string,
  formData: FormData,
): Promise<EnquiryResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please sign in to submit an enquiry." };
    }

    const roles = await getUserRoles();
    if (!roles.includes("buyer")) {
      return {
        success: false,
        error: "A Buyer account is required to submit product enquiries.",
      };
    }

    if (!UUID_REGEX.test(productId)) {
      return {
        success: false,
        error:
          "This is a showcase catalogue preview. Use Create New RFQ in your Buyer Portal to send a custom requirement to verified suppliers.",
      };
    }

    const supabase = await getSupabaseServerClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.account_status !== "active") {
      return { success: false, error: "Your account is not active." };
    }

    const rawQuantity = formData.get("quantity");
    const rawUnit = formData.get("unit");
    const message = (formData.get("message") as string)?.trim() ?? "";
    const rawTitle = formData.get("enquiry_title") as string | null;
    const deliveryLocation = (formData.get("delivery_location") as string)?.trim() || null;
    const rawBudget = formData.get("expected_budget");
    const rawClientReqId = (formData.get("client_request_id") as string | null)?.trim();

    const quantity = Number(rawQuantity);
    if (!quantity || quantity <= 0 || isNaN(quantity)) {
      return { success: false, error: "Please enter a valid quantity greater than zero." };
    }

    let unit = ((rawUnit as string) || "sq_ft").trim();
    if (!ALLOWED_UNITS.includes(unit)) {
      unit = "custom";
    }

    if (!message || message.length < 5) {
      return {
        success: false,
        error: "Please provide a detailed requirement (at least 5 characters).",
      };
    }

    const clientRequestId =
      rawClientReqId && UUID_REGEX.test(rawClientReqId) ? rawClientReqId : randomUUID();

    // Pre-check idempotency key for network retries
    const { data: existing } = await supabase
      .from("enquiries")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("client_request_id", clientRequestId)
      .maybeSingle();

    if (existing) {
      return { success: true, enquiryId: existing.id };
    }

    // Verify product exists, is approved, and fetch seller_id server-side
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, seller_id, moderation_status, published_at")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      return { success: false, error: "Product not found or unavailable." };
    }

    if (product.moderation_status !== "approved" || !product.published_at) {
      return { success: false, error: "This product is not currently available for enquiry." };
    }

    const enquiryTitle =
      rawTitle?.trim() && rawTitle.trim().length >= 3
        ? rawTitle.trim().slice(0, 200)
        : `Enquiry for ${product.name}`.slice(0, 200);

    const expectedBudget = rawBudget ? Number(rawBudget) : null;

    const { data: inserted, error: insertError } = await supabase
      .from("enquiries")
      .insert({
        buyer_id: user.id,
        seller_id: product.seller_id,
        product_id: product.id,
        enquiry_title: enquiryTitle,
        description: message,
        quantity,
        unit,
        expected_budget: expectedBudget && !isNaN(expectedBudget) ? expectedBudget : null,
        currency: "INR",
        delivery_location: deliveryLocation,
        client_request_id: clientRequestId,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: dup } = await supabase
          .from("enquiries")
          .select("id")
          .eq("buyer_id", user.id)
          .eq("client_request_id", clientRequestId)
          .maybeSingle();
        return { success: true, enquiryId: dup?.id };
      }
      console.error("[createEnquiry] insert error:", insertError.message);
      return { success: false, error: "Failed to submit enquiry. Please try again." };
    }

    revalidatePath("/buyer/dashboard");
    revalidatePath("/buyer/enquiries");
    return { success: true, enquiryId: inserted.id };
  } catch (err) {
    console.error("[createEnquiry] unhandled error:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
