import type { Database } from "@stone/database";
import type { OrderStatus, PaymentStatus } from "@stone/types";
import { slugify } from "@stone/utils";
import {
  orderStatusTransitionSchema,
  productFormSchema,
  quotationFormSchema,
  sellerEnquiryTransitionSchema,
  sellerProfileSchema,
  type ProductFormInput,
  type QuotationFormInput,
  type SellerProfileInput,
  type VerificationDocumentType,
} from "@stone/validation";
import { fromPublicMutableTable, groupRowsByKey, supabase } from "../lib/supabase";
import {
  buildProductSpecificationRows,
  checkVerificationReadiness,
  computeQuotationTotals,
  decodeSellerDescription,
  encodeSellerDescription,
  getAllowedSellerOrderTransitions,
} from "../lib/domain-meta";
import { resolveStorageImageUrl } from "../theme/assets";
import { uploadNativeAsset, type PickedFileInput } from "../lib/storage-upload";

export type SellerProfileRow = Database["public"]["Tables"]["seller_profiles"]["Row"];
export type SellerProductRow = Database["public"]["Tables"]["products"]["Row"];
export type SellerProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];
export type SellerProductSpecRow = Database["public"]["Tables"]["product_specifications"]["Row"];
export type SellerQuotationItemRow = Database["public"]["Tables"]["quotation_items"]["Row"];
export type SellerOrderItemRow = Database["public"]["Views"]["order_items"]["Row"];
export type VerificationDocRow =
  Database["public"]["Tables"]["seller_verification_documents"]["Row"];

export interface SellerEntitlements {
  plan_code: string;
  plan_name: string;
  status: string;
  max_active_listings: number | null;
  active_listings_count: number;
  remaining_listings: number | null;
  can_create_listing: boolean;
  is_unlimited_listings: boolean;
  max_monthly_leads: number | null;
  used_monthly_leads: number;
  remaining_monthly_leads: number | null;
  can_receive_leads: boolean;
  is_unlimited_leads: boolean;
  billing_period_start: string | null;
  billing_period_end: string | null;
  current_period_end: string | null;
  is_suspended: boolean;
  is_expired: boolean;
  features: Record<string, unknown>;
}

const DEFAULT_FREE_ENTITLEMENTS: SellerEntitlements = {
  plan_code: "free",
  plan_name: "Free",
  status: "active",
  max_active_listings: 5,
  active_listings_count: 0,
  remaining_listings: 5,
  can_create_listing: true,
  is_unlimited_listings: false,
  max_monthly_leads: 5,
  used_monthly_leads: 0,
  remaining_monthly_leads: 5,
  can_receive_leads: true,
  is_unlimited_leads: false,
  billing_period_start: null,
  billing_period_end: null,
  current_period_end: null,
  is_suspended: false,
  is_expired: false,
  features: {},
};

export async function fetchSellerEntitlements(sellerId: string): Promise<SellerEntitlements> {
  const { data, error } = await supabase.rpc("get_seller_subscription_entitlements", {
    _seller_id: sellerId,
  });
  if (error || !data || typeof data !== "object") {
    return DEFAULT_FREE_ENTITLEMENTS;
  }
  return { ...DEFAULT_FREE_ENTITLEMENTS, ...(data as Partial<SellerEntitlements>) };
}

