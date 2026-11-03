"use server";

import { revalidatePath } from "next/cache";
import type { EnquiryStatus, QuotationStatus } from "@stone/types";
import type { Json } from "@stone/database";
import {
  buyerEnquiryTransitionSchema,
  buyerPasswordChangeSchema,
  buyerProfileSchema,
  buyerQuotationDecisionSchema,
  buyerQuotationAcceptanceSchema,
  buyerAddressSchema,
  orderStatusTransitionSchema,
  rfqFormSchema,
  type BuyerAddressInput,
  type BuyerEnquiryTransitionInput,
  type BuyerPasswordChangeInput,
  type BuyerProfileInput,
  type BuyerQuotationAcceptanceInput,
  type BuyerQuotationDecisionInput,
  type OrderStatusTransitionInput,
  type RfqFormInput,
} from "@stone/validation";
import { getCurrentUser, getUserRoles, requireBuyer } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  buildDeliveryLocationSummary,
  encodeBuyerAddress,
  encodeRfqDescription,
  getAllowedBuyerEnquiryTransitions,
  getBuyerQuotationActionEligibility,
} from "./buyer-meta";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  requiresAuth?: boolean;
  data?: T;
}

// ---------------------------------------------------------------------------
// 1. Buyer Profile Update (/buyer/profile)
// Respects column-level grant: (full_name, phone, avatar_url, country, state, city, address)
// Never touches email, account_status, or user_roles.
// ---------------------------------------------------------------------------
export async function saveBuyerProfileAction(
  input: BuyerProfileInput,
): Promise<ActionResult> {
  try {
    const user = await requireBuyer();
    const parsed = buyerProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Please review the highlighted fields.",
      };
    }

    const d = parsed.data;
    const supabase = await getSupabaseServerClient();

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (currentProfile && currentProfile.account_status !== "active") {
      return {
        success: false,
        error: "Your account is currently not active for profile modifications.",
      };
    }

    const encodedAddress = encodeBuyerAddress({
      cleanAddress: d.address,
      companyName: d.companyName,
      buyerType: d.buyerType,
      whatsappNumber: d.whatsappNumber,
      pincode: d.pincode,
    });

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: d.fullName,
        phone: d.phone,
        country: d.country,
        state: d.state,
        city: d.city,
        address: encodedAddress,
      })
      .eq("id", user.id);

    if (error) {
      console.error("[saveBuyerProfileAction] update error:", error.code, error.message);
      return {
        success: false,
        error: "Unable to save buyer profile right now. Please try again.",
      };
    }

    revalidatePath("/buyer/profile");
    revalidatePath("/buyer/dashboard");
    revalidatePath("/buyer/settings");
    return { success: true };
  } catch (err) {
    console.error("[saveBuyerProfileAction] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred while saving your profile." };
  }
}

