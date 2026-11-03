import "server-only";
import type { OrderStatus, PaymentStatus } from "@stone/types";
import { getAdminContext, type AdminContext } from "./guard";
import { sanitizeAdminSearchTerm } from "@stone/validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminDashboardMetrics {
  users: number;
  users_7d: number;
  suspended_accounts: number;
  buyers: number;
  seller_accounts: number;
  admins: number;
  sellers: number;
  sellers_draft: number;
  sellers_verified: number;
  sellers_pending: number;
  sellers_rejected: number;
  sellers_suspended: number;
  sellers_7d: number;
  products: number;
  products_draft: number;
  products_pending: number;
  products_approved: number;
  products_rejected: number;
  products_archived: number;
  products_7d: number;
  enquiries: number;
  rfqs: number;
  enquiries_7d: number;
  quotations: number;
  quotations_sent: number;
  quotations_accepted: number;
  quotations_rejected: number;
  categories: number;
  generated_at: string;
}

export interface TimeSeriesPoint {
  bucket_date: string;
  bucket_total: number;
}

export interface DistributionPoint {
  label: string;
  total: number;
}

export interface CategoryPerformancePoint {
  category_id: string;
  category_name: string;
  category_slug: string;
  parent_id: string | null;
  total_products: number;
  approved_products: number;
  total_enquiries: number;
}

// ---------------------------------------------------------------------------
// 1. Dashboard queries
// ---------------------------------------------------------------------------

export async function getAdminDashboardData(ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());

  const [
    metricsRes,
    recentProfilesRes,
    recentAuditLogsRes,
    pendingSellersRes,
    pendingProductsRes,
  ] = await Promise.all([
    supabase.rpc("admin_dashboard_metrics"),
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, city, state, account_status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("seller_profiles")
      .select("id, business_name, owner_name, city, state, verification_status, created_at")
      .in("verification_status", ["submitted", "under_review"])
      .order("created_at", { ascending: true })
      .limit(6),
    supabase
      .from("products")
      .select("id, seller_id, name, slug, moderation_status, created_at")
      .eq("moderation_status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(6),
  ]);

  // Fetch roles for recent users
  const recentProfiles = recentProfilesRes.data ?? [];
  const profileIds = recentProfiles.map((p) => p.id);
  const rolesMap = new Map<string, string[]>();

  if (profileIds.length > 0) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", profileIds);

    (roleRows ?? []).forEach((r) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    });
  }

  const recentRegistrations = recentProfiles.map((p) => ({
    ...p,
    roles: rolesMap.get(p.id) ?? [],
  }));

  // Fetch actor profiles for audit logs
  const auditLogs = recentAuditLogsRes.data ?? [];
  const actorIds = Array.from(new Set(auditLogs.map((l) => l.admin_user_id)));
  const actorMap = new Map<string, { full_name: string | null; email: string | null }>();

  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);

    (actors ?? []).forEach((a) => actorMap.set(a.id, a));
  }

  const recentAuditLogs = auditLogs.map((log) => ({
    ...log,
    actor: actorMap.get(log.admin_user_id) ?? null,
  }));

  // Fetch sellers for pending products
  const pendingProductsList = pendingProductsRes.data ?? [];
  const sellerIds = Array.from(new Set(pendingProductsList.map((p) => p.seller_id)));
  const sellerMap = new Map<string, string>();

  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from("seller_profiles")
      .select("id, business_name")
      .in("id", sellerIds);

    (sellers ?? []).forEach((s) => sellerMap.set(s.id, s.business_name));
  }

  const pendingProducts = pendingProductsList.map((p) => ({
    ...p,
    seller_name: sellerMap.get(p.seller_id) ?? "Seller",
  }));

  const metrics = (metricsRes.data as unknown as AdminDashboardMetrics) ?? {
    users: 0,
    users_7d: 0,
    suspended_accounts: 0,
    buyers: 0,
    seller_accounts: 0,
    admins: 0,
    sellers: 0,
    sellers_draft: 0,
    sellers_verified: 0,
    sellers_pending: 0,
    sellers_rejected: 0,
    sellers_suspended: 0,
    sellers_7d: 0,
    products: 0,
    products_draft: 0,
    products_pending: 0,
    products_approved: 0,
    products_rejected: 0,
    products_archived: 0,
    products_7d: 0,
    enquiries: 0,
    rfqs: 0,
    enquiries_7d: 0,
    quotations: 0,
    quotations_sent: 0,
    quotations_accepted: 0,
    quotations_rejected: 0,
    categories: 0,
    generated_at: new Date().toISOString(),
  };

  return {
    metrics,
    recentRegistrations,
    recentAuditLogs,
    pendingSellers: pendingSellersRes.data ?? [],
    pendingProducts,
  };
}