export async function fetchSellerDashboardData(userId: string) {
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!seller) {
    return {
      seller: null,
      entitlements: DEFAULT_FREE_ENTITLEMENTS,
      readiness: checkVerificationReadiness(null, 0),
      metrics: {
        totalEnquiries: 0,
        newLeads: 0,
        pendingQuotes: 0,
        activeOrders: 0,
        totalProducts: 0,
        publishedProducts: 0,
      },
      recentActivity: [] as Array<{ id: string; title: string; subtitle: string; createdAt: string }>,
    };
  }

  const [
    entitlements,
    { data: directEnquiries },
    { data: assignments },
    { data: quotes },
    { data: orders },
    { data: products },
    { count: docsCount },
  ] = await Promise.all([
    fetchSellerEntitlements(seller.id),
    supabase
      .from("enquiries")
      .select("id, enquiry_title, status, created_at")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("lead_assignments")
      .select("id, enquiry_id, status, assigned_at")
      .eq("seller_id", seller.id)
      .order("assigned_at", { ascending: false })
      .limit(30),
    supabase
      .from("quotations")
      .select("id, quote_number, status, total_amount, currency, created_at")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total_amount, currency, created_at")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("products")
      .select("id, moderation_status")
      .eq("seller_id", seller.id),
    supabase
      .from("seller_verification_documents")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", seller.id),
  ]);

  const directIds = new Set((directEnquiries ?? []).map((e) => e.id));
  const extraAssigned = (assignments ?? []).filter((a) => !directIds.has(a.enquiry_id));
  const totalEnquiries = (directEnquiries?.length ?? 0) + extraAssigned.length;
  const newLeads =
    (directEnquiries ?? []).filter((e) => e.status === "submitted").length +
    extraAssigned.filter((a) => a.status === "assigned").length;
  const pendingQuotes = (quotes ?? []).filter((q) =>
    ["draft", "sent", "viewed"].includes(q.status),
  ).length;
  const activeOrders = (orders ?? []).filter((o) =>
    ["pending_payment", "confirmed", "processing", "dispatched"].includes(o.status),
  ).length;
  const totalProducts = products?.length ?? 0;
  const publishedProducts = (products ?? []).filter(
    (p) => p.moderation_status === "approved",
  ).length;

  const recentActivity = [
    ...(directEnquiries ?? []).slice(0, 3).map((e) => ({
      id: `enq-${e.id}`,
      title: `Enquiry: ${e.enquiry_title}`,
      subtitle: `Status: ${e.status}`,
      createdAt: e.created_at,
    })),
    ...(quotes ?? []).slice(0, 2).map((q) => ({
      id: `quo-${q.id}`,
      title: `Quotation ${q.quote_number}`,
      subtitle: `Status: ${q.status}`,
      createdAt: q.created_at,
    })),
    ...(orders ?? []).slice(0, 2).map((o) => ({
      id: `ord-${o.id}`,
      title: `Order ${o.order_number}`,
      subtitle: `Fulfillment: ${o.status}`,
      createdAt: o.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return {
    seller,
    entitlements,
    readiness: checkVerificationReadiness(seller, docsCount ?? 0),
    metrics: {
      totalEnquiries,
      newLeads,
      pendingQuotes,
      activeOrders,
      totalProducts,
      publishedProducts,
    },
    recentActivity,
  };
}

export async function fetchSellerProducts(sellerId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  const productList = data ?? [];
  const productIds = productList.map((p) => p.id);
  const { data: rawImages } =
    productIds.length > 0
      ? await supabase
          .from("product_images")
          .select("id, product_id, storage_path, is_primary, display_order")
          .in("product_id", productIds)
      : {
          data: [] as Array<{
            id: string;
            product_id: string;
            storage_path: string;
            is_primary: boolean;
            display_order: number;
          }>,
        };

  const imagesByProductId = groupRowsByKey(rawImages, "product_id");

  return productList.map((p) => {
    const imgs = [...(imagesByProductId.get(p.id) ?? [])].sort((a, b) =>
      a.is_primary === b.is_primary ? a.display_order - b.display_order : a.is_primary ? -1 : 1,
    );
    return {
      ...p,
      primaryImageUrl: resolveStorageImageUrl(imgs[0]?.storage_path ?? null, "product-images"),
      images: imgs.map((i) => ({
        ...i,
        url: resolveStorageImageUrl(i.storage_path, "product-images") ?? "",
      })),
    };
  });
}

export async function fetchSellerProductForEdit(sellerId: string, productId: string) {
  const [{ data, error }, { data: rawImages }, { data: specs }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("seller_id", sellerId)
      .maybeSingle(),
    supabase
      .from("product_images")
      .select("id, storage_path, is_primary, display_order")
      .eq("product_id", productId),
    supabase.from("product_specifications").select("*").eq("product_id", productId),
  ]);

  if (error || !data) return null;
  return {
    ...data,
    product_specifications: specs ?? [],
    images: [...(rawImages ?? [])]
      .sort((a, b) =>
        a.is_primary === b.is_primary ? a.display_order - b.display_order : a.is_primary ? -1 : 1,
      )
      .map((i) => ({
        ...i,
        url: resolveStorageImageUrl(i.storage_path, "product-images") ?? "",
      })),
  };
}

export async function fetchActiveStoneCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function generateUniqueProductSlug(baseInput: string, excludeId?: string): Promise<string> {
  const base = slugify(baseInput) || "natural-stone";
  let candidate = base;
  for (let i = 0; i < 10; i++) {
    let q = supabase.from("products").select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
    candidate = `${base.slice(0, 68)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base.slice(0, 64)}-${Date.now().toString(36)}`;
}

export function assertSellerNotSuspended(
  seller?: Pick<SellerProfileRow, "verification_status"> | null,
  entitlements?: Pick<SellerEntitlements, "is_suspended"> | null,
): void {
  if (seller?.verification_status === "suspended" || entitlements?.is_suspended === true) {
    throw new Error(
      "Your seller account is suspended. Listing and quotation actions are disabled.",
    );
  }
}

export async function saveSellerProduct(params: {
  seller: SellerProfileRow;
  productId?: string;
  input: ProductFormInput;
  newImages?: PickedFileInput[];
}): Promise<{ productId: string }> {
  assertSellerNotSuspended(params.seller);
  const parsed = productFormSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Check product details.");
  }

  const v = parsed.data;

  if (v.intent === "pending_review" && params.seller.verification_status !== "verified") {
    throw new Error(
      "Your seller profile must be Verified before submitting products for review. Save as Draft instead.",
    );
  }

  // Enforce subscription status & active listing limits cleanly
  const ent = await fetchSellerEntitlements(params.seller.id);
  assertSellerNotSuspended(params.seller, ent);
  if (!params.productId && !ent.can_create_listing) {
    throw new Error(
      `Your ${ent.plan_name} plan allows up to ${ent.max_active_listings} active listings. Archive an inactive listing or upgrade your plan.`,
    );
  }

  const effectiveCategoryId = v.subcategoryId || v.categoryId || null;
  const effectivePrice = v.priceType === "on_request" ? null : v.price;

  let productId = params.productId;
  if (!productId) {
    const finalSlug = await generateUniqueProductSlug(v.slug || v.name);
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        seller_id: params.seller.id,
        category_id: effectiveCategoryId,
        name: v.name,
        slug: finalSlug,
        sku: v.sku,
        description: v.description,
        material_type: v.materialType,
        stone_origin: v.stoneOrigin,
        colour: v.colour,
        finish: v.finish,
        thickness: v.thickness,
        length: v.length,
        width: v.width,
        minimum_order_quantity: v.minimumOrderQuantity,
        unit: v.unit,
        price_type: v.priceType,
        price: effectivePrice,
        currency: v.currency,
        stock_status: v.stockStatus,
        lead_time: v.leadTime,
        moderation_status: v.intent,
      })
      .select("id")
      .single();

    if (error || !created) throw new Error(error?.message || "Failed to create product.");
    productId = created.id;
  } else {
    const finalSlug = await generateUniqueProductSlug(v.slug || v.name, productId);
    const { error } = await supabase
      .from("products")
      .update({
        category_id: effectiveCategoryId,
        name: v.name,
        slug: finalSlug,
        sku: v.sku,
        description: v.description,
        material_type: v.materialType,
        stone_origin: v.stoneOrigin,
        colour: v.colour,
        finish: v.finish,
        thickness: v.thickness,
        length: v.length,
        width: v.width,
        minimum_order_quantity: v.minimumOrderQuantity,
        unit: v.unit,
        price_type: v.priceType,
        price: effectivePrice,
        currency: v.currency,
        stock_status: v.stockStatus,
        lead_time: v.leadTime,
        moderation_status: v.intent,
      })
      .eq("id", productId)
      .eq("seller_id", params.seller.id);

    if (error) throw new Error(error.message);
  }

  await supabase.from("product_specifications").delete().eq("product_id", productId);
  const specRows = buildProductSpecificationRows({
    productId,
    availableSizes: v.availableSizes,
    surfaceTreatment: v.surfaceTreatment,
    availableQuantity: v.availableQuantity,
    packagingInfo: v.packagingInfo,
    customSpecifications: v.customSpecifications,
  });
  if (specRows.length > 0) {
    await supabase.from("product_specifications").insert(specRows);
  }

  if (params.newImages && params.newImages.length > 0) {
    const { count: existingImgCount } = await supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);
    const baseOrder = existingImgCount ?? 0;

    for (let i = 0; i < params.newImages.length; i++) {
      const uploaded = await uploadNativeAsset({
        bucket: "product-images",
        folderPrefix: `${params.seller.id}/${productId}`,
        file: params.newImages[i]!,
        maxBytes: 5 * 1024 * 1024,
      });
      await supabase.from("product_images").insert({
        product_id: productId,
        storage_path: uploaded.path,
        is_primary: baseOrder === 0 && i === 0,
        display_order: baseOrder + i,
      });
    }
  }

  return { productId };
}

