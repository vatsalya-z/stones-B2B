import "server-only";
import { cache } from "react";
import type { Database } from "@stone/database";
import type { OrderStatus, PaymentStatus } from "@stone/types";
import { parsePagination } from "@stone/utils";
import { getUserRoles, requireSeller } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { resolveStorageUrl, getActiveCategories, type CategoryItem } from "@/lib/db";
import type { ModerationStatus } from "./seller-meta";

export type SellerProfileRow = Database["public"]["Tables"]["seller_profiles"]["Row"];
export type VerificationDocRow =
  Database["public"]["Tables"]["seller_verification_documents"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];
export type ProductSpecRow = Database["public"]["Tables"]["product_specifications"]["Row"];
export type EnquiryRow = Database["public"]["Tables"]["enquiries"]["Row"];
export type EnquiryHistoryRow =
  Database["public"]["Tables"]["enquiry_status_history"]["Row"];
export type QuotationRow = Database["public"]["Tables"]["quotations"]["Row"];
export type QuotationItemRow = Database["public"]["Tables"]["quotation_items"]["Row"];

export interface SellerContext {
  user: {
    id: string;
    email: string | null;
  };
  hasBuyerRole: boolean;
  userProfile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    account_status: string;
  } | null;
  sellerProfile: (SellerProfileRow & {
    resolvedLogoUrl: string | null;
    resolvedCoverUrl: string | null;
  }) | null;
  unreadEnquiriesCount: number;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
}

/**
 * Authoritative request-cached seller context.
 * Enforces `seller` role membership via `requireSeller()`.
 */