// ---------------------------------------------------------------------------
// 2. Analytics & Reporting
// ---------------------------------------------------------------------------

export async function getAdminAnalytics(days: number = 30, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());
  const safeDays = Math.min(Math.max(days, 7), 365);

  const [
    userSeries,
    sellerSeries,
    productSeries,
    enquirySeries,
    quoteSeries,
    sellerDist,
    productDist,
    enquiryDist,
    categoryDist,
    categoryPerf,
  ] = await Promise.all([
    supabase.rpc("admin_time_series", { _metric: "users", _days: safeDays }),
    supabase.rpc("admin_time_series", { _metric: "sellers", _days: safeDays }),
    supabase.rpc("admin_time_series", { _metric: "products", _days: safeDays }),
    supabase.rpc("admin_time_series", { _metric: "enquiries", _days: safeDays }),
    supabase.rpc("admin_time_series", { _metric: "quotations", _days: safeDays }),
    supabase.rpc("admin_distribution", { _kind: "seller_status" }),
    supabase.rpc("admin_distribution", { _kind: "product_status" }),
    supabase.rpc("admin_distribution", { _kind: "enquiry_status" }),
    supabase.rpc("admin_distribution", { _kind: "category" }),
    supabase.rpc("admin_category_performance"),
  ]);

  return {
    userSeries: (userSeries.data as unknown as TimeSeriesPoint[]) ?? [],
    sellerSeries: (sellerSeries.data as unknown as TimeSeriesPoint[]) ?? [],
    productSeries: (productSeries.data as unknown as TimeSeriesPoint[]) ?? [],
    enquirySeries: (enquirySeries.data as unknown as TimeSeriesPoint[]) ?? [],
    quoteSeries: (quoteSeries.data as unknown as TimeSeriesPoint[]) ?? [],
    sellerDist: (sellerDist.data as unknown as DistributionPoint[]) ?? [],
    productDist: (productDist.data as unknown as DistributionPoint[]) ?? [],
    enquiryDist: (enquiryDist.data as unknown as DistributionPoint[]) ?? [],
    categoryDist: (categoryDist.data as unknown as DistributionPoint[]) ?? [],
    categoryPerf: (categoryPerf.data as unknown as CategoryPerformancePoint[]) ?? [],
  };
}

// ---------------------------------------------------------------------------
// 3. Seller Management
// ---------------------------------------------------------------------------