export async function changeSellerProductStatus(
  seller: SellerProfileRow,
  productId: string,
  newStatus: "draft" | "pending_review" | "archived",
) {
  assertSellerNotSuspended(seller);
  if (newStatus === "pending_review" && seller.verification_status !== "verified") {
    throw new Error("Only Verified sellers can submit products for marketplace review.");
  }
  const { error } = await supabase
    .from("products")
    .update({ moderation_status: newStatus })
    .eq("id", productId)
    .eq("seller_id", seller.id);
  if (error) throw new Error(error.message);
}

export async function fetchSellerLeads(sellerId: string) {
  const [{ data: direct, error: dErr }, { data: assignments, error: aErr }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_assignments")
      .select("*")
      .eq("seller_id", sellerId)
      .order("assigned_at", { ascending: false }),
  ]);

  if (dErr) throw new Error(dErr.message);
  if (aErr) throw new Error(aErr.message);

  const directIds = new Set((direct ?? []).map((e) => e.id));
  const missingAssignedIds = (assignments ?? [])
    .map((a) => a.enquiry_id)
    .filter((id) => !directIds.has(id));

  const { data: assignedEnquiries } =
    missingAssignedIds.length > 0
      ? await supabase.from("enquiries").select("*").in("id", missingAssignedIds)
      : { data: [] };

  const assignmentByEnq = new Map((assignments ?? []).map((a) => [a.enquiry_id, a]));

  const combined = [...(direct ?? []), ...(assignedEnquiries ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return combined.map((enq) => {
    const la = assignmentByEnq.get(enq.id);
    return {
      ...enq,
      leadAssignment: la ?? null,
      sourceType: la ? ("assigned" as const) : ("direct" as const),
    };
  });
}

export async function fetchSellerLeadDetail(sellerId: string, enquiryId: string) {
  const [{ data: enquiry, error }, { data: assignment }, { data: quotes }] = await Promise.all([
    supabase.from("enquiries").select("*").eq("id", enquiryId).maybeSingle(),
    supabase
      .from("lead_assignments")
      .select("*")
      .eq("enquiry_id", enquiryId)
      .eq("seller_id", sellerId)
      .maybeSingle(),
    supabase
      .from("quotations")
      .select("*")
      .eq("enquiry_id", enquiryId)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }),
  ]);

  if (error || !enquiry) return null;

  let buyerProfile: { full_name: string | null; city: string | null; state: string | null } | null =
    null;
  if (enquiry.buyer_id) {
    const { data: bp } = await supabase
      .from("profiles")
      .select("full_name, city, state")
      .eq("id", enquiry.buyer_id)
      .maybeSingle();
    buyerProfile = bp ?? null;
  }

  return {
    enquiry,
    assignment: assignment ?? null,
    buyerProfile,
    quotations: quotes ?? [],
  };
}