export const getSellerContext = cache(async (): Promise<SellerContext> => {
  const user = await requireSeller();
  const supabase = await getSupabaseServerClient();

  const [roles, { data: userProfile }, { data: sellerRow }, { count: unreadNotifCount }] =
    await Promise.all([
      getUserRoles(),
      supabase
        .from("profiles")
        .select("full_name, email, phone, account_status")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

  let unreadEnquiriesCount = 0;
  let unreadMessagesCount = 0;
  if (sellerRow) {
    const [{ count: enqCount }, { data: unreadConvs }] = await Promise.all([
      supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerRow.id)
        .eq("status", "submitted"),
      supabase
        .from("conversations")
        .select("seller_unread_count")
        .eq("seller_id", sellerRow.id)
        .is("seller_archived_at", null)
        .gt("seller_unread_count", 0),
    ]);
    unreadEnquiriesCount = enqCount ?? 0;
    unreadMessagesCount = (unreadConvs ?? []).reduce(
      (sum, r) => sum + (r.seller_unread_count ?? 0),
      0,
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    hasBuyerRole: roles.includes("buyer"),
    userProfile: userProfile ?? null,
    sellerProfile: sellerRow
      ? {
          ...sellerRow,
          resolvedLogoUrl: resolveStorageUrl(sellerRow.logo_url, "seller-logos"),
          resolvedCoverUrl: resolveStorageUrl(sellerRow.cover_image_url, "seller-cover-images"),
        }
      : null,
    unreadEnquiriesCount,
    unreadMessagesCount,
    unreadNotificationsCount: unreadNotifCount ?? 0,
  };
});

// ---------------------------------------------------------------------------
// Dashboard Metrics & Overview (/seller/dashboard)
// ---------------------------------------------------------------------------

export interface SellerDashboardMetrics {
  totalProducts: number;
  publishedProducts: number;
  pendingProducts: number;
  rejectedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  totalEnquiries: number;
  newEnquiries: number;
  respondedEnquiries: number;
  totalQuotations: number;
}

export interface SellerRecentProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price_type: ProductRow["price_type"];
  price: number | null;
  currency: string;
  unit: string;
  stock_status: ProductRow["stock_status"];
  moderation_status: ModerationStatus;
  rejection_reason: string | null;
  updated_at: string;
  categoryName: string | null;
  thumbnailUrl: string | null;
}

export interface SellerRecentEnquiry {
  id: string;
  enquiry_title: string;
  quantity: number;
  unit: string;
  status: EnquiryRow["status"];
  delivery_location: string | null;
  created_at: string;
  buyerName: string;
  productName: string | null;
}

export interface SellerProductPerformanceItem {
  productId: string;
  productName: string;
  productSlug: string;
  moderationStatus: ModerationStatus;
  enquiryCount: number;
  quotationCount: number;
}

export interface SellerActivityItem {
  id: string;
  type: "product" | "enquiry" | "quotation" | "verification";
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
}

export interface SellerDashboardData {
  metrics: SellerDashboardMetrics;
  recentProducts: SellerRecentProduct[];
  recentEnquiries: SellerRecentEnquiry[];
  productPerformance: SellerProductPerformanceItem[];
  recentActivity: SellerActivityItem[];
  documentCount: number;
}

export async function getSellerDashboardData(sellerId: string): Promise<SellerDashboardData> {
  const supabase = await getSupabaseServerClient();

  const [
    productsRes,
    enquiriesRes,
    quotationsRes,
    docsCountRes,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
        id, name, slug, sku, price_type, price, currency, unit, stock_status,
        moderation_status, rejection_reason, created_at, updated_at,
        categories(name),
        product_images(storage_path, is_primary, display_order)
        `,
      )
      .eq("seller_id", sellerId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("enquiries")
      .select(
        `
        id, enquiry_title, quantity, unit, status, delivery_location, created_at, updated_at,
        product_id,
        profiles!enquiries_buyer_id_fkey(full_name, email),
        products(name)
        `,
      )
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("quotations")
      .select("id, enquiry_id, quote_number, total_amount, currency, status, created_at, updated_at")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("seller_verification_documents")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId),
  ]);

  const rawProducts = (productsRes.data ?? []) as unknown as Array<
    Pick<
      ProductRow,
      | "id"
      | "name"
      | "slug"
      | "sku"
      | "price_type"
      | "price"
      | "currency"
      | "unit"
      | "stock_status"
      | "moderation_status"
      | "rejection_reason"
      | "created_at"
      | "updated_at"
    > & {
      categories: { name: string } | null;
      product_images?: Array<{ storage_path: string; is_primary: boolean; display_order: number }>;
    }
  >;

  const rawEnquiries = (enquiriesRes.data ?? []) as unknown as Array<
    Pick<
      EnquiryRow,
      | "id"
      | "enquiry_title"
      | "quantity"
      | "unit"
      | "status"
      | "delivery_location"
      | "created_at"
      | "updated_at"
      | "product_id"
    > & {
      profiles: { full_name: string | null; email: string | null } | null;
      products: { name: string } | null;
    }
  >;

  const rawQuotations = (quotationsRes.data ?? []) as Array<
    Pick<
      QuotationRow,
      | "id"
      | "enquiry_id"
      | "quote_number"
      | "total_amount"
      | "currency"
      | "status"
      | "created_at"
      | "updated_at"
    >
  >;

  const metrics: SellerDashboardMetrics = {
    totalProducts: rawProducts.length,
    publishedProducts: rawProducts.filter((p) => p.moderation_status === "approved").length,
    pendingProducts: rawProducts.filter((p) => p.moderation_status === "pending_review").length,
    rejectedProducts: rawProducts.filter((p) => p.moderation_status === "rejected").length,
    draftProducts: rawProducts.filter((p) => p.moderation_status === "draft").length,
    archivedProducts: rawProducts.filter((p) => p.moderation_status === "archived").length,
    totalEnquiries: rawEnquiries.length,
    newEnquiries: rawEnquiries.filter((e) => e.status === "submitted").length,
    respondedEnquiries: rawEnquiries.filter((e) =>
      ["responding", "quoted", "accepted", "closed"].includes(e.status),
    ).length,
    totalQuotations: rawQuotations.length,
  };

  const recentProducts: SellerRecentProduct[] = rawProducts.slice(0, 5).map((p) => {
    const imgs = [...(p.product_images ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order,
    );
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price_type: p.price_type,
      price: p.price,
      currency: p.currency,
      unit: p.unit,
      stock_status: p.stock_status,
      moderation_status: p.moderation_status,
      rejection_reason: p.rejection_reason,
      updated_at: p.updated_at,
      categoryName: p.categories?.name ?? null,
      thumbnailUrl: resolveStorageUrl(imgs[0]?.storage_path, "product-images"),
    };
  });

  const recentEnquiries: SellerRecentEnquiry[] = rawEnquiries.slice(0, 5).map((e) => ({
    id: e.id,
    enquiry_title: e.enquiry_title,
    quantity: e.quantity,
    unit: e.unit,
    status: e.status,
    delivery_location: e.delivery_location,
    created_at: e.created_at,
    buyerName: e.profiles?.full_name || e.profiles?.email || "Verified Buyer",
    productName: e.products?.name ?? null,
  }));

  // Product performance: real enquiries & quotations per product
  const enquiryCountByProduct = new Map<string, number>();
  const enquiryToProduct = new Map<string, string>();
  for (const e of rawEnquiries) {
    if (e.product_id) {
      enquiryCountByProduct.set(e.product_id, (enquiryCountByProduct.get(e.product_id) ?? 0) + 1);
      enquiryToProduct.set(e.id, e.product_id);
    }
  }

  const quoteCountByProduct = new Map<string, number>();
  for (const q of rawQuotations) {
    const pid = enquiryToProduct.get(q.enquiry_id);
    if (pid) {
      quoteCountByProduct.set(pid, (quoteCountByProduct.get(pid) ?? 0) + 1);
    }
  }

  const productPerformance: SellerProductPerformanceItem[] = rawProducts
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      moderationStatus: p.moderation_status,
      enquiryCount: enquiryCountByProduct.get(p.id) ?? 0,
      quotationCount: quoteCountByProduct.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.enquiryCount - a.enquiryCount || b.quotationCount - a.quotationCount)
    .slice(0, 6);

  // Unified chronological activity stream
  const activity: SellerActivityItem[] = [];
  for (const p of rawProducts.slice(0, 5)) {
    activity.push({
      id: `prod-${p.id}`,
      type: "product",
      title: `Product "${p.name}"`,
      subtitle: `Status: ${p.moderation_status.replace(/_/g, " ")}`,
      timestamp: p.updated_at,
      href: `/seller/products/${p.id}/edit`,
    });
  }
  for (const e of rawEnquiries.slice(0, 5)) {
    activity.push({
      id: `enq-${e.id}`,
      type: "enquiry",
      title: `Enquiry: ${e.enquiry_title}`,
      subtitle: `${e.quantity} ${e.unit} • ${e.status}`,
      timestamp: e.updated_at,
      href: `/seller/enquiries/${e.id}`,
    });
  }
  for (const q of rawQuotations.slice(0, 5)) {
    activity.push({
      id: `quo-${q.id}`,
      type: "quotation",
      title: `Quotation ${q.quote_number}`,
      subtitle: `${q.currency} ${Number(q.total_amount).toLocaleString("en-IN")} • ${q.status}`,
      timestamp: q.updated_at,
      href: `/seller/quotes/${q.id}`,
    });
  }
  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    metrics,
    recentProducts,
    recentEnquiries,
    productPerformance,
    recentActivity: activity.slice(0, 8),
    documentCount: docsCountRes.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Seller Verification Documents (/seller/verification)
// ---------------------------------------------------------------------------

export async function getSellerVerificationDocuments(
  sellerId: string,
): Promise<VerificationDocRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("seller_verification_documents")
    .select("*")
    .eq("seller_id", sellerId)
    .order("uploaded_at", { ascending: false });
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Category Hierarchy Helper (for Product Management & Onboarding)
// ---------------------------------------------------------------------------

export interface CategoryHierarchy {
  all: CategoryItem[];
  parents: CategoryItem[];
  childrenByParent: Record<string, CategoryItem[]>;
}

export async function getAllCategoriesHierarchy(): Promise<CategoryHierarchy> {
  const all = await getActiveCategories();
  const parents = all.filter((c) => !c.parent_id);
  const childrenByParent: Record<string, CategoryItem[]> = {};
  for (const cat of all) {
    if (cat.parent_id) {
      const list = childrenByParent[cat.parent_id] ?? [];
      list.push(cat);
      childrenByParent[cat.parent_id] = list;
    }
  }
  return { all, parents, childrenByParent };
}

// ---------------------------------------------------------------------------
// Seller Products Listing & Detail (/seller/products)
// ---------------------------------------------------------------------------

export interface SellerProductListFilters {
  q?: string;
  status?: string;
  sort?: string;
  page?: string | number;
  pageSize?: number;
}

export interface SellerProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  materialType: string | null;
  colour: string | null;
  finish: string | null;
  priceType: ProductRow["price_type"];
  price: number | null;
  currency: string;
  minimumOrderQuantity: number | null;
  unit: string;
  stockStatus: ProductRow["stock_status"];
  moderationStatus: ModerationStatus;
  rejectionReason: string | null;
  updatedAt: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  imageCount: number;
}

export async function getSellerProducts(
  sellerId: string,
  filters: SellerProductListFilters = {},
): Promise<{
  products: SellerProductListItem[];
  total: number;
  totalPages: number;
  page: number;
  statusCounts: Record<string, number>;
}> {
  const supabase = await getSupabaseServerClient();
  const { page, pageSize, from, to } = parsePagination(filters.page, filters.pageSize ?? 12);

  // Fetch status counts across all of this seller's products
  const { data: allStatuses } = await supabase
    .from("products")
    .select("moderation_status")
    .eq("seller_id", sellerId);

  const statusCounts: Record<string, number> = {
    all: (allStatuses ?? []).length,
    draft: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
  };
  for (const row of allStatuses ?? []) {
    statusCounts[row.moderation_status] = (statusCounts[row.moderation_status] ?? 0) + 1;
  }

  let query = supabase
    .from("products")
    .select(
      `
      id, name, slug, sku, category_id, material_type, colour, finish,
      price_type, price, currency, minimum_order_quantity, unit,
      stock_status, moderation_status, rejection_reason, published_at, updated_at,
      categories(name),
      product_images(id, storage_path, is_primary, display_order)
      `,
      { count: "exact" },
    )
    .eq("seller_id", sellerId);

  if (
    filters.status &&
    ["draft", "pending_review", "approved", "rejected", "archived"].includes(filters.status)
  ) {
    query = query.eq("moderation_status", filters.status as ModerationStatus);
  }

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,material_type.ilike.%${term}%`);
    }
  }

  switch (filters.sort) {
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    case "price_asc":
      query = query.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false, nullsFirst: false });
      break;
    case "created_desc":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
      break;
  }

  const { data, count } = await query.range(from, to);

  const rows = (data ?? []) as unknown as Array<
    ProductRow & {
      categories: { name: string } | null;
      product_images?: Array<{
        id: string;
        storage_path: string;
        is_primary: boolean;
        display_order: number;
      }>;
    }
  >;

  const products: SellerProductListItem[] = rows.map((r) => {
    const sortedImgs = [...(r.product_images ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order,
    );
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      sku: r.sku,
      categoryId: r.category_id,
      categoryName: r.categories?.name ?? null,
      materialType: r.material_type,
      colour: r.colour,
      finish: r.finish,
      priceType: r.price_type,
      price: r.price,
      currency: r.currency,
      minimumOrderQuantity: r.minimum_order_quantity,
      unit: r.unit,
      stockStatus: r.stock_status,
      moderationStatus: r.moderation_status,
      rejectionReason: r.rejection_reason,
      updatedAt: r.updated_at,
      publishedAt: r.published_at,
      thumbnailUrl: resolveStorageUrl(sortedImgs[0]?.storage_path, "product-images"),
      imageCount: sortedImgs.length,
    };
  });

  const total = count ?? 0;
  return {
    products,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
    statusCounts,
  };
}