// ---------------------------------------------------------------------------
// 2. Submit Request for Quotation — Product-Specific & General RFQ (/buyer/rfqs/new)
// - Derives buyer_id strictly from session.
// - Derives seller_id from verified product OR verified public_seller_profiles row.
// - Enforces client_request_id idempotency (retry-safe without duplicate creation).
// ---------------------------------------------------------------------------
export async function submitBuyerRfqAction(
  input: RfqFormInput,
): Promise<ActionResult<{ enquiryId: string; deduplicated: boolean }>> {
  try {
    const user = await requireBuyer();
    const parsed = rfqFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Please complete all required RFQ fields.",
      };
    }

    const d = parsed.data;
    const supabase = await getSupabaseServerClient();

    // Idempotency check before insert so retries return the existing enquiry immediately
    const { data: existingEnquiry } = await supabase
      .from("enquiries")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("client_request_id", d.clientRequestId)
      .maybeSingle();

    if (existingEnquiry) {
      return {
        success: true,
        data: { enquiryId: existingEnquiry.id, deduplicated: true },
      };
    }

    const [{ data: buyerProfile }, { data: ownSeller }] = await Promise.all([
      supabase.from("profiles").select("account_status").eq("id", user.id).maybeSingle(),
      supabase.from("seller_profiles").select("id").eq("user_id", user.id).maybeSingle(),
    ]);

    if (buyerProfile && buyerProfile.account_status !== "active") {
      return {
        success: false,
        error: "Your buyer account must be active to submit an RFQ.",
      };
    }

    let resolvedSellerId: string;
    let resolvedProductId: string | null = null;
    let resolvedMaterialType = d.materialType;

    if (d.mode === "product") {
      if (!d.productId) {
        return { success: false, error: "Select a valid stone product for this RFQ." };
      }

      const { data: product } = await supabase
        .from("products")
        .select("id, seller_id, material_type, moderation_status, published_at")
        .eq("id", d.productId)
        .maybeSingle();

      if (!product || product.moderation_status !== "approved" || !product.published_at) {
        return {
          success: false,
          error: "The selected stone product is not currently published or available for RFQ.",
        };
      }

      if (ownSeller && ownSeller.id === product.seller_id) {
        return {
          success: false,
          error: "You cannot submit an RFQ to your own seller business.",
        };
      }

      const { data: verifiedSeller } = await supabase
        .from("public_seller_profiles")
        .select("id")
        .eq("id", product.seller_id)
        .maybeSingle();

      if (!verifiedSeller) {
        return {
          success: false,
          error: "The supplier for this product is not currently verified to receive RFQs.",
        };
      }

      resolvedSellerId = verifiedSeller.id;
      resolvedProductId = product.id;
      resolvedMaterialType = resolvedMaterialType ?? product.material_type;
    } else {
      if (!d.sellerId) {
        return {
          success: false,
          error: "Please select a verified stone supplier to receive your custom RFQ.",
        };
      }

      if (ownSeller && ownSeller.id === d.sellerId) {
        return {
          success: false,
          error: "You cannot submit an RFQ to your own seller business.",
        };
      }

      const { data: verifiedSeller } = await supabase
        .from("public_seller_profiles")
        .select("id")
        .eq("id", d.sellerId)
        .maybeSingle();

      if (!verifiedSeller) {
        return {
          success: false,
          error: "Selected supplier was not found or is not currently verified.",
        };
      }

      resolvedSellerId = verifiedSeller.id;
      resolvedProductId = null;
    }

    const formattedDescription = encodeRfqDescription({
      mode: d.mode,
      cleanDescription: d.description,
      categorySlug: d.categorySlug,
      materialType: resolvedMaterialType,
      stoneOrigin: d.stoneOrigin,
      colour: d.colour,
      finish: d.finish,
      thickness: d.thickness,
      length: d.length,
      width: d.width,
      surfaceRequirements: d.surfaceRequirements,
      customSpecifications: d.customSpecifications,
      deliveryCountry: d.deliveryCountry,
      deliveryState: d.deliveryState,
      deliveryCity: d.deliveryCity,
      deliveryAddress: d.deliveryAddress,
    });

    const deliverySummary = buildDeliveryLocationSummary({
      deliveryAddress: d.deliveryAddress,
      deliveryCity: d.deliveryCity,
      deliveryState: d.deliveryState,
      deliveryCountry: d.deliveryCountry,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("enquiries")
      .insert({
        buyer_id: user.id,
        seller_id: resolvedSellerId,
        product_id: resolvedProductId,
        enquiry_title: d.enquiryTitle,
        description: formattedDescription,
        quantity: d.quantity,
        unit: d.unit,
        expected_budget: d.expectedBudget,
        currency: d.currency,
        delivery_location: deliverySummary,
        required_delivery_date: d.requiredDeliveryDate,
        client_request_id: d.clientRequestId,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: conflictRow } = await supabase
          .from("enquiries")
          .select("id")
          .eq("buyer_id", user.id)
          .eq("client_request_id", d.clientRequestId)
          .maybeSingle();
        if (conflictRow) {
          return {
            success: true,
            data: { enquiryId: conflictRow.id, deduplicated: true },
          };
        }
      }
      console.error("[submitBuyerRfqAction] insert error:", insertError.code, insertError.message);
      return {
        success: false,
        error: "Unable to submit your RFQ. Please verify your inputs and try again.",
      };
    }

    revalidatePath("/buyer/dashboard");
    revalidatePath("/buyer/enquiries");
    revalidatePath("/buyer/rfqs");

    return {
      success: true,
      data: { enquiryId: inserted.id, deduplicated: false },
    };
  } catch (err) {
    console.error("[submitBuyerRfqAction] unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while submitting your RFQ.",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Buyer Enquiry Status Transition (/buyer/enquiries/[id] & /buyer/rfqs/[id])
// Uses authoritative `public.transition_enquiry_status` RPC (`cancelled` | `closed`).
// ---------------------------------------------------------------------------
export async function transitionBuyerEnquiryAction(
  input: BuyerEnquiryTransitionInput,
): Promise<ActionResult> {
  try {
    const user = await requireBuyer();
    const parsed = buyerEnquiryTransitionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid enquiry status action.",
      };
    }

    const { enquiryId, newStatus, notes } = parsed.data;
    const supabase = await getSupabaseServerClient();

    const { data: enquiry } = await supabase
      .from("enquiries")
      .select("id, status")
      .eq("id", enquiryId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (!enquiry) {
      return { success: false, error: "Enquiry not found or access denied." };
    }

    const allowed = getAllowedBuyerEnquiryTransitions(enquiry.status as EnquiryStatus);
    if (!allowed.some((a) => a.status === newStatus)) {
      return {
        success: false,
        error: `Cannot transition enquiry from "${enquiry.status}" to "${newStatus}".`,
      };
    }

    const { error } = await supabase.rpc("transition_enquiry_status", {
      _enquiry_id: enquiryId,
      _new_status: newStatus,
      _notes: notes ?? undefined,
    });

    if (error) {
      console.error("[transitionBuyerEnquiryAction] rpc error:", error.code, error.message);
      return {
        success: false,
        error: "Unable to update enquiry status right now.",
      };
    }

    revalidatePath("/buyer/dashboard");
    revalidatePath("/buyer/enquiries");
    revalidatePath(`/buyer/enquiries/${enquiryId}`);
    revalidatePath("/buyer/rfqs");
    revalidatePath(`/buyer/rfqs/${enquiryId}`);
    return { success: true };
  } catch (err) {
    console.error("[transitionBuyerEnquiryAction] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ---------------------------------------------------------------------------
// 4. Buyer Quotation Decision (/buyer/quotes/[id])
// Updates ONLY `status` on buyer-owned quotation; `quotations_guard` &
// `quotations_after_change` triggers enforce immutability, expiry, and parent
// enquiry synchronization (`accepted` -> enquiry `accepted`, `rejected` -> `responding`).
// ---------------------------------------------------------------------------
export async function decideBuyerQuotationAction(
  input: BuyerQuotationDecisionInput,
): Promise<ActionResult> {
  try {
    const user = await requireBuyer();
    const parsed = buyerQuotationDecisionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid quotation action.",
      };
    }

    const { quotationId, decision } = parsed.data;
    const supabase = await getSupabaseServerClient();

    const { data: quote } = await supabase
      .from("quotations")
      .select("id, enquiry_id, status, valid_until")
      .eq("id", quotationId)
      .eq("buyer_id", user.id)
      .neq("status", "draft")
      .maybeSingle();

    if (!quote) {
      return { success: false, error: "Quotation not found or access denied." };
    }

    if (quote.status === decision) {
      return { success: true };
    }

    const eligibility = getBuyerQuotationActionEligibility(
      quote.status as QuotationStatus,
      quote.valid_until,
    );

    if (decision === "viewed" && !eligibility.canMarkViewed) {
      return { success: true };
    }
    if (decision === "accepted" && !eligibility.canAccept) {
      return {
        success: false,
        error:
          eligibility.ineligibleReason ??
          "This quotation cannot be accepted in its current state.",
      };
    }
    if (decision === "rejected" && !eligibility.canReject) {
      return {
        success: false,
        error:
          eligibility.ineligibleReason ??
          "This quotation cannot be declined in its current state.",
      };
    }

    const { error } = await supabase
      .from("quotations")
      .update({ status: decision })
      .eq("id", quotationId)
      .eq("buyer_id", user.id);

    if (error) {
      console.error("[decideBuyerQuotationAction] update error:", error.code, error.message);
      if (error.message?.toLowerCase().includes("expired")) {
        return {
          success: false,
          error: "This quotation has expired and can no longer be accepted.",
        };
      }
      return {
        success: false,
        error: "Unable to process quotation decision. Please refresh and try again.",
      };
    }

    revalidatePath("/buyer/dashboard");
    revalidatePath("/buyer/quotes");
    revalidatePath(`/buyer/quotes/${quotationId}`);
    revalidatePath("/buyer/quotes/compare");
    revalidatePath(`/buyer/enquiries/${quote.enquiry_id}`);
    revalidatePath(`/buyer/rfqs/${quote.enquiry_id}`);
    return { success: true };
  } catch (err) {
    console.error("[decideBuyerQuotationAction] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ---------------------------------------------------------------------------
// 5. Saved Products / Favourites Actions (`public.product_favourites`)
// ---------------------------------------------------------------------------
export async function toggleProductFavouriteAction(
  productId: string,
): Promise<ActionResult<{ favourited: boolean }>> {
  try {
    if (!UUID_REGEX.test(productId)) {
      return {
        success: false,
        error: "Showcase catalogue items cannot be saved until published by a verified supplier.",
      };
    }

    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        requiresAuth: true,
        error: "Please sign in as a Buyer to save products.",
      };
    }

    const roles = await getUserRoles();
    if (!roles.includes("buyer")) {
      return {
        success: false,
        error: "Only Buyer accounts can save products to Buyer Favourites.",
      };
    }

    const supabase = await getSupabaseServerClient();
    const { data: existing } = await supabase
      .from("product_favourites")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const { error: delErr } = await supabase
        .from("product_favourites")
        .delete()
        .eq("id", existing.id)
        .eq("buyer_id", user.id);
      if (delErr) {
        console.error("[toggleProductFavouriteAction] delete error:", delErr.message);
        return { success: false, error: "Unable to remove saved product." };
      }
      revalidatePath("/buyer/favourites");
      revalidatePath("/buyer/dashboard");
      return { success: true, data: { favourited: false } };
    }

    const { error: insErr } = await supabase.from("product_favourites").insert({
      buyer_id: user.id,
      product_id: productId,
    });

    if (insErr) {
      if (insErr.code === "23505") {
        return { success: true, data: { favourited: true } };
      }
      console.error("[toggleProductFavouriteAction] insert error:", insErr.code, insErr.message);
      return {
        success: false,
        error: "This product is no longer available to save.",
      };
    }

    revalidatePath("/buyer/favourites");
    revalidatePath("/buyer/dashboard");
    return { success: true, data: { favourited: true } };
  } catch (err) {
    console.error("[toggleProductFavouriteAction] unexpected error:", err);
    return { success: false, error: "Unable to update saved products." };
  }
}

export async function removeProductFavouriteAction(
  productId: string,
): Promise<ActionResult> {
  try {
    if (!UUID_REGEX.test(productId)) {
      return { success: false, error: "Invalid product identifier." };
    }
    const user = await requireBuyer();
    const supabase = await getSupabaseServerClient();

    const { error } = await supabase
      .from("product_favourites")
      .delete()
      .eq("buyer_id", user.id)
      .eq("product_id", productId);

    if (error) {
      console.error("[removeProductFavouriteAction] delete error:", error.message);
      return { success: false, error: "Unable to remove product from favourites." };
    }

    revalidatePath("/buyer/favourites");
    revalidatePath("/buyer/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[removeProductFavouriteAction] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ---------------------------------------------------------------------------
// 6. Buyer Notifications Actions (`/buyer/notifications`)
// ---------------------------------------------------------------------------
export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    if (!UUID_REGEX.test(notificationId)) {
      return { success: false, error: "Invalid notification reference." };
    }
    const user = await requireBuyer();
    const supabase = await getSupabaseServerClient();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[markNotificationReadAction] error:", error.message);
      return { success: false, error: "Unable to update notification status." };
    }

    revalidatePath("/buyer/notifications");
    revalidatePath("/buyer", "layout");
    return { success: true };
  } catch (err) {
    console.error("[markNotificationReadAction] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireBuyer();
    const supabase = await getSupabaseServerClient();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("[markAllNotificationsReadAction] error:", error.message);
      return { success: false, error: "Unable to mark notifications as read." };
    }

    revalidatePath("/buyer/notifications");
    revalidatePath("/buyer", "layout");
    return { success: true };
  } catch (err) {
    console.error("[markAllNotificationsReadAction] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ---------------------------------------------------------------------------
// 7. Buyer Password Change (`/buyer/settings`)
// ---------------------------------------------------------------------------
export async function changeBuyerPasswordAction(
  input: BuyerPasswordChangeInput,
): Promise<ActionResult> {
  try {
    await requireBuyer();
    const parsed = buyerPasswordChangeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Please enter a valid new password.",
      };
    }

    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Unable to update password right now.",
      };
    }

    revalidatePath("/buyer/settings");
    return { success: true };
  } catch (err) {
    console.error("[changeBuyerPasswordAction] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred while updating your password." };
  }
}

// ---------------------------------------------------------------------------
// 8. Phase 2: Quotation Acceptance & Order Initiation (/buyer/quotes/[id])
// ---------------------------------------------------------------------------
export async function acceptQuotationAction(
  input: BuyerQuotationAcceptanceInput,
): Promise<ActionResult<{ orderId: string }>> {
  try {
    const user = await requireBuyer();
    const parsed = buyerQuotationAcceptanceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Please review address and delivery details.",
      };
    }

    const {
      quotationId,
      billingAddress,
      shippingAddress,
      sameAsBilling,
      projectDeliveryNotes,
      saveAddresses,
    } = parsed.data;
    const supabase = await getSupabaseServerClient();

    // Call atomic RPC
    const { data: orderId, error: rpcError } = await supabase.rpc(
      "accept_quotation_and_create_order",
      {
        _quotation_id: quotationId,
        _billing_address: billingAddress as unknown as Json,
        _shipping_address: sameAsBilling ? null : (shippingAddress as unknown as Json),
        _same_as_billing: sameAsBilling,
        _notes: projectDeliveryNotes ?? null,
      },
    );

    if (rpcError) {
      console.error("[acceptQuotationAction] RPC error:", rpcError);
      return {
        success: false,
        error: rpcError.message || "Failed to accept quotation. Please try again.",
      };
    }

    // If buyer requested to save addresses, optionally insert to buyer_addresses
    if (saveAddresses) {
      try {
        await supabase.from("buyer_addresses").insert([
          {
            buyer_id: user.id,
            address_type: sameAsBilling ? "both" : "billing",
            contact_name: billingAddress.contactName,
            phone: billingAddress.phone,
            company_name: billingAddress.companyName ?? null,
            gstin: billingAddress.gstin ?? null,
            address_line1: billingAddress.addressLine1,
            address_line2: billingAddress.addressLine2 ?? null,
            city: billingAddress.city,
            state: billingAddress.state,
            pincode: billingAddress.pincode,
            country: billingAddress.country ?? "IN",
            is_default: false,
          },
          ...(!sameAsBilling && shippingAddress
            ? [
                {
                  buyer_id: user.id,
                  address_type: "shipping" as const,
                  contact_name: shippingAddress.contactName,
                  phone: shippingAddress.phone,
                  company_name: shippingAddress.companyName ?? null,
                  gstin: shippingAddress.gstin ?? null,
                  address_line1: shippingAddress.addressLine1,
                  address_line2: shippingAddress.addressLine2 ?? null,
                  city: shippingAddress.city,
                  state: shippingAddress.state,
                  pincode: shippingAddress.pincode,
                  country: shippingAddress.country ?? "IN",
                  is_default: false,
                },
              ]
            : []),
        ]);
      } catch (saveErr) {
        console.warn("[acceptQuotationAction] Non-blocking address save failed:", saveErr);
      }
    }

    revalidatePath("/buyer/dashboard");
    revalidatePath("/buyer/quotes");
    revalidatePath(`/buyer/quotes/${quotationId}`);
    revalidatePath("/buyer/orders");
    revalidatePath(`/buyer/orders/${orderId}`);
    revalidatePath("/seller/orders");
    revalidatePath("/admin/orders");

    return {
      success: true,
      data: { orderId: orderId as string },
    };
  } catch (err) {
    console.error("[acceptQuotationAction] unexpected error:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred.",
    };
  }
}