export async function transitionSellerLeadStatus(
  sellerId: string,
  enquiryId: string,
  newStatus: "viewed" | "responding" | "rejected" | "closed",
  notes?: string,
) {
  const parsed = sellerEnquiryTransitionSchema.safeParse({ enquiryId, newStatus, notes });
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "Invalid status.");

  const { error } = await supabase.rpc("transition_enquiry_status", {
    _enquiry_id: parsed.data.enquiryId,
    _new_status: parsed.data.newStatus,
    _notes: parsed.data.notes ?? undefined,
  });
  if (error) throw new Error(error.message);

  if (newStatus === "viewed" || newStatus === "rejected") {
    await fromPublicMutableTable("lead_assignments")
      .update({
        status: newStatus === "rejected" ? "declined" : "viewed",
        ...(newStatus === "viewed" ? { viewed_at: new Date().toISOString() } : {}),
      })
      .eq("enquiry_id", enquiryId)
      .eq("seller_id", sellerId);
  }
}

export async function fetchSellerQuotations(sellerId: string) {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const quoteList = data ?? [];
  const quoteIds = quoteList.map((q) => q.id);
  const { data: items } =
    quoteIds.length > 0
      ? await supabase.from("quotation_items").select("*").in("quotation_id", quoteIds)
      : { data: [] as SellerQuotationItemRow[] };
  const itemsByQuoteId = groupRowsByKey(items, "quotation_id");

  return quoteList.map((q) => ({
    ...q,
    quotation_items: itemsByQuoteId.get(q.id) ?? [],
  }));
}

