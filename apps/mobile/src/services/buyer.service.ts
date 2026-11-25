import * as Crypto from "expo-crypto";
import type { Database, Json } from "@stone/database";
import type { OrderStatus } from "@stone/types";
import {
  buyerAddressSchema,
  buyerEnquiryTransitionSchema,
  buyerProfileSchema,
  buyerQuotationAcceptanceSchema,
  buyerQuotationDecisionSchema,
  orderStatusTransitionSchema,
  rfqFormSchema,
  type BuyerAddressInput,
  type BuyerProfileInput,
  type BuyerQuotationAcceptanceInput,
  type RfqFormInput,
} from "@stone/validation";
import { fromPublicMutableTable, groupRowsByKey, supabase } from "../lib/supabase";
import {
  buildDeliveryLocationSummary,
  encodeBuyerAddress,
  encodeRfqDescription,
  getAllowedBuyerOrderTransitions,
} from "../lib/domain-meta";
import { uploadNativeAsset, type PickedFileInput } from "../lib/storage-upload";
import { fetchProductsByIds } from "./catalog.service";
import type { StoneProductCardItem } from "../components/stone/StoneProductCard";

export type EnquiryRow = Database["public"]["Tables"]["enquiries"]["Row"];
export type QuotationRow = Database["public"]["Tables"]["quotations"]["Row"];
export type QuotationItemRow = Database["public"]["Tables"]["quotation_items"]["Row"];
export type OrderRow = Database["public"]["Views"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Views"]["order_items"]["Row"];
export type BuyerAddressRow = Database["public"]["Views"]["buyer_addresses"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export async function fetchBuyerDashboardSummary(userId: string) {
  const [
    { count: activeEnquiriesCount },
    { count: pendingQuotesCount },
    { count: savedCount },
    { data: recentEnquiries },
    { data: recentQuotations },
  ] = await Promise.all([
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", userId)
      .in("status", ["submitted", "viewed", "responding", "quoted"]),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", userId)
      .in("status", ["sent", "viewed"]),
    supabase
      .from("product_favourites")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", userId),
    supabase
      .from("enquiries")
      .select("id, enquiry_title, quantity, unit, status, delivery_location, created_at")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("quotations")
      .select("id, quote_number, seller_id, total_amount, currency, status, valid_until, created_at")
      .eq("buyer_id", userId)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const sellerIds = [...new Set((recentQuotations ?? []).map((q) => q.seller_id))];
  const { data: sellers } =
    sellerIds.length > 0
      ? await supabase.from("public_seller_profiles").select("id, business_name").in("id", sellerIds)
      : { data: [] as Array<{ id: string; business_name: string }> };
  const sellerNames = new Map((sellers ?? []).map((s) => [s.id, s.business_name]));

  return {
    activeEnquiriesCount: activeEnquiriesCount ?? 0,
    pendingQuotesCount: pendingQuotesCount ?? 0,
    savedCount: savedCount ?? 0,
    recentEnquiries: recentEnquiries ?? [],
    recentQuotations: (recentQuotations ?? []).map((q) => ({
      ...q,
      sellerName: sellerNames.get(q.seller_id) ?? "Verified Supplier",
    })),
  };
}

export async function fetchBuyerFavourites(userId: string): Promise<{
  favouriteIds: string[];
  products: StoneProductCardItem[];
}> {
  const { data: rows, error } = await supabase
    .from("product_favourites")
    .select("product_id, created_at")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((r) => r.product_id);
  const products = await fetchProductsByIds(ids);
  return { favouriteIds: ids, products };
}

export async function toggleBuyerFavourite(
  userId: string,
  productId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("product_favourites")
    .select("id")
    .eq("buyer_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("product_favourites")
      .delete()
      .eq("id", existing.id)
      .eq("buyer_id", userId);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase.from("product_favourites").insert({
    buyer_id: userId,
    product_id: productId,
  });
  if (error && error.code !== "23505") {
    throw new Error("Unable to save this product to favourites.");
  }
  return true;
}

export async function submitBuyerRfq(params: {
  userId: string;
  input: Omit<RfqFormInput, "clientRequestId"> & { clientRequestId?: string };
  attachment?: PickedFileInput | null;
}): Promise<{ enquiryId: string; deduplicated: boolean }> {
  const clientRequestId = params.input.clientRequestId || Crypto.randomUUID();
  const parsed = rfqFormSchema.safeParse({
    ...params.input,
    clientRequestId,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Please complete required RFQ fields.");
  }

  const d = parsed.data;

  // Idempotency guard matching web implementation
  const { data: existing } = await supabase
    .from("enquiries")
    .select("id")
    .eq("buyer_id", params.userId)
    .eq("client_request_id", d.clientRequestId)
    .maybeSingle();

  if (existing) {
    return { enquiryId: existing.id, deduplicated: true };
  }

  const { data: ownSeller } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("user_id", params.userId)
    .maybeSingle();

  let resolvedSellerId: string | null = null;
  let resolvedProductId: string | null = null;
  let resolvedMaterialType = d.materialType;

  if (d.mode === "product" && d.productId) {
    const { data: product } = await supabase
      .from("products")
      .select("id, seller_id, material_type, moderation_status, published_at")
      .eq("id", d.productId)
      .maybeSingle();

    if (!product || product.moderation_status !== "approved" || !product.published_at) {
      throw new Error("Selected stone product is not published or available.");
    }
    if (ownSeller && ownSeller.id === product.seller_id) {
      throw new Error("You cannot submit an RFQ to your own seller profile.");
    }
    resolvedSellerId = product.seller_id;
    resolvedProductId = product.id;
    resolvedMaterialType = resolvedMaterialType ?? product.material_type;
  } else if (d.sellerId) {
    if (ownSeller && ownSeller.id === d.sellerId) {
      throw new Error("You cannot submit an RFQ to your own seller profile.");
    }
    const { data: verifiedSeller } = await supabase
      .from("public_seller_profiles")
      .select("id")
      .eq("id", d.sellerId)
      .maybeSingle();
    if (!verifiedSeller) {
      throw new Error("Selected supplier is not currently verified.");
    }
    resolvedSellerId = verifiedSeller.id;
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

  const specsJson: Record<string, string | null> = {
    category: d.categorySlug,
    material_type: resolvedMaterialType,
    stone_origin: d.stoneOrigin,
    colour: d.colour,
    finish: d.finish,
    thickness: d.thickness,
    length: d.length,
    width: d.width,
  };

  const { data: inserted, error } = await supabase
    .from("enquiries")
    .insert({
      buyer_id: params.userId,
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
      enquiry_type: "rfq",
      specifications: specsJson as unknown as Json,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Failed to submit RFQ.");
  }

  if (params.attachment) {
    try {
      await uploadNativeAsset({
        bucket: "enquiry-attachments",
        folderPrefix: inserted.id,
        file: params.attachment,
        maxBytes: 10 * 1024 * 1024,
      });
    } catch {
      // Non-blocking: RFQ already persisted cleanly
    }
  }

  return { enquiryId: inserted.id, deduplicated: false };
}

export async function fetchBuyerEnquiries(userId: string) {
  const { data: rows, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const sellerIds = [...new Set((rows ?? []).map((e) => e.seller_id).filter(Boolean) as string[])];
  const { data: sellers } =
    sellerIds.length > 0
      ? await supabase.from("public_seller_profiles").select("id, business_name").in("id", sellerIds)
      : { data: [] as Array<{ id: string; business_name: string }> };
  const sellerMap = new Map((sellers ?? []).map((s) => [s.id, s.business_name]));

  return (rows ?? []).map((e) => ({
    ...e,
    sellerName: e.seller_id ? sellerMap.get(e.seller_id) ?? "Verified Supplier" : "Broadcast RFQ",
    isBroadcast: !e.seller_id,
  }));
}

export async function fetchBuyerEnquiryDetail(userId: string, enquiryId: string) {
  const [{ data: enquiry, error }, { data: history }, { data: quotes }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*")
      .eq("id", enquiryId)
      .eq("buyer_id", userId)
      .maybeSingle(),
    supabase
      .from("enquiry_status_history")
      .select("*")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: false }),
    supabase
      .from("quotations")
      .select("*")
      .eq("enquiry_id", enquiryId)
      .eq("buyer_id", userId)
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
  ]);

  if (error || !enquiry) return null;

  const sellerIds = [
    ...(enquiry.seller_id ? [enquiry.seller_id] : []),
    ...(quotes ?? []).map((q) => q.seller_id),
  ];
  const { data: sellers } =
    sellerIds.length > 0
      ? await supabase
          .from("public_seller_profiles")
          .select("id, business_name, city, state, verified_at")
          .in("id", sellerIds)
      : { data: [] };
  const sellerMap = new Map((sellers ?? []).map((s) => [s.id, s]));

  return {
    enquiry,
    seller: enquiry.seller_id ? sellerMap.get(enquiry.seller_id) ?? null : null,
    history: history ?? [],
    quotations: (quotes ?? []).map((q) => ({
      ...q,
      sellerName: sellerMap.get(q.seller_id)?.business_name ?? "Verified Supplier",
    })),
  };
}

export async function transitionBuyerEnquiry(
  enquiryId: string,
  newStatus: "cancelled" | "closed",
  notes?: string,
) {
  const parsed = buyerEnquiryTransitionSchema.safeParse({ enquiryId, newStatus, notes });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid action.");
  }
  const { error } = await supabase.rpc("transition_enquiry_status", {
    _enquiry_id: parsed.data.enquiryId,
    _new_status: parsed.data.newStatus,
    _notes: parsed.data.notes ?? undefined,
  });
  if (error) throw new Error(error.message);
}

export async function fetchBuyerQuotations(userId: string) {
  const { data: quotes, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("buyer_id", userId)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const quoteList = quotes ?? [];
  const quoteIds = quoteList.map((q) => q.id);
  const sellerIds = [...new Set(quoteList.map((q) => q.seller_id))];
  const enquiryIds = [...new Set(quoteList.map((q) => q.enquiry_id))];

  const [{ data: sellers }, { data: enquiries }, { data: quoteItems }] = await Promise.all([
    sellerIds.length > 0
      ? supabase
          .from("public_seller_profiles")
          .select("id, business_name, city, state, verified_at")
          .in("id", sellerIds)
      : Promise.resolve({ data: [] }),
    enquiryIds.length > 0
      ? supabase.from("enquiries").select("id, enquiry_title").in("id", enquiryIds)
      : Promise.resolve({ data: [] }),
    quoteIds.length > 0
      ? supabase.from("quotation_items").select("*").in("quotation_id", quoteIds)
      : Promise.resolve({ data: [] as QuotationItemRow[] }),
  ]);

  const sellerMap = new Map((sellers ?? []).map((s) => [s.id, s]));
  const enquiryMap = new Map((enquiries ?? []).map((e) => [e.id, e.enquiry_title]));
  const itemsByQuoteId = groupRowsByKey(quoteItems, "quotation_id");

  return quoteList.map((q) => {
    const s = sellerMap.get(q.seller_id);
    return {
      ...q,
      sellerName: s?.business_name ?? "Verified Supplier",
      sellerLocation: [s?.city, s?.state].filter(Boolean).join(", "),
      sellerVerified: Boolean(s?.verified_at),
      enquiryTitle: enquiryMap.get(q.enquiry_id) ?? "Stone Requirement",
      items: itemsByQuoteId.get(q.id) ?? [],
    };
  });
}

export async function fetchBuyerQuotationDetail(userId: string, quotationId: string) {
  const { data: quote, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", quotationId)
    .eq("buyer_id", userId)
    .neq("status", "draft")
    .maybeSingle();

  if (error || !quote) return null;

  const [{ data: seller }, { data: enquiry }, { data: items }] = await Promise.all([
    supabase
      .from("public_seller_profiles")
      .select("id, business_name, city, state, verified_at")
      .eq("id", quote.seller_id)
      .maybeSingle(),
    supabase
      .from("enquiries")
      .select("id, enquiry_title, delivery_location, quantity, unit")
      .eq("id", quote.enquiry_id)
      .maybeSingle(),
    supabase.from("quotation_items").select("*").eq("quotation_id", quote.id),
  ]);

  return {
    quotation: quote,
    items: items ?? [],
    seller: seller ?? null,
    enquiry: enquiry ?? null,
  };
}

export async function decideBuyerQuotation(
  userId: string,
  quotationId: string,
  decision: "viewed" | "rejected",
) {
  const parsed = buyerQuotationDecisionSchema.safeParse({ quotationId, decision });
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "Invalid decision.");

  const { error } = await supabase
    .from("quotations")
    .update({ status: parsed.data.decision })
    .eq("id", parsed.data.quotationId)
    .eq("buyer_id", userId);

  if (error) throw new Error(error.message);
}

/**
 * Payment Model B: Atomically accepts quotation & creates an order in `pending_payment`
 * status via `accept_quotation_and_create_order` RPC. Never marks payment as paid.
 */
export async function acceptQuotationAndCreateOrder(
  userId: string,
  input: BuyerQuotationAcceptanceInput,
): Promise<string> {
  const parsed = buyerQuotationAcceptanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Please complete billing & shipping addresses.");
  }

  const d = parsed.data;
  const { data: orderId, error } = await supabase.rpc("accept_quotation_and_create_order", {
    _quotation_id: d.quotationId,
    _billing_address: d.billingAddress as unknown as Json,
    _shipping_address: d.sameAsBilling ? null : (d.shippingAddress as unknown as Json),
    _same_as_billing: d.sameAsBilling,
    _notes: d.projectDeliveryNotes ?? null,
  });

  if (error || !orderId) {
    throw new Error(error?.message || "Failed to accept quotation.");
  }

  if (d.saveAddresses) {
    try {
      await fromPublicMutableTable("buyer_addresses").insert([
        {
          buyer_id: userId,
          address_type: d.sameAsBilling ? "both" : "billing",
          contact_name: d.billingAddress.contactName,
          phone: d.billingAddress.phone,
          company_name: d.billingAddress.companyName ?? null,
          gstin: d.billingAddress.gstin ?? null,
          address_line1: d.billingAddress.addressLine1,
          address_line2: d.billingAddress.addressLine2 ?? null,
          city: d.billingAddress.city,
          state: d.billingAddress.state,
          pincode: d.billingAddress.pincode,
          country: d.billingAddress.country ?? "IN",
          is_default: false,
        },
      ]);
    } catch {
      // Non-blocking
    }
  }

  return orderId;
}

export async function fetchBuyerOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const orderList = data ?? [];
  const orderIds = orderList.map((o) => o.id);
  const { data: items } =
    orderIds.length > 0
      ? await supabase.from("order_items").select("*").in("order_id", orderIds)
      : { data: [] as OrderItemRow[] };
  const itemsByOrderId = groupRowsByKey(items, "order_id");

  return orderList.map((o) => ({
    ...o,
    order_items: itemsByOrderId.get(o.id) ?? [],
  }));
}

export async function fetchBuyerOrderDetail(userId: string, orderId: string) {
  const [{ data: order, error }, { data: items }, { data: history }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("buyer_id", userId)
      .maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
  ]);

  if (error || !order) return null;
  return { order, items: items ?? [], history: history ?? [] };
}

export async function transitionBuyerOrder(
  orderId: string,
  newStatus: "cancelled" | "delivered",
  notes?: string,
  currentStatus?: OrderStatus,
) {
  const effectiveStatus =
    currentStatus ?? (newStatus === "cancelled" ? "pending_payment" : "dispatched");
  const allowed = getAllowedBuyerOrderTransitions(effectiveStatus);
  if (!allowed.some((a) => a.status === newStatus)) {
    throw new Error(
      `Order cannot transition from "${effectiveStatus}" to "${newStatus}".`,
    );
  }

  const parsed = orderStatusTransitionSchema.safeParse({ orderId, newStatus, notes });
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "Invalid order action.");

  const { error } = await supabase.rpc("transition_order_status", {
    _order_id: parsed.data.orderId,
    _new_status: parsed.data.newStatus,
    _notes: parsed.data.notes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchBuyerAddresses(userId: string): Promise<BuyerAddressRow[]> {
  const { data, error } = await supabase
    .from("buyer_addresses")
    .select("*")
    .eq("buyer_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveBuyerAddress(userId: string, input: BuyerAddressInput) {
  const parsed = buyerAddressSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid address fields.");
  }
  const d = parsed.data;

  if (d.isDefault) {
    await fromPublicMutableTable("buyer_addresses").update({ is_default: false }).eq("buyer_id", userId);
  }

  const { data, error } = await fromPublicMutableTable("buyer_addresses")
    .insert({
      buyer_id: userId,
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
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to save address.");
  return data as BuyerAddressRow;
}

export async function deleteBuyerAddress(userId: string, addressId: string) {
  const { error } = await fromPublicMutableTable("buyer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("buyer_id", userId);
  if (error) throw new Error(error.message);
}

export async function setDefaultBuyerAddress(addressId: string) {
  const rpcCaller = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message?: string } | null }>;
  const { error } = await rpcCaller("set_default_buyer_address", { _address_id: addressId });
  if (error) throw new Error(error.message || "Failed to update default address.");
}

export async function saveBuyerProfile(userId: string, input: BuyerProfileInput) {
  const parsed = buyerProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Check profile details.");
  }
  const d = parsed.data;
  const encodedAddress = encodeBuyerAddress({
    cleanAddress: d.address,
    companyName: d.companyName,
    buyerType: d.buyerType,
    whatsappNumber: d.whatsappNumber,
    pincode: d.pincode,
  });

  // Column-level grant on profiles: (full_name, phone, country, state, city, address)
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
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function fetchUserNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw new Error(error.message);
}