// ---------------------------------------------------------------------------
// 9. Phase 2: Order Status Transition for Buyer (/buyer/orders/[id])
// ---------------------------------------------------------------------------
export async function transitionBuyerOrderAction(
  input: OrderStatusTransitionInput,
): Promise<ActionResult> {
  try {
    await requireBuyer();
    const parsed = orderStatusTransitionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid status transition.",
      };
    }

    const { orderId, newStatus, notes } = parsed.data;
    if (newStatus !== "cancelled" && newStatus !== "delivered") {
      return {
        success: false,
        error: "Buyers may only cancel pending orders or confirm delivery of dispatched orders.",
      };
    }

    const supabase = await getSupabaseServerClient();
    const { error: rpcError } = await supabase.rpc("transition_order_status", {
      _order_id: orderId,
      _new_status: newStatus,
      _notes: notes ?? null,
    });

    if (rpcError) {
      console.error("[transitionBuyerOrderAction] RPC error:", rpcError);
      return {
        success: false,
        error: rpcError.message || "Failed to update order status.",
      };
    }

    revalidatePath("/buyer/orders");
    revalidatePath(`/buyer/orders/${orderId}`);
    revalidatePath("/seller/orders");
    revalidatePath(`/seller/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (err) {
    console.error("[transitionBuyerOrderAction] unexpected error:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred.",
    };
  }
}

// ---------------------------------------------------------------------------
// 10. Phase 2: Save Buyer Address (/buyer/settings / checkout)
// ---------------------------------------------------------------------------
export async function saveBuyerAddressAction(
  input: BuyerAddressInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireBuyer();
    const parsed = buyerAddressSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid address data.",
      };
    }

    const d = parsed.data;
    const supabase = await getSupabaseServerClient();

    if (d.isDefault) {
      await supabase
        .from("buyer_addresses")
        .update({ is_default: false })
        .eq("buyer_id", user.id);
    }

    const { data: addressRow, error } = await supabase
      .from("buyer_addresses")
      .insert({
        buyer_id: user.id,
        address_type: d.addressType,
        contact_name: d.contactName,
        phone: d.phone,
        company_name: d.companyName ?? null,
        gstin: d.gstin ?? null,
        address_line1: d.addressLine1,
        address_line2: d.addressLine2 ?? null,
        city: d.city,
        state: d.state,
        pincode: d.pincode,
        country: d.country,
        is_default: d.isDefault,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[saveBuyerAddressAction] error:", error);
      return { success: false, error: "Failed to save address." };
    }

    revalidatePath("/buyer/settings");
    revalidatePath("/buyer/orders");
    return { success: true, data: { id: addressRow.id } };
  } catch (err) {
    console.error("[saveBuyerAddressAction] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