export async function saveSellerQuotation(
  sellerId: string,
  input: QuotationFormInput,
): Promise<{ quotationId: string; quoteNumber: string; status: string }> {
  const ent = await fetchSellerEntitlements(sellerId);
  assertSellerNotSuspended(null, ent);

  const parsed = quotationFormSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Check quotation details.");
  }

  const v = parsed.data;
  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("id, buyer_id, status")
    .eq("id", v.enquiryId)
    .maybeSingle();

  if (!enquiry) throw new Error("Enquiry not found or access denied.");
  if (!enquiry.buyer_id) {
    throw new Error(
      "Quotations can only be issued for registered buyers. Contact guest buyers directly using their provided enquiry contact.",
    );
  }

  const totals = computeQuotationTotals({
    items: v.items,
    discountAmount: v.discountAmount,
    taxAmount: v.taxAmount,
    shippingCharges: v.shippingCharges,
  });

  // Omit `status` and `quote_number` on INSERT per Postgres column-level INSERT grants
  const { data: created, error: insErr } = await supabase
    .from("quotations")
    .insert({
      enquiry_id: enquiry.id,
      seller_id: sellerId,
      buyer_id: enquiry.buyer_id,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      shipping_charges: totals.shippingCharges,
      discount_amount: totals.discountAmount,
      total_amount: totals.totalAmount,
      currency: v.currency,
      valid_until: v.validUntil,
      terms: v.terms,
    })
    .select("id, quote_number")
    .single();

  if (insErr || !created) throw new Error(insErr?.message || "Failed to create quotation.");

  const { error: itemsErr } = await supabase.from("quotation_items").insert(
    totals.items.map((item) => ({
      quotation_id: created.id,
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    })),
  );

  if (itemsErr) throw new Error(itemsErr.message);

  let status = "draft";
  if (v.sendImmediately) {
    const { error: sendErr } = await supabase
      .from("quotations")
      .update({ status: "sent" })
      .eq("id", created.id);
    if (sendErr) throw new Error(sendErr.message);
    status = "sent";

    await fromPublicMutableTable("lead_assignments")
      .update({ status: "quoted", quoted_at: new Date().toISOString() })
      .eq("enquiry_id", enquiry.id)
      .eq("seller_id", sellerId);
  }

  return { quotationId: created.id, quoteNumber: created.quote_number, status };
}

export async function fetchSellerOrders(sellerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const orderList = data ?? [];
  const orderIds = orderList.map((o) => o.id);
  const { data: items } =
    orderIds.length > 0
      ? await supabase.from("order_items").select("*").in("order_id", orderIds)
      : { data: [] as SellerOrderItemRow[] };
  const itemsByOrderId = groupRowsByKey(items, "order_id");

  return orderList.map((o) => ({
    ...o,
    order_items: itemsByOrderId.get(o.id) ?? [],
  }));
}