export interface SellerProductFull extends ProductRow {
  images: Array<ProductImageRow & { url: string | null }>;
  specifications: ProductSpecRow[];
}

export async function getSellerProductById(
  sellerId: string,
  productId: string,
): Promise<SellerProductFull | null> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_images(*),
      product_specifications(*)
      `,
    )
    .eq("id", productId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as ProductRow & {
    product_images?: ProductImageRow[];
    product_specifications?: ProductSpecRow[];
  };

  const images = [...(row.product_images ?? [])]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
    .map((img) => ({
      ...img,
      url: resolveStorageUrl(img.storage_path, "product-images"),
    }));

  const specifications = [...(row.product_specifications ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );

  return {
    ...row,
    images,
    specifications,
  };
}

// ---------------------------------------------------------------------------
// Seller Enquiries (/seller/enquiries & /seller/enquiries/[id])
// ---------------------------------------------------------------------------

export interface SellerEnquiryFilters {
  q?: string;
  status?: string;
  page?: string | number;
  pageSize?: number;
}

export interface SellerEnquiryListItem {
  id: string;
  enquiryTitle: string;
  description: string;
  quantity: number;
  unit: string;
  expectedBudget: number | null;
  currency: string;
  deliveryLocation: string | null;
  requiredDeliveryDate: string | null;
  status: EnquiryRow["status"];
  createdAt: string;
  updatedAt: string;
  buyer: {
    id: string | null;
    fullName: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    isGuest?: boolean;
    companyName?: string | null;
    phone?: string | null;
  };
  product: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export async function getSellerEnquiries(
  sellerId: string,
  filters: SellerEnquiryFilters = {},
): Promise<{
  enquiries: SellerEnquiryListItem[];
  total: number;
  totalPages: number;
  page: number;
  statusCounts: Record<string, number>;
}> {
  const supabase = await getSupabaseServerClient();
  const { page, pageSize, from, to } = parsePagination(filters.page, filters.pageSize ?? 15);

  const { data: allStatuses } = await supabase
    .from("enquiries")
    .select("status")
    .eq("seller_id", sellerId);

  const statusCounts: Record<string, number> = {
    all: (allStatuses ?? []).length,
    submitted: 0,
    viewed: 0,
    responding: 0,
    quoted: 0,
    accepted: 0,
    rejected: 0,
    closed: 0,
    cancelled: 0,
  };
  for (const row of allStatuses ?? []) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  let query = supabase
    .from("enquiries")
    .select(
      `
      *,
      profiles!enquiries_buyer_id_fkey(id, full_name, email, city, state),
      products(id, name, slug)
      `,
      { count: "exact" },
    )
    .eq("seller_id", sellerId);

  if (
    filters.status &&
    [
      "submitted",
      "viewed",
      "responding",
      "quoted",
      "accepted",
      "rejected",
      "closed",
      "cancelled",
    ].includes(filters.status)
  ) {
    query = query.eq("status", filters.status as EnquiryRow["status"]);
  }

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `enquiry_title.ilike.%${term}%,description.ilike.%${term}%,delivery_location.ilike.%${term}%`,
      );
    }
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as unknown as Array<
    EnquiryRow & {
      profiles: {
        id: string;
        full_name: string | null;
        email: string | null;
        city: string | null;
        state: string | null;
      } | null;
      products: { id: string; name: string; slug: string } | null;
    }
  >;

  const enquiries: SellerEnquiryListItem[] = rows.map((r) => ({
    id: r.id,
    enquiryTitle: r.enquiry_title,
    description: r.description,
    quantity: r.quantity,
    unit: r.unit,
    expectedBudget: r.expected_budget,
    currency: r.currency,
    deliveryLocation: r.delivery_location,
    requiredDeliveryDate: r.required_delivery_date,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    buyer: {
      id: r.buyer_id,
      fullName: r.profiles?.full_name ?? r.guest_name ?? (r.buyer_id ? "Registered Buyer" : "Guest Buyer"),
      email: r.profiles?.email ?? r.guest_email ?? null,
      city: r.profiles?.city ?? null,
      state: r.profiles?.state ?? null,
      isGuest: !r.buyer_id,
      companyName: r.guest_company ?? null,
      phone: r.guest_phone ?? null,
    },
    product: r.products,
  }));

  const total = count ?? 0;
  return {
    enquiries,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
    statusCounts,
  };
}

export interface SellerEnquiryAttachment {
  name: string;
  storagePath: string;
  signedUrl: string | null;
  size: number | null;
}

export interface SellerEnquiryDetail {
  enquiry: EnquiryRow;
  buyer: {
    id: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    country: string;
    isGuest?: boolean;
    companyName?: string | null;
  };
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    unit: string;
    price: number | null;
    priceType: ProductRow["price_type"];
    currency: string;
    thumbnailUrl: string | null;
  } | null;
  history: EnquiryHistoryRow[];
  quotations: Array<QuotationRow & { items: QuotationItemRow[] }>;
  attachments: SellerEnquiryAttachment[];
}

export async function getSellerEnquiryDetail(
  sellerId: string,
  enquiryId: string,
): Promise<SellerEnquiryDetail | null> {
  const supabase = await getSupabaseServerClient();

  const { data: enquiryData, error } = await supabase
    .from("enquiries")
    .select(
      `
      *,
      profiles!enquiries_buyer_id_fkey(id, full_name, email, phone, city, state, country),
      products(id, name, slug, sku, unit, price, price_type, currency, product_images(storage_path, is_primary, display_order))
      `,
    )
    .eq("id", enquiryId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error || !enquiryData) return null;

  const row = enquiryData as unknown as EnquiryRow & {
    profiles: {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      city: string | null;
      state: string | null;
      country: string;
    } | null;
    products: {
      id: string;
      name: string;
      slug: string;
      sku: string | null;
      unit: string;
      price: number | null;
      price_type: ProductRow["price_type"];
      currency: string;
      product_images?: Array<{ storage_path: string; is_primary: boolean; display_order: number }>;
    } | null;
  };

  const [{ data: historyRows }, { data: quoteRows }, storageListRes] = await Promise.all([
    supabase
      .from("enquiry_status_history")
      .select("*")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: true }),
    supabase
      .from("quotations")
      .select("*, quotation_items(*)")
      .eq("enquiry_id", enquiryId)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }),
    supabase.storage.from("enquiry-attachments").list(enquiryId, { limit: 20 }),
  ]);

  const attachments: SellerEnquiryAttachment[] = [];
  for (const file of storageListRes.data ?? []) {
    if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
    const storagePath = `${enquiryId}/${file.name}`;
    const { data: signed } = await supabase.storage
      .from("enquiry-attachments")
      .createSignedUrl(storagePath, 300);
    attachments.push({
      name: file.name,
      storagePath,
      signedUrl: signed?.signedUrl ?? null,
      size: typeof file.metadata?.size === "number" ? file.metadata.size : null,
    });
  }

  let productSummary: SellerEnquiryDetail["product"] = null;
  if (row.products) {
    const sortedImgs = [...(row.products.product_images ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order,
    );
    productSummary = {
      id: row.products.id,
      name: row.products.name,
      slug: row.products.slug,
      sku: row.products.sku,
      unit: row.products.unit,
      price: row.products.price,
      priceType: row.products.price_type,
      currency: row.products.currency,
      thumbnailUrl: resolveStorageUrl(sortedImgs[0]?.storage_path, "product-images"),
    };
  }

  const quotations = ((quoteRows ?? []) as unknown as Array<
    QuotationRow & { quotation_items?: QuotationItemRow[] }
  >).map((q) => ({
    ...q,
    items: q.quotation_items ?? [],
  }));

  return {
    enquiry: row,
    buyer: {
      id: row.buyer_id,
      fullName: row.profiles?.full_name ?? (row as unknown as { guest_name?: string }).guest_name ?? (row.buyer_id ? "Registered Buyer" : "Guest Buyer"),
      email: row.profiles?.email ?? (row as unknown as { guest_email?: string }).guest_email ?? null,
      phone: row.profiles?.phone ?? (row as unknown as { guest_phone?: string }).guest_phone ?? null,
      city: row.profiles?.city ?? null,
      state: row.profiles?.state ?? null,
      country: row.profiles?.country ?? "IN",
      isGuest: !row.buyer_id,
      companyName: (row as unknown as { guest_company?: string }).guest_company ?? null,
    },
    product: productSummary,
    history: historyRows ?? [],
    quotations,
    attachments,
  };
}

// ---------------------------------------------------------------------------
// Seller Quotations (/seller/quotes)
// ---------------------------------------------------------------------------

export interface SellerQuotationListItem extends QuotationRow {
  enquiryTitle: string;
  buyerName: string;
  itemCount: number;
}

export async function getSellerQuotations(
  sellerId: string,
  filters: { status?: string; page?: string | number; pageSize?: number } = {},
): Promise<{
  quotations: SellerQuotationListItem[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const supabase = await getSupabaseServerClient();
  const { page, pageSize, from, to } = parsePagination(filters.page, filters.pageSize ?? 15);

  let query = supabase
    .from("quotations")
    .select(
      `
      *,
      enquiries(enquiry_title),
      profiles!quotations_buyer_id_fkey(full_name, email),
      quotation_items(id)
      `,
      { count: "exact" },
    )
    .eq("seller_id", sellerId);

  if (
    filters.status &&
    ["draft", "sent", "viewed", "accepted", "rejected", "expired", "revised", "cancelled"].includes(
      filters.status,
    )
  ) {
    query = query.eq("status", filters.status as QuotationRow["status"]);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as unknown as Array<
    QuotationRow & {
      enquiries: { enquiry_title: string } | null;
      profiles: { full_name: string | null; email: string | null } | null;
      quotation_items?: Array<{ id: string }>;
    }
  >;

  const quotations: SellerQuotationListItem[] = rows.map((r) => ({
    ...r,
    enquiryTitle: r.enquiries?.enquiry_title ?? "Enquiry",
    buyerName: r.profiles?.full_name || r.profiles?.email || "Verified Buyer",
    itemCount: r.quotation_items?.length ?? 0,
  }));

  const total = count ?? 0;
  return {
    quotations,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  };
}

export async function getSellerQuotationById(
  sellerId: string,
  quotationId: string,
): Promise<{
  quotation: QuotationRow;
  items: QuotationItemRow[];
  enquiry: EnquiryRow;
  buyerName: string;
} | null> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("quotations")
    .select(
      `
      *,
      quotation_items(*),
      enquiries(*),
      profiles!quotations_buyer_id_fkey(full_name, email)
      `,
    )
    .eq("id", quotationId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as QuotationRow & {
    quotation_items?: QuotationItemRow[];
    enquiries: EnquiryRow | null;
    profiles: { full_name: string | null; email: string | null } | null;
  };

  if (!row.enquiries) return null;

  return {
    quotation: row,
    items: row.quotation_items ?? [],
    enquiry: row.enquiries,
    buyerName: row.profiles?.full_name || row.profiles?.email || "Verified Buyer",
  };
}

export async function getQuotableEnquiriesForSeller(sellerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("enquiries")
    .select(
      `
      id, enquiry_title, quantity, unit, currency, status, buyer_id, product_id,
      profiles!enquiries_buyer_id_fkey(full_name, email),
      products(id, name, price, unit)
      `,
    )
    .eq("seller_id", sellerId)
    .in("status", ["submitted", "viewed", "responding", "quoted"])
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as Array<{
    id: string;
    enquiry_title: string;
    quantity: number;
    unit: string;
    currency: string;
    status: EnquiryRow["status"];
    buyer_id: string;
    product_id: string | null;
    profiles: { full_name: string | null; email: string | null } | null;
    products: { id: string; name: string; price: number | null; unit: string } | null;
  }>;
}

export async function getSellerCatalogOptions(sellerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, unit, price, price_type, moderation_status")
    .eq("seller_id", sellerId)
    .neq("moderation_status", "archived")
    .order("name", { ascending: true });
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Seller Analytics (/seller/analytics) — 100% Real Data Only
// ---------------------------------------------------------------------------

export interface SellerAnalyticsData {
  productStatusBreakdown: Record<ModerationStatus, number>;
  totalPublishedProducts: number;
  totalProducts: number;
  enquiryStatusBreakdown: Record<EnquiryRow["status"], number>;
  totalEnquiries: number;
  responseRatePct: number | null;
  quoteCoverageRatePct: number | null;
  quoteAcceptanceRatePct: number | null;
  totalQuotationsSent: number;
  totalQuotationsAccepted: number;
  quotedValueInr: number;
  acceptedValueInr: number;
  productPerformance: Array<{
    productId: string;
    name: string;
    slug: string;
    moderationStatus: ModerationStatus;
    enquiriesCount: number;
    quotedEnquiriesCount: number;
    acceptedQuotesCount: number;
  }>;
  recentActivity: SellerActivityItem[];
}

export async function getSellerAnalyticsData(sellerId: string): Promise<SellerAnalyticsData> {
  const supabase = await getSupabaseServerClient();

  const [productsRes, enquiriesRes, quotesRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, moderation_status, updated_at")
      .eq("seller_id", sellerId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("enquiries")
      .select("id, enquiry_title, product_id, quantity, unit, status, updated_at")
      .eq("seller_id", sellerId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("quotations")
      .select("id, enquiry_id, quote_number, total_amount, currency, status, updated_at")
      .eq("seller_id", sellerId)
      .order("updated_at", { ascending: false }),
  ]);

  const products = productsRes.data ?? [];
  const enquiries = enquiriesRes.data ?? [];
  const quotes = quotesRes.data ?? [];

  const productStatusBreakdown: Record<ModerationStatus, number> = {
    draft: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
  };
  for (const p of products) {
    productStatusBreakdown[p.moderation_status] += 1;
  }

  const enquiryStatusBreakdown: Record<EnquiryRow["status"], number> = {
    submitted: 0,
    viewed: 0,
    responding: 0,
    quoted: 0,
    accepted: 0,
    rejected: 0,
    closed: 0,
    cancelled: 0,
  };
  for (const e of enquiries) {
    enquiryStatusBreakdown[e.status] += 1;
  }

  const actionableEnquiries = enquiries.filter((e) => e.status !== "cancelled");
  const respondedCount = actionableEnquiries.filter((e) =>
    ["responding", "quoted", "accepted", "rejected", "closed"].includes(e.status),
  ).length;

  const nonDraftQuotes = quotes.filter((q) => q.status !== "draft" && q.status !== "cancelled");
  const quotedEnquiryIds = new Set(nonDraftQuotes.map((q) => q.enquiry_id));
  const acceptedQuotes = quotes.filter((q) => q.status === "accepted");

  const responseRatePct =
    actionableEnquiries.length > 0
      ? Math.round((respondedCount / actionableEnquiries.length) * 100)
      : null;

  const quoteCoverageRatePct =
    actionableEnquiries.length > 0
      ? Math.round((quotedEnquiryIds.size / actionableEnquiries.length) * 100)
      : null;

  const quoteAcceptanceRatePct =
    nonDraftQuotes.length > 0
      ? Math.round((acceptedQuotes.length / nonDraftQuotes.length) * 100)
      : null;

  const quotedValueInr = nonDraftQuotes
    .filter((q) => q.currency === "INR")
    .reduce((sum, q) => sum + Number(q.total_amount), 0);

  const acceptedValueInr = acceptedQuotes
    .filter((q) => q.currency === "INR")
    .reduce((sum, q) => sum + Number(q.total_amount), 0);

  // Per-product conversion breakdown
  const enquiryToProduct = new Map<string, string>();
  const enqByProduct = new Map<string, number>();
  for (const e of enquiries) {
    if (e.product_id) {
      enquiryToProduct.set(e.id, e.product_id);
      enqByProduct.set(e.product_id, (enqByProduct.get(e.product_id) ?? 0) + 1);
    }
  }

  const quotedEnqByProduct = new Map<string, Set<string>>();
  const acceptedByProduct = new Map<string, number>();
  for (const q of nonDraftQuotes) {
    const pid = enquiryToProduct.get(q.enquiry_id);
    if (!pid) continue;
    const set = quotedEnqByProduct.get(pid) ?? new Set<string>();
    set.add(q.enquiry_id);
    quotedEnqByProduct.set(pid, set);
    if (q.status === "accepted") {
      acceptedByProduct.set(pid, (acceptedByProduct.get(pid) ?? 0) + 1);
    }
  }

  const productPerformance = products
    .map((p) => ({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      moderationStatus: p.moderation_status,
      enquiriesCount: enqByProduct.get(p.id) ?? 0,
      quotedEnquiriesCount: quotedEnqByProduct.get(p.id)?.size ?? 0,
      acceptedQuotesCount: acceptedByProduct.get(p.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.enquiriesCount - a.enquiriesCount || b.acceptedQuotesCount - a.acceptedQuotesCount,
    );

  const recentActivity: SellerActivityItem[] = [
    ...products.slice(0, 4).map((p) => ({
      id: `p-${p.id}`,
      type: "product" as const,
      title: p.name,
      subtitle: `Product • ${p.moderation_status.replace(/_/g, " ")}`,
      timestamp: p.updated_at,
      href: `/seller/products/${p.id}/edit`,
    })),
    ...enquiries.slice(0, 4).map((e) => ({
      id: `e-${e.id}`,
      type: "enquiry" as const,
      title: e.enquiry_title,
      subtitle: `Enquiry • ${e.quantity} ${e.unit} (${e.status})`,
      timestamp: e.updated_at,
      href: `/seller/enquiries/${e.id}`,
    })),
    ...quotes.slice(0, 4).map((q) => ({
      id: `q-${q.id}`,
      type: "quotation" as const,
      title: `Quotation ${q.quote_number}`,
      subtitle: `${q.currency} ${Number(q.total_amount).toLocaleString("en-IN")} (${q.status})`,
      timestamp: q.updated_at,
      href: `/seller/quotes/${q.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return {
    productStatusBreakdown,
    totalPublishedProducts: productStatusBreakdown.approved,
    totalProducts: products.length,
    enquiryStatusBreakdown,
    totalEnquiries: enquiries.length,
    responseRatePct,
    quoteCoverageRatePct,
    quoteAcceptanceRatePct,
    totalQuotationsSent: nonDraftQuotes.length,
    totalQuotationsAccepted: acceptedQuotes.length,
    quotedValueInr,
    acceptedValueInr,
    productPerformance,
    recentActivity,
  };
}