export interface GetAdminSellersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export async function getAdminSellers(params: GetAdminSellersParams = {}, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 15));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("seller_profiles").select("*", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq(
      "verification_status",
      params.status as "draft" | "submitted" | "under_review" | "verified" | "rejected" | "suspended",
    );
  }

  const sanitized = sanitizeAdminSearchTerm(params.search);
  if (sanitized) {
    query = query.or(
      `business_name.ilike.%${sanitized}%,owner_name.ilike.%${sanitized}%,city.ilike.%${sanitized}%,state.ilike.%${sanitized}%,gst_number.ilike.%${sanitized}%`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: sellers, count, error } = await query;
  if (error) {
    throw new Error(`Failed to load sellers: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    sellers: sellers ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getAdminSellerDetail(sellerId: string, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());

  const [sellerRes, docsRes, productsRes, enquiriesCountRes, auditRes] = await Promise.all([
    supabase
      .from("seller_profiles")
      .select("*")
      .eq("id", sellerId)
      .maybeSingle(),
    supabase
      .from("seller_verification_documents")
      .select("*")
      .eq("seller_id", sellerId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, name, slug, moderation_status, category_id, created_at")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId),
    supabase
      .from("admin_audit_logs")
      .select("*")
      .eq("entity_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!sellerRes.data) {
    return null;
  }

  const seller = sellerRes.data;

  // Fetch user profile for seller
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, account_status, created_at")
    .eq("id", seller.user_id)
    .maybeSingle();

  // Fetch category names for products
  const products = productsRes.data ?? [];
  const categoryIds = Array.from(new Set(products.map((p) => p.category_id).filter(Boolean))) as string[];
  const categoryMap = new Map<string, string>();

  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);

    (categories ?? []).forEach((c) => categoryMap.set(c.id, c.name));
  }

  const recentProducts = products.map((p) => ({
    ...p,
    category_name: p.category_id ? categoryMap.get(p.category_id) || "Uncategorized" : "Uncategorized",
  }));

  // Fetch actors for audit logs
  const auditLogs = auditRes.data ?? [];
  const actorIds = Array.from(new Set(auditLogs.map((l) => l.admin_user_id)));
  const actorMap = new Map<string, { full_name: string | null; email: string | null }>();

  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);

    (actors ?? []).forEach((a) => actorMap.set(a.id, a));
  }

  const auditHistory = auditLogs.map((log) => ({
    ...log,
    actor: actorMap.get(log.admin_user_id) ?? null,
  }));

  // Generate signed URLs for private verification documents
  const docs = await Promise.all(
    (docsRes.data ?? []).map(async (doc) => {
      let signedUrl: string | null = null;
      if (doc.storage_path) {
        const { data: signed } = await supabase.storage
          .from("seller-verification-documents")
          .createSignedUrl(doc.storage_path, 3600);
        signedUrl = signed?.signedUrl ?? null;
      }
      return {
        ...doc,
        signedUrl,
      };
    }),
  );

  return {
    seller,
    user: userProfile,
    documents: docs,
    recentProducts,
    totalEnquiries: enquiriesCountRes.count ?? 0,
    auditHistory,
  };
}

// ---------------------------------------------------------------------------
// 4. Product Management & Moderation
// ---------------------------------------------------------------------------

export interface GetAdminProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  sellerId?: string;
  status?: string;
}

export async function getAdminProducts(params: GetAdminProductsParams = {}, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 15));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("products").select("*", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq(
      "moderation_status",
      params.status as "draft" | "pending_review" | "approved" | "rejected" | "archived",
    );
  }
  if (params.categoryId && params.categoryId !== "all") {
    query = query.eq("category_id", params.categoryId);
  }
  if (params.sellerId) {
    query = query.eq("seller_id", params.sellerId);
  }

  const sanitized = sanitizeAdminSearchTerm(params.search);
  if (sanitized) {
    query = query.or(`name.ilike.%${sanitized}%,material_type.ilike.%${sanitized}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rawProducts, count, error } = await query;
  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  const products = rawProducts ?? [];
  const productIds = products.map((p) => p.id);
  const sellerIds = Array.from(new Set(products.map((p) => p.seller_id)));
  const categoryIds = Array.from(new Set(products.map((p) => p.category_id).filter(Boolean))) as string[];

  const [sellersRes, categoriesRes, imagesRes] = await Promise.all([
    sellerIds.length > 0
      ? supabase.from("seller_profiles").select("id, business_name, verification_status").in("id", sellerIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length > 0
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [] }),
    productIds.length > 0
      ? supabase.from("product_images").select("id, product_id, storage_path, is_primary").in("product_id", productIds)
      : Promise.resolve({ data: [] }),
  ]);

  const sellerMap = new Map((sellersRes.data ?? []).map((s) => [s.id, s]));
  const categoryMap = new Map((categoriesRes.data ?? []).map((c) => [c.id, c]));

  const imageMap = new Map<string, { id: string; storage_path: string; is_primary: boolean }[]>();
  (imagesRes.data ?? []).forEach((img) => {
    const arr = imageMap.get(img.product_id) ?? [];
    arr.push(img);
    imageMap.set(img.product_id, arr);
  });

  const hydratedProducts = products.map((p) => ({
    ...p,
    seller: sellerMap.get(p.seller_id) ?? null,
    category: p.category_id ? categoryMap.get(p.category_id) ?? null : null,
    product_images: imageMap.get(p.id) ?? [],
  }));

  const total = count ?? 0;
  return {
    products: hydratedProducts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getAdminProductDetail(productId: string, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());

  const [productRes, specsRes, imagesRes, auditRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle(),
    supabase
      .from("product_specifications")
      .select("*")
      .eq("product_id", productId),
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("display_order", { ascending: true }),
    supabase
      .from("admin_audit_logs")
      .select("*")
      .eq("entity_id", productId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!productRes.data) {
    return null;
  }

  const product = productRes.data;

  const [sellerRes, categoryRes] = await Promise.all([
    supabase.from("seller_profiles").select("*").eq("id", product.seller_id).maybeSingle(),
    product.category_id
      ? supabase.from("categories").select("*").eq("id", product.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Fetch actors for audit logs
  const auditLogs = auditRes.data ?? [];
  const actorIds = Array.from(new Set(auditLogs.map((l) => l.admin_user_id)));
  const actorMap = new Map<string, { full_name: string | null; email: string | null }>();

  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);

    (actors ?? []).forEach((a) => actorMap.set(a.id, a));
  }

  const auditHistory = auditLogs.map((log) => ({
    ...log,
    actor: actorMap.get(log.admin_user_id) ?? null,
  }));

  return {
    product,
    seller: sellerRes.data,
    category: categoryRes.data,
    specifications: specsRes.data ?? [],
    images: imagesRes.data ?? [],
    auditHistory,
  };
}

// ---------------------------------------------------------------------------
// 5. Buyer Management
// ---------------------------------------------------------------------------

export interface GetAdminBuyersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export async function getAdminBuyers(params: GetAdminBuyersParams = {}, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 15));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Get user_ids with role = 'buyer'
  const { data: buyerRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "buyer");

  const buyerUserIds = Array.from(new Set((buyerRoles ?? []).map((r) => r.user_id)));

  if (buyerUserIds.length === 0) {
    return { buyers: [], total: 0, page, limit, totalPages: 1 };
  }

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, city, state, account_status, created_at", { count: "exact" })
    .in("id", buyerUserIds);

  if (params.status && params.status !== "all") {
    query = query.eq("account_status", params.status as "active" | "pending" | "suspended");
  }

  const sanitized = sanitizeAdminSearchTerm(params.search);
  if (sanitized) {
    query = query.or(
      `full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,city.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: buyers, count, error } = await query;
  if (error) {
    throw new Error(`Failed to load buyers: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    buyers: buyers ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getAdminBuyerDetail(buyerId: string, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());

  const [profileRes, rolesRes, enquiriesRes, auditRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", buyerId)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", buyerId),
    supabase
      .from("enquiries")
      .select("id, product_id, seller_id, status, quantity, unit, description, created_at")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("admin_audit_logs")
      .select("*")
      .eq("entity_id", buyerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!profileRes.data) {
    return null;
  }

  const enquiries = enquiriesRes.data ?? [];
  const enquiryIds = enquiries.map((e) => e.id);
  const sellerIds = Array.from(new Set(enquiries.map((e) => e.seller_id).filter((id): id is string => Boolean(id))));
  const productIds = Array.from(new Set(enquiries.map((e) => e.product_id).filter(Boolean))) as string[];

  const [sellersRes, productsRes, quotesRes] = await Promise.all([
    sellerIds.length > 0
      ? supabase.from("seller_profiles").select("id, business_name").in("id", sellerIds)
      : Promise.resolve({ data: [] }),
    productIds.length > 0
      ? supabase.from("products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] }),
    enquiryIds.length > 0
      ? supabase.from("quotations").select("id, enquiry_id, quote_number, status, total_amount, currency").in("enquiry_id", enquiryIds)
      : Promise.resolve({ data: [] }),
  ]);

  const sellerMap = new Map((sellersRes.data ?? []).map((s) => [s.id, s.business_name]));
  const productMap = new Map((productsRes.data ?? []).map((p) => [p.id, p.name]));

  const quotesByEnquiry = new Map<string, unknown[]>();
  (quotesRes.data ?? []).forEach((q) => {
    const arr = quotesByEnquiry.get(q.enquiry_id) ?? [];
    arr.push(q);
    quotesByEnquiry.set(q.enquiry_id, arr);
  });

  const hydratedEnquiries = enquiries.map((e) => ({
    ...e,
    seller_name: (e.seller_id ? sellerMap.get(e.seller_id) : null) ?? "Supplier",
    product_name: e.product_id ? productMap.get(e.product_id) ?? "Stone Product" : null,
    quotations_count: (quotesByEnquiry.get(e.id) ?? []).length,
  }));

  // Fetch actors for audit logs
  const auditLogs = auditRes.data ?? [];
  const actorIds = Array.from(new Set(auditLogs.map((l) => l.admin_user_id)));
  const actorMap = new Map<string, { full_name: string | null; email: string | null }>();

  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);

    (actors ?? []).forEach((a) => actorMap.set(a.id, a));
  }

  const auditHistory = auditLogs.map((log) => ({
    ...log,
    actor: actorMap.get(log.admin_user_id) ?? null,
  }));

  return {
    buyer: profileRes.data,
    roles: (rolesRes.data ?? []).map((r) => r.role),
    enquiries: hydratedEnquiries,
    auditHistory,
  };
}

// ---------------------------------------------------------------------------
// 6. Enquiry & RFQ Monitoring (Read-Only)
// ---------------------------------------------------------------------------

export interface GetAdminEnquiriesParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: "all" | "rfq" | "direct";
  search?: string;
}

export async function getAdminEnquiries(params: GetAdminEnquiriesParams = {}, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 15));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("enquiries").select("*", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq(
      "status",
      params.status as "submitted" | "viewed" | "responding" | "quoted" | "accepted" | "rejected" | "closed" | "cancelled",
    );
  }

  if (params.type === "rfq") {
    query = query.is("product_id", null);
  } else if (params.type === "direct") {
    query = query.not("product_id", "is", null);
  }

  const sanitized = sanitizeAdminSearchTerm(params.search);
  if (sanitized) {
    query = query.ilike("description", `%${sanitized}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rawEnquiries, count, error } = await query;
  if (error) {
    throw new Error(`Failed to load enquiries: ${error.message}`);
  }

  const enquiries = rawEnquiries ?? [];
  const buyerIds = Array.from(new Set(enquiries.map((e) => e.buyer_id).filter((id): id is string => Boolean(id))));
  const sellerIds = Array.from(new Set(enquiries.map((e) => e.seller_id).filter((id): id is string => Boolean(id))));
  const productIds = Array.from(new Set(enquiries.map((e) => e.product_id).filter((id): id is string => Boolean(id))));
  const enquiryIds = enquiries.map((e) => e.id);

  const [buyersRes, sellersRes, productsRes, quotesRes] = await Promise.all([
    buyerIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email, city, state").in("id", buyerIds)
      : Promise.resolve({ data: [] }),
    sellerIds.length > 0
      ? supabase.from("seller_profiles").select("id, business_name").in("id", sellerIds)
      : Promise.resolve({ data: [] }),
    productIds.length > 0
      ? supabase.from("products").select("id, name, slug").in("id", productIds)
      : Promise.resolve({ data: [] }),
    enquiryIds.length > 0
      ? supabase.from("quotations").select("id, enquiry_id, quote_number").in("enquiry_id", enquiryIds)
      : Promise.resolve({ data: [] }),
  ]);

  const buyerMap = new Map((buyersRes.data ?? []).map((b) => [b.id, b]));
  const sellerMap = new Map((sellersRes.data ?? []).map((s) => [s.id, s.business_name]));
  const productMap = new Map((productsRes.data ?? []).map((p) => [p.id, p]));

  const quoteCountMap = new Map<string, number>();
  (quotesRes.data ?? []).forEach((q) => {
    quoteCountMap.set(q.enquiry_id, (quoteCountMap.get(q.enquiry_id) ?? 0) + 1);
  });

  const hydrated = enquiries.map((e) => ({
    ...e,
    buyer: e.buyer_id
      ? buyerMap.get(e.buyer_id) ?? null
      : {
          id: "guest",
          full_name: e.guest_name ? `${e.guest_name} (Guest)` : "Guest Requester",
          email: e.guest_email ?? null,
          city: null,
          state: null,
        },
    seller_name: (e.seller_id ? sellerMap.get(e.seller_id) : null) ?? (e.specifications as Record<string, string>)?.target_supplier_name ?? "General Platform Lead",
    product: e.product_id ? productMap.get(e.product_id) ?? null : null,
    quotes_count: quoteCountMap.get(e.id) ?? 0,
  }));

  const total = count ?? 0;
  return {
    enquiries: hydrated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getAdminEnquiryDetail(enquiryId: string, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());

  const [enquiryRes, quotationsRes, attachmentsListRes] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*")
      .eq("id", enquiryId)
      .maybeSingle(),
    supabase
      .from("quotations")
      .select("*")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: false }),
    supabase.storage.from("enquiry-attachments").list(enquiryId, { limit: 20 }),
  ]);

  if (!enquiryRes.data) {
    return null;
  }

  const enquiry = enquiryRes.data;

  const [buyerRes, sellerRes, productRes] = await Promise.all([
    enquiry.buyer_id
      ? supabase.from("profiles").select("id, full_name, email, phone, city, state").eq("id", enquiry.buyer_id).maybeSingle()
      : Promise.resolve({
          data: {
            id: "guest",
            full_name: enquiry.guest_name ? `${enquiry.guest_name} (Guest)` : "Guest Requester",
            email: enquiry.guest_email ?? null,
            phone: enquiry.guest_phone ?? null,
            city: null,
            state: null,
          },
        }),
    enquiry.seller_id
      ? supabase.from("seller_profiles").select("id, business_name, owner_name, city, state").eq("id", enquiry.seller_id).maybeSingle()
      : Promise.resolve({
          data: {
            id: "general",
            business_name: (enquiry.specifications as Record<string, string>)?.target_supplier_name ?? "General Platform Lead",
            owner_name: null,
            city: null,
            state: null,
          },
        }),
    enquiry.product_id
      ? supabase.from("products").select("id, name, slug, price, currency, unit").eq("id", enquiry.product_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Generate signed URLs for attachments from storage
  const attachments = await Promise.all(
    (attachmentsListRes.data ?? []).map(async (file) => {
      const storagePath = `${enquiryId}/${file.name}`;
      const { data: signed } = await supabase.storage
        .from("enquiry-attachments")
        .createSignedUrl(storagePath, 3600);

      return {
        id: file.id || file.name,
        file_name: file.name,
        file_size: file.metadata?.size || 0,
        signedUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  return {
    enquiry,
    buyer: buyerRes.data,
    seller: sellerRes.data,
    product: productRes.data,
    quotations: quotationsRes.data ?? [],
    attachments,
  };
}

// ---------------------------------------------------------------------------
// 7. Quotation Monitoring (Strictly Read-Only)
// ---------------------------------------------------------------------------

export interface GetAdminQuotationsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export async function getAdminQuotations(params: GetAdminQuotationsParams = {}, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 15));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("quotations").select("*", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq(
      "status",
      params.status as "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "revised" | "cancelled",
    );
  }

  const sanitized = sanitizeAdminSearchTerm(params.search);
  if (sanitized) {
    query = query.ilike("quote_number", `%${sanitized}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rawQuotes, count, error } = await query;
  if (error) {
    throw new Error(`Failed to load quotations: ${error.message}`);
  }

  const quotes = rawQuotes ?? [];
  const sellerIds = Array.from(new Set(quotes.map((q) => q.seller_id)));
  const buyerIds = Array.from(new Set(quotes.map((q) => q.buyer_id)));

  const [sellersRes, buyersRes] = await Promise.all([
    sellerIds.length > 0
      ? supabase.from("seller_profiles").select("id, business_name").in("id", sellerIds)
      : Promise.resolve({ data: [] }),
    buyerIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", buyerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const sellerMap = new Map((sellersRes.data ?? []).map((s) => [s.id, s.business_name]));
  const buyerMap = new Map((buyersRes.data ?? []).map((b) => [b.id, b]));

  const hydrated = quotes.map((q) => ({
    ...q,
    seller_name: sellerMap.get(q.seller_id) ?? "Supplier",
    buyer: buyerMap.get(q.buyer_id) ?? null,
  }));

  const total = count ?? 0;
  return {
    quotations: hydrated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getAdminQuotationDetail(quotationId: string, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());

  const [quoteRes, itemsRes] = await Promise.all([
    supabase
      .from("quotations")
      .select("*")
      .eq("id", quotationId)
      .maybeSingle(),
    supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotationId),
  ]);

  if (!quoteRes.data) {
    return null;
  }

  const quote = quoteRes.data;

  const [sellerRes, buyerRes, enquiryRes] = await Promise.all([
    supabase.from("seller_profiles").select("id, business_name, owner_name, gst_number, city, state").eq("id", quote.seller_id).maybeSingle(),
    supabase.from("profiles").select("id, full_name, email, phone").eq("id", quote.buyer_id).maybeSingle(),
    supabase.from("enquiries").select("id, quantity, unit, description, status").eq("id", quote.enquiry_id).maybeSingle(),
  ]);

  return {
    quotation: quote,
    seller: sellerRes.data,
    buyer: buyerRes.data,
    enquiry: enquiryRes.data,
    items: itemsRes.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// 8. Categories Management
// ---------------------------------------------------------------------------

export async function getAdminCategories(ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());

  const [categoriesRes, performanceRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, description, image_url, parent_id, display_order, is_active, created_at, updated_at")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.rpc("admin_category_performance"),
  ]);

  const categories = categoriesRes.data ?? [];
  const perfMap = new Map<string, CategoryPerformancePoint>();
  ((performanceRes.data as unknown as CategoryPerformancePoint[]) ?? []).forEach((p) => {
    perfMap.set(p.category_id, p);
  });

  const categoriesWithStats = categories.map((cat) => {
    const stats = perfMap.get(cat.id);
    return {
      ...cat,
      total_products: stats?.total_products ?? 0,
      approved_products: stats?.approved_products ?? 0,
      total_enquiries: stats?.total_enquiries ?? 0,
    };
  });

  return categoriesWithStats;
}

export async function getAdminCategoryById(categoryId: string, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

// ---------------------------------------------------------------------------
// 9. Users & Admin Management
// ---------------------------------------------------------------------------

export interface GetAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export async function getAdminUsers(params: GetAdminUsersParams = {}, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 15));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let userIds: string[] | null = null;
  if (params.role && params.role !== "all") {
    const { data: roleUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", params.role as "buyer" | "seller" | "admin" | "super_admin");

    userIds = Array.from(new Set((roleUsers ?? []).map((r) => r.user_id)));
    if (userIds.length === 0) {
      return { users: [], total: 0, page, limit, totalPages: 1 };
    }
  }

  let query = supabase.from("profiles").select("*", { count: "exact" });

  if (userIds) {
    query = query.in("id", userIds);
  }

  const sanitized = sanitizeAdminSearchTerm(params.search);
  if (sanitized) {
    query = query.or(
      `full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,city.ilike.%${sanitized}%`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rawUsers, count, error } = await query;
  if (error) {
    throw new Error(`Failed to load users: ${error.message}`);
  }

  const users = rawUsers ?? [];
  const fetchedIds = users.map((u) => u.id);
  const rolesMap = new Map<string, { role: string }[]>();

  if (fetchedIds.length > 0) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", fetchedIds);

    (roles ?? []).forEach((r) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push({ role: r.role });
      rolesMap.set(r.user_id, arr);
    });
  }

  const hydrated = users.map((u) => ({
    ...u,
    user_roles: rolesMap.get(u.id) ?? [],
  }));

  const total = count ?? 0;
  return {
    users: hydrated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// ---------------------------------------------------------------------------
// 10. Audit Logs
// ---------------------------------------------------------------------------

export interface GetAdminAuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  search?: string;
}

export async function getAdminAuditLogs(params: GetAdminAuditLogsParams = {}, ctx?: AdminContext) {
  const { supabase } = ctx ?? (await getAdminContext());
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("admin_audit_logs").select("*", { count: "exact" });

  if (params.action && params.action !== "all") {
    query = query.eq("action", params.action);
  }
  if (params.entityType && params.entityType !== "all") {
    query = query.eq("entity_type", params.entityType);
  }

  const sanitized = sanitizeAdminSearchTerm(params.search);
  if (sanitized) {
    query = query.ilike("action", `%${sanitized}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rawLogs, count, error } = await query;
  if (error) {
    throw new Error(`Failed to load audit logs: ${error.message}`);
  }

  const logs = rawLogs ?? [];
  const actorIds = Array.from(new Set(logs.map((l) => l.admin_user_id)));
  const actorMap = new Map<string, { id: string; full_name: string | null; email: string | null }>();

  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);

    (actors ?? []).forEach((a) => actorMap.set(a.id, a));
  }

  const hydrated = logs.map((log) => ({
    ...log,
    actor: actorMap.get(log.admin_user_id) ?? null,
  }));

  const total = count ?? 0;
  return {
    logs: hydrated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// ---------------------------------------------------------------------------
// 11. Platform Settings
// ---------------------------------------------------------------------------

export interface PlatformSettingRow {
  key: "marketplace" | "contact" | "homepage" | "seo";
  value: Record<string, unknown>;
  is_public: boolean;
  updated_by: string | null;
  updated_at: string;
}

export async function getAdminPlatformSettings(ctx?: AdminContext): Promise<Record<string, PlatformSettingRow>> {
  const { supabase } = ctx ?? (await getAdminContext());

  const { data, error } = await supabase
    .from("platform_settings")
    .select("*");

  if (error) {
    throw new Error(`Failed to load platform settings: ${error.message}`);
  }

  const map: Record<string, PlatformSettingRow> = {};
  (data ?? []).forEach((row) => {
    map[row.key] = row as unknown as PlatformSettingRow;
  });

  return map;
}

// ---------------------------------------------------------------------------
// 12. Phase 2: Platform Orders Monitoring
// ---------------------------------------------------------------------------

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  quotationId: string;
  enquiryId: string;
  buyerId: string;
  buyerFullName: string;
  sellerId: string;
  sellerBusinessName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  deliveryLocation: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderDetail extends AdminOrderSummary {
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
  subtotal: number;
  taxAmount: number;
  shippingCharges: number;
  discountAmount: number;
  terms: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    specifications: Record<string, unknown>;
  }>;
  history: Array<{
    id: string;
    previousStatus: OrderStatus | null;
    newStatus: OrderStatus;
    changedBy: string | null;
    notes: string | null;
    createdAt: string;
  }>;
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

export async function getAdminOrders(
  options: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
  ctx?: AdminContext,
): Promise<{
  orders: AdminOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { supabase } = ctx ?? (await getAdminContext());
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

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
      seller_id,
      seller_snapshot,
      status,
      payment_status,
      total_amount,
      currency,
      delivery_location,
      created_at,
      updated_at
    `,
      { count: "exact" },
    );

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
    console.error("[getAdminOrders] error:", error);
    return { orders: [], total: 0, page, limit, totalPages: 0 };
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

  const orders: AdminOrderSummary[] = orderRows.map((row) => {
    const buyerSnap = (row.buyer_snapshot as OrderBuyerSnapshot | null) ?? {};
    const sellerSnap = (row.seller_snapshot as OrderSellerSnapshot | null) ?? {};
    return {
      id: row.id,
      orderNumber: row.order_number,
      quotationId: row.quotation_id,
      enquiryId: row.enquiry_id,
      buyerId: row.buyer_id,
      buyerFullName: buyerSnap.full_name || "Buyer",
      sellerId: row.seller_id,
      sellerBusinessName: sellerSnap.business_name || "Supplier",
      status: row.status as OrderStatus,
      paymentStatus: row.payment_status as PaymentStatus,
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
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAdminOrderDetail(
  orderId: string,
  ctx?: AdminContext,
): Promise<AdminOrderDetail | null> {
  const { supabase } = ctx ?? (await getAdminContext());

  const { data: row, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const [itemsRes, histRes] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", row.id),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", row.id)
      .order("created_at", { ascending: true }),
  ]);

  const buyerSnap = (row.buyer_snapshot as OrderBuyerSnapshot | null) ?? {};
  const sellerSnap = (row.seller_snapshot as OrderSellerSnapshot | null) ?? {};

  const items = (itemsRes.data ?? []).map((it) => ({
    id: it.id,
    description: it.description,
    quantity: Number(it.quantity),
    unit: it.unit,
    unitPrice: Number(it.unit_price),
    totalPrice: Number(it.total_price),
    specifications: (it.specifications as Record<string, unknown>) ?? {},
  }));

  const history = (histRes.data ?? []).map((h) => ({
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
    buyerFullName: buyerSnap.full_name || "Buyer",
    sellerId: row.seller_id,
    sellerBusinessName: sellerSnap.business_name || "Supplier",
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
  };
}