export async function fetchSellerOrderDetail(sellerId: string, orderId: string) {
  const [{ data: order, error }, { data: items }, { data: history }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("seller_id", sellerId)
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

/**
 * Payment Model B: Seller fulfillment actions may ONLY call `transition_order_status`
 * for `confirmed` | `processing` | `dispatched`. Never modifies `payment_status`.
 */
export async function transitionSellerOrder(
  orderId: string,
  newStatus: "confirmed" | "processing" | "dispatched",
  notes?: string,
  currentStatus?: OrderStatus,
  currentPaymentStatus?: PaymentStatus,
) {
  const effectiveStatus =
    currentStatus ??
    (newStatus === "processing"
      ? "confirmed"
      : newStatus === "dispatched"
        ? "processing"
        : "pending_payment");
  const effectivePayment = currentPaymentStatus ?? "paid";
  const allowed = getAllowedSellerOrderTransitions(effectiveStatus, effectivePayment);
  if (!allowed.some((a) => a.status === newStatus)) {
    throw new Error(
      effectivePayment !== "paid" && effectiveStatus === "pending_payment"
        ? "Payment must be verified via Payment Model B before confirming fulfillment."
        : `Order cannot transition from "${effectiveStatus}" to "${newStatus}".`,
    );
  }

  const parsed = orderStatusTransitionSchema.safeParse({ orderId, newStatus, notes });
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "Invalid input.");

  const { error } = await supabase.rpc("transition_order_status", {
    _order_id: parsed.data.orderId,
    _new_status: parsed.data.newStatus,
    _notes: parsed.data.notes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function saveSellerBusinessProfile(params: {
  userId: string;
  existingSeller: SellerProfileRow | null;
  input: SellerProfileInput;
  logoFile?: PickedFileInput | null;
  coverFile?: PickedFileInput | null;
}) {
  const parsed = sellerProfileSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Please review business details.");
  }

  const v = parsed.data;
  const existingMeta = decodeSellerDescription(params.existingSeller?.description);
  const encodedDescription = encodeSellerDescription({
    cleanDescription: v.description,
    hasManufacturing: v.hasManufacturing,
    hasQuarry: v.hasQuarry,
    hasExport: v.hasExport,
    productCategories: v.productCategories,
    showWebsitePublicly: v.showWebsitePublicly ?? existingMeta.showWebsitePublicly,
    acceptBulkExportEnquiries:
      v.acceptBulkExportEnquiries ?? existingMeta.acceptBulkExportEnquiries,
  });

  const desiredSlug = v.slug || params.existingSeller?.slug || slugify(v.businessName) || "quarry";
  let sellerId = params.existingSeller?.id;

  const basePayload = {
    business_name: v.businessName,
    slug: desiredSlug,
    business_type: v.businessType,
    owner_name: v.ownerName,
    business_email: v.businessEmail,
    phone: v.phone,
    whatsapp_number: v.whatsappNumber,
    gst_number: v.gstNumber,
    business_address: v.businessAddress,
    city: v.city,
    state: v.state,
    country: v.country,
    pincode: v.pincode,
    website: v.website,
    years_in_business: v.yearsInBusiness,
    description: encodedDescription,
  };

  if (!sellerId) {
    const { data: created, error } = await supabase
      .from("seller_profiles")
      .insert({ user_id: params.userId, ...basePayload })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message || "Failed to create storefront.");
    sellerId = created.id;
  } else {
    const { error } = await supabase
      .from("seller_profiles")
      .update(basePayload)
      .eq("id", sellerId);
    if (error) throw new Error(error.message);
  }

  const mediaUpdates: { logo_url?: string; cover_image_url?: string } = {};
  if (params.logoFile) {
    const up = await uploadNativeAsset({
      bucket: "seller-logos",
      folderPrefix: sellerId,
      file: params.logoFile,
      maxBytes: 2 * 1024 * 1024,
    });
    mediaUpdates.logo_url = up.path;
  }
  if (params.coverFile) {
    const up = await uploadNativeAsset({
      bucket: "seller-cover-images",
      folderPrefix: sellerId,
      file: params.coverFile,
      maxBytes: 5 * 1024 * 1024,
    });
    mediaUpdates.cover_image_url = up.path;
  }
  if (Object.keys(mediaUpdates).length > 0) {
    await supabase.from("seller_profiles").update(mediaUpdates).eq("id", sellerId);
  }

  return sellerId;
}

export async function fetchSellerVerificationDocs(sellerId: string): Promise<VerificationDocRow[]> {
  const { data, error } = await supabase
    .from("seller_verification_documents")
    .select("*")
    .eq("seller_id", sellerId)
    .order("uploaded_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function uploadSellerVerificationDoc(
  sellerId: string,
  documentType: VerificationDocumentType,
  file: PickedFileInput,
) {
  const uploaded = await uploadNativeAsset({
    bucket: "seller-verification-documents",
    folderPrefix: sellerId,
    file,
    maxBytes: 10 * 1024 * 1024,
  });

  const { error } = await supabase.from("seller_verification_documents").insert({
    seller_id: sellerId,
    document_type: documentType,
    storage_path: uploaded.path,
  });

  if (error) throw new Error(error.message);
}

export async function getVerificationDocSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("seller-verification-documents")
    .createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) throw new Error("Unable to open secure document preview.");
  return data.signedUrl;
}

export async function submitSellerVerification() {
  const { error } = await supabase.rpc("submit_seller_verification");
  if (error) throw new Error(error.message);
}

export async function fetchSellerSubscriptionOverview(sellerId: string) {
  const [entitlements, { data: plans }, { data: activeSub }, { data: events }] =
    await Promise.all([
      fetchSellerEntitlements(sellerId),
      supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("seller_subscriptions")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("subscription_events")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  return {
    entitlements,
    plans: plans ?? [],
    activeSub: activeSub ?? null,
    events: events ?? [],
  };
}