// ---------------------------------------------------------------------------
// Phase 2: Seller Orders Queries (/seller/orders)
// ---------------------------------------------------------------------------

export interface SellerOrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  specifications: Record<string, unknown>;
}

export interface SellerOrderStatusHistoryItem {
  id: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SellerOrderSummary {
  id: string;
  orderNumber: string;
  quotationId: string;
  enquiryId: string;
  buyerId: string;
  buyerFullName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxAmount: number;
  shippingCharges: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  deliveryLocation: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerOrderDetail extends SellerOrderSummary {
  buyerSnapshot: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  sellerSnapshot: {
    businessName?: string;
    gstNumber?: string;
    businessEmail?: string;
    phone?: string;
    businessAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  billingAddress: Record<string, unknown>;
  shippingAddress: Record<string, unknown>;
  terms: string | null;
  notes: string | null;
  items: SellerOrderItem[];
  history: SellerOrderStatusHistoryItem[];
  quotationNumber?: string;
  enquiryTitle?: string;
}

interface OrderBuyerSnapshot {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface OrderSellerSnapshot {
  business_name?: string | null;
  gst_number?: string | null;
  business_email?: string | null;
  phone?: string | null;
  business_address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
}

export interface SellerOrdersResult {
  orders: SellerOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getSellerOrders(options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}): Promise<SellerOrdersResult> {
  const { sellerProfile } = await getSellerContext();
  if (!sellerProfile) {
    return { orders: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  const supabase = await getSupabaseServerClient();
  const { page, pageSize, from, to } = parsePagination(options.page, options.limit, 20);

  let query = supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      quotation_id,
      enquiry_id,
      buyer_id,
      buyer_snapshot,
      status,
      payment_status,
      subtotal,
      tax_amount,
      shipping_charges,
      discount_amount,
      total_amount,
      currency,
      delivery_location,
      created_at,
      updated_at
    `,
      { count: "exact" },
    )
    .eq("seller_id", sellerProfile.id);

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status as OrderStatus);
  }

  if (options.search && options.search.trim()) {
    const s = options.search.trim().replace(/[%_\\]/g, "\\$&");
    query = query.or(`order_number.ilike.%${s}%,delivery_location.ilike.%${s}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("[getSellerOrders] error:", error);
    return { orders: [], total: 0, page, limit: pageSize, totalPages: 0 };
  }

  const orderRows = data ?? [];
  const orderIds = orderRows.map((r) => r.id);
  const { data: itemRows } =
    orderIds.length > 0
      ? await supabase.from("order_items").select("order_id").in("order_id", orderIds)
      : { data: [] };
  const countByOrder = new Map<string, number>();
  (itemRows ?? []).forEach((it) => {
    countByOrder.set(it.order_id, (countByOrder.get(it.order_id) ?? 0) + 1);
  });

  const orders: SellerOrderSummary[] = orderRows.map((row) => {
    const buyerSnap = (row.buyer_snapshot as OrderBuyerSnapshot | null) ?? {};
    return {
      id: row.id,
      orderNumber: row.order_number,
      quotationId: row.quotation_id,
      enquiryId: row.enquiry_id,
      buyerId: row.buyer_id,
      buyerFullName: buyerSnap.full_name || "Verified Buyer",
      buyerEmail: buyerSnap.email || undefined,
      buyerPhone: buyerSnap.phone || undefined,
      status: row.status as OrderStatus,
      paymentStatus: row.payment_status as PaymentStatus,
      subtotal: Number(row.subtotal),
      taxAmount: Number(row.tax_amount),
      shippingCharges: Number(row.shipping_charges),
      discountAmount: Number(row.discount_amount),
      totalAmount: Number(row.total_amount),
      currency: row.currency,
      deliveryLocation: row.delivery_location,
      itemsCount: countByOrder.get(row.id) ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  const total = count ?? 0;
  return {
    orders,
    total,
    page,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getSellerOrderDetail(orderId: string): Promise<SellerOrderDetail | null> {
  const { sellerProfile } = await getSellerContext();
  if (!sellerProfile) {
    return null;
  }

  const supabase = await getSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("seller_id", sellerProfile.id)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const [itemsRes, histRes, quoteRes, enquiryRes] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", row.id),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", row.id)
      .order("created_at", { ascending: true }),
    supabase.from("quotations").select("quote_number").eq("id", row.quotation_id).maybeSingle(),
    supabase.from("enquiries").select("enquiry_title").eq("id", row.enquiry_id).maybeSingle(),
  ]);

  const sellerSnap = (row.seller_snapshot as OrderSellerSnapshot | null) ?? {};
  const buyerSnap = (row.buyer_snapshot as OrderBuyerSnapshot | null) ?? {};

  const items: SellerOrderItem[] = (itemsRes.data ?? []).map((it) => ({
    id: it.id,
    orderId: it.order_id,
    productId: it.product_id,
    description: it.description,
    quantity: Number(it.quantity),
    unit: it.unit,
    unitPrice: Number(it.unit_price),
    totalPrice: Number(it.total_price),
    specifications: (it.specifications as Record<string, unknown>) ?? {},
  }));

  const history: SellerOrderStatusHistoryItem[] = (histRes.data ?? []).map((h) => ({
    id: h.id,
    previousStatus: h.previous_status as OrderStatus | null,
    newStatus: h.new_status as OrderStatus,
    changedBy: h.changed_by,
    notes: h.notes,
    createdAt: h.created_at,
  }));

  return {
    id: row.id,
    orderNumber: row.order_number,
    quotationId: row.quotation_id,
    enquiryId: row.enquiry_id,
    buyerId: row.buyer_id,
    buyerFullName: buyerSnap.full_name || "Verified Buyer",
    buyerEmail: buyerSnap.email || undefined,
    buyerPhone: buyerSnap.phone || undefined,
    status: row.status as OrderStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    shippingCharges: Number(row.shipping_charges),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    deliveryLocation: row.delivery_location,
    itemsCount: items.length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    buyerSnapshot: {
      fullName: buyerSnap.full_name || undefined,
      email: buyerSnap.email || undefined,
      phone: buyerSnap.phone || undefined,
    },
    sellerSnapshot: {
      businessName: sellerSnap.business_name || undefined,
      gstNumber: sellerSnap.gst_number || undefined,
      businessEmail: sellerSnap.business_email || undefined,
      phone: sellerSnap.phone || undefined,
      businessAddress: sellerSnap.business_address || undefined,
      city: sellerSnap.city || undefined,
      state: sellerSnap.state || undefined,
      pincode: sellerSnap.pincode || undefined,
      country: sellerSnap.country || undefined,
    },
    billingAddress: (row.billing_address as Record<string, unknown>) ?? {},
    shippingAddress: (row.shipping_address as Record<string, unknown>) ?? {},
    terms: row.terms,
    notes: row.notes,
    items,
    history,
    quotationNumber: quoteRes.data?.quote_number,
    enquiryTitle: enquiryRes.data?.enquiry_title,
  };
}

