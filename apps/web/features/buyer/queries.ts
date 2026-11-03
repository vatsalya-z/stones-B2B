import "server-only";
import { cache } from "react";
import type { Database } from "@stone/database";
import type {
  AccountStatus,
  EnquiryStatus,
  OrderStatus,
  PaymentStatus,
  PriceType,
  QuotationStatus,
} from "@stone/types";
import { parsePagination } from "@stone/utils";
import { getCurrentUser, getUserRoles, requireBuyer, type AppRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  getActiveCategories,
  resolveStorageUrl,
  type CategoryItem,
} from "@/lib/db";
import { getProductFallbackImage, getSupplierFallbackLogo } from "@/lib/images";
import {
  analyzeQuotationComparison,
  decodeBuyerAddress,
  decodeRfqDescription,
  parseQuotationCommercialTerms,
  type ComparableQuotationInput,
  type DecodedBuyerAddress,
  type ParsedCommercialTerms,
  type QuotationComparisonAnalysis,
  type RfqSpecificationMeta,
} from "./buyer-meta";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EnquiryRow = Database["public"]["Tables"]["enquiries"]["Row"];
type EnquiryHistoryRow = Database["public"]["Tables"]["enquiry_status_history"]["Row"];
type QuotationRow = Database["public"]["Tables"]["quotations"]["Row"];
type QuotationItemRow = Database["public"]["Tables"]["quotation_items"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type PublicSellerRow = Database["public"]["Views"]["public_seller_profiles"]["Row"];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

export interface PublicSupplierSummary {
  id: string;
  businessName: string;
  slug: string | null;
  businessType: string;
  city: string | null;
  state: string | null;
  country: string;
  website: string | null;
  yearsInBusiness: number | null;
  logoUrl: string | null;
  isVerified: boolean;
}

const fallbackGeneralSupplier: PublicSupplierSummary = {
  id: "general-rfq",
  businessName: "StonesDekho Trade Desk",
  slug: null,
  businessType: "marketplace",
  city: "Verified Network",
  state: null,
  country: "India",
  website: null,
  yearsInBusiness: null,
  logoUrl: null,
  isVerified: true,
};

export interface ProductSnapshotSummary {
  id: string;
  name: string;
  slug: string;
  materialType: string | null;
  colour: string | null;
  finish: string | null;
  stoneOrigin: string | null;
  thickness: number | null;
  length: number | null;
  width: number | null;
  priceType: PriceType;
  price: number | null;
  currency: string;
  unit: string;
  categoryName: string | null;
  categorySlug: string | null;
  primaryImage: string | null;
  sellerId: string;
}

export interface BuyerContext {
  user: {
    id: string;
    email: string | null;
    emailVerified: boolean;
    lastSignInAt: string | null;
    createdAt: string | null;
  };
  roles: AppRole[];
  hasSellerRole: boolean;
  profile: ProfileRow | null;
  extendedAddress: DecodedBuyerAddress;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  pendingQuotationsCount: number;
}

/**
 * Request-cached buyer session & profile context.
 * Enforces `buyer` RBAC role server-side via `requireBuyer()`.
 */
export const getBuyerContext = cache(async (): Promise<BuyerContext> => {
  const user = await requireBuyer();
  const supabase = await getSupabaseServerClient();

  const [
    roles,
    { data: profile },
    { count: unreadCount },
    { count: pendingQuotes },
    { data: unreadConvRows },
  ] = await Promise.all([
    getUserRoles(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", user.id)
      .eq("status", "sent"),
    supabase
      .from("conversations")
      .select("buyer_unread_count")
      .eq("buyer_id", user.id)
      .is("buyer_archived_at", null)
      .gt("buyer_unread_count", 0),
  ]);

  const unreadMessagesCount = (unreadConvRows ?? []).reduce(
    (sum, r) => sum + (r.buyer_unread_count ?? 0),
    0,
  );

  return {
    user: {
      id: user.id,
      email: user.email ?? profile?.email ?? null,
      emailVerified: Boolean(user.email_confirmed_at),
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at ?? profile?.created_at ?? null,
    },
    roles,
    hasSellerRole: roles.includes("seller"),
    profile: profile ?? null,
    extendedAddress: decodeBuyerAddress(profile?.address),
    unreadNotificationsCount: unreadCount ?? 0,
    unreadMessagesCount,
    pendingQuotationsCount: pendingQuotes ?? 0,
  };
});

// ---------------------------------------------------------------------------
// Internal Batch Hydrators (Zero N+1 Queries, Strictly RLS-Safe)
// ---------------------------------------------------------------------------

async function batchLoadPublicSellers(
  sellerIds: ReadonlyArray<string>,
): Promise<Map<string, PublicSupplierSummary>> {
  const unique = Array.from(new Set(sellerIds.filter((id) => UUID_REGEX.test(id))));
  const map = new Map<string, PublicSupplierSummary>();
  if (unique.length === 0) return map;

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("public_seller_profiles")
    .select("*")
    .in("id", unique);

  for (const row of (data ?? []) as PublicSellerRow[]) {
    map.set(row.id, {
      id: row.id,
      businessName: row.business_name,
      slug: row.slug,
      businessType: row.business_type,
      city: row.city,
      state: row.state,
      country: row.country,
      website: row.website,
      yearsInBusiness: row.years_in_business,
      logoUrl:
        resolveStorageUrl(row.logo_url, "seller-logos") ??
        getSupplierFallbackLogo(row.slug),
      isVerified: true,
    });
  }

  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, {
        id,
        businessName: "Registered Stone Supplier",
        slug: null,
        businessType: "stone_supplier",
        city: null,
        state: null,
        country: "IN",
        website: null,
        yearsInBusiness: null,
        logoUrl: null,
        isVerified: false,
      });
    }
  }

  return map;
}

async function batchLoadProducts(
  productIds: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, ProductSnapshotSummary>> {
  const unique = Array.from(
    new Set(productIds.filter((id): id is string => Boolean(id && UUID_REGEX.test(id)))),
  );
  const map = new Map<string, ProductSnapshotSummary>();
  if (unique.length === 0) return map;

  const supabase = await getSupabaseServerClient();
  const [{ data: products }, { data: images }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, seller_id, category_id, name, slug, material_type, colour, finish, stone_origin, thickness, length, width, price_type, price, currency, unit",
      )
      .in("id", unique),
    supabase
      .from("product_images")
      .select("product_id, storage_path, is_primary, display_order")
      .in("product_id", unique)
      .order("display_order", { ascending: true }),
  ]);

  const categoryIds = Array.from(
    new Set(
      (products ?? [])
        .map((p) => p.category_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const categoryMap = new Map<string, { name: string; slug: string }>();
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, slug")
      .in("id", categoryIds);
    for (const c of cats ?? []) {
      categoryMap.set(c.id, { name: c.name, slug: c.slug });
    }
  }

  const imageMap = new Map<string, string>();
  for (const img of images ?? []) {
    const resolved = resolveStorageUrl(img.storage_path, "product-images");
    if (!resolved) continue;
    if (img.is_primary || !imageMap.has(img.product_id)) {
      imageMap.set(img.product_id, resolved);
    }
  }

  for (const p of products ?? []) {
    const cat = p.category_id ? categoryMap.get(p.category_id) : null;
    map.set(p.id, {
      id: p.id,
      name: p.name,
      slug: p.slug,
      materialType: p.material_type,
      colour: p.colour,
      finish: p.finish,
      stoneOrigin: p.stone_origin,
      thickness: p.thickness,
      length: p.length,
      width: p.width,
      priceType: p.price_type as PriceType,
      price: p.price,
      currency: p.currency,
      unit: p.unit,
      categoryName: cat?.name ?? null,
      categorySlug: cat?.slug ?? null,
      primaryImage:
        imageMap.get(p.id) ?? getProductFallbackImage(p.slug, p.material_type),
      sellerId: p.seller_id,
    });
  }

  return map;
}

// ---------------------------------------------------------------------------
// 1. Buyer Dashboard (/buyer/dashboard)
// ---------------------------------------------------------------------------

export interface BuyerDashboardMetrics {
  totalEnquiries: number;
  activeEnquiries: number;
  pendingResponses: number;
  receivedQuotations: number;
  acceptedQuotations: number;
  rejectedOrClosedEnquiries: number;
}

export interface BuyerEnquiryListItem {
  id: string;
  referenceCode: string;
  enquiryTitle: string;
  quantity: number;
  unit: string;
  expectedBudget: number | null;
  currency: string;
  deliveryLocation: string | null;
  requiredDeliveryDate: string | null;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
  isRfq: boolean;
  rfqMode: "product" | "general" | null;
  product: ProductSnapshotSummary | null;
  seller: PublicSupplierSummary;
  quotationsCount: number;
}

export interface BuyerQuotationListItem {
  id: string;
  quoteNumber: string;
  enquiryId: string;
  enquiryTitle: string;
  enquiryReference: string;
  seller: PublicSupplierSummary;
  subtotal: number;
  taxAmount: number;
  shippingCharges: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  validUntil: string | null;
  status: QuotationStatus;
  createdAt: string;
}

export interface BuyerSavedProductItem {
  favouriteId: string;
  productId: string;
  savedAt: string;
  isAvailable: boolean;
  product: ProductSnapshotSummary | null;
  seller: PublicSupplierSummary | null;
}

export interface BuyerActivityEntry {
  id: string;
  kind: "enquiry" | "quotation";
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
}

export interface BuyerDashboardData {
  metrics: BuyerDashboardMetrics;
  recentEnquiries: BuyerEnquiryListItem[];
  recentQuotations: BuyerQuotationListItem[];
  savedProducts: BuyerSavedProductItem[];
  recentActivity: BuyerActivityEntry[];
}

export function formatEnquiryReference(id: string): string {
  return `ENQ-${id.slice(0, 8).toUpperCase()}`;
}

export async function getBuyerDashboardData(buyerId: string): Promise<BuyerDashboardData> {
  const supabase = await getSupabaseServerClient();

  const [
    { count: totalEnquiries },
    { count: activeEnquiries },
    { count: pendingResponses },
    { count: rejectedOrClosedEnquiries },
    { count: receivedQuotations },
    { count: acceptedQuotations },
    { data: recentEnquiryRows },
    { data: recentQuotationRows },
    savedList,
  ] = await Promise.all([
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .in("status", ["submitted", "viewed", "responding", "quoted"]),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .in("status", ["submitted", "viewed", "responding"]),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .in("status", ["rejected", "closed", "cancelled"]),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .neq("status", "draft"),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .eq("status", "accepted"),
    supabase
      .from("enquiries")
      .select("*")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("quotations")
      .select("*")
      .eq("buyer_id", buyerId)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(5),
    getBuyerFavourites(buyerId, 4),
  ]);

  const enquiries = (recentEnquiryRows ?? []) as EnquiryRow[];
  const quotations = (recentQuotationRows ?? []) as QuotationRow[];

  const allSellerIds = [
    ...enquiries.map((e) => e.seller_id).filter((id): id is string => Boolean(id)),
    ...quotations.map((q) => q.seller_id),
  ];
  const allProductIds = enquiries.map((e) => e.product_id);
  const quoteEnquiryIds = Array.from(new Set(quotations.map((q) => q.enquiry_id)));

  const [sellerMap, productMap, { data: quoteEnquiries }, { data: enquiryQuoteRows }] =
    await Promise.all([
      batchLoadPublicSellers(allSellerIds),
      batchLoadProducts(allProductIds),
      quoteEnquiryIds.length > 0
        ? supabase
            .from("enquiries")
            .select("id, enquiry_title")
            .eq("buyer_id", buyerId)
            .in("id", quoteEnquiryIds)
        : Promise.resolve({ data: [] as Array<{ id: string; enquiry_title: string }> }),
      enquiries.length > 0
        ? supabase
            .from("quotations")
            .select("enquiry_id")
            .eq("buyer_id", buyerId)
            .neq("status", "draft")
            .in(
              "enquiry_id",
              enquiries.map((e) => e.id),
            )
        : Promise.resolve({ data: [] as Array<{ enquiry_id: string }> }),
    ]);

  const enquiryTitleMap = new Map<string, string>();
  for (const e of quoteEnquiries ?? []) {
    enquiryTitleMap.set(e.id, e.enquiry_title);
  }
  for (const e of enquiries) {
    enquiryTitleMap.set(e.id, e.enquiry_title);
  }

  const quoteCountMap = new Map<string, number>();
  for (const row of enquiryQuoteRows ?? []) {
    quoteCountMap.set(row.enquiry_id, (quoteCountMap.get(row.enquiry_id) ?? 0) + 1);
  }

  const recentEnquiries: BuyerEnquiryListItem[] = enquiries.map((e) => {
    const rfq = decodeRfqDescription(e.description);
    return {
      id: e.id,
      referenceCode: formatEnquiryReference(e.id),
      enquiryTitle: e.enquiry_title,
      quantity: Number(e.quantity),
      unit: e.unit,
      expectedBudget: e.expected_budget !== null ? Number(e.expected_budget) : null,
      currency: e.currency,
      deliveryLocation: e.delivery_location,
      requiredDeliveryDate: e.required_delivery_date,
      status: e.status as EnquiryStatus,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      isRfq: rfq.isRfq || e.product_id === null,
      rfqMode: rfq.rfqMode ?? (e.product_id === null ? "general" : null),
      product: e.product_id ? (productMap.get(e.product_id) ?? null) : null,
      seller: (e.seller_id ? sellerMap.get(e.seller_id) : null) ?? fallbackGeneralSupplier,
      quotationsCount: quoteCountMap.get(e.id) ?? 0,
    };
  });

  const recentQuotations: BuyerQuotationListItem[] = quotations.map((q) => ({
    id: q.id,
    quoteNumber: q.quote_number,
    enquiryId: q.enquiry_id,
    enquiryTitle: enquiryTitleMap.get(q.enquiry_id) ?? "Stone Requirement",
    enquiryReference: formatEnquiryReference(q.enquiry_id),
    seller: sellerMap.get(q.seller_id)!,
    subtotal: Number(q.subtotal),
    taxAmount: Number(q.tax_amount),
    shippingCharges: Number(q.shipping_charges),
    discountAmount: Number(q.discount_amount),
    totalAmount: Number(q.total_amount),
    currency: q.currency,
    validUntil: q.valid_until,
    status: q.status as QuotationStatus,
    createdAt: q.created_at,
  }));

  const recentActivity: BuyerActivityEntry[] = [
    ...recentEnquiries.map((e) => ({
      id: `enq-${e.id}`,
      kind: "enquiry" as const,
      title: e.isRfq ? `Submitted RFQ: ${e.enquiryTitle}` : `Sent Enquiry: ${e.enquiryTitle}`,
      subtitle: `${e.seller.businessName} • Status: ${e.status.replace(/_/g, " ")}`,
      timestamp: e.updatedAt || e.createdAt,
      href: e.isRfq ? `/buyer/rfqs/${e.id}` : `/buyer/enquiries/${e.id}`,
    })),
    ...recentQuotations.map((q) => ({
      id: `quo-${q.id}`,
      kind: "quotation" as const,
      title: `Quotation ${q.quoteNumber} (${q.status})`,
      subtitle: `${q.seller.businessName} • ${q.enquiryTitle}`,
      timestamp: q.createdAt,
      href: `/buyer/quotes/${q.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return {
    metrics: {
      totalEnquiries: totalEnquiries ?? 0,
      activeEnquiries: activeEnquiries ?? 0,
      pendingResponses: pendingResponses ?? 0,
      receivedQuotations: receivedQuotations ?? 0,
      acceptedQuotations: acceptedQuotations ?? 0,
      rejectedOrClosedEnquiries: rejectedOrClosedEnquiries ?? 0,
    },
    recentEnquiries,
    recentQuotations,
    savedProducts: savedList,
    recentActivity,
  };
}

// ---------------------------------------------------------------------------
// 2. Buyer Enquiries & RFQs List (/buyer/enquiries & /buyer/rfqs)
// ---------------------------------------------------------------------------

export interface BuyerEnquiryFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
  rfqOnly?: boolean;
}

export interface PaginatedBuyerEnquiries {
  items: BuyerEnquiryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getBuyerEnquiries(
  buyerId: string,
  filters: BuyerEnquiryFilters = {},
): Promise<PaginatedBuyerEnquiries> {
  const supabase = await getSupabaseServerClient();
  const { page, pageSize, from, to } = parsePagination(
    filters.page ?? 1,
    filters.pageSize ?? 10,
    10,
  );

  let query = supabase
    .from("enquiries")
    .select("*", { count: "exact" })
    .eq("buyer_id", buyerId);

  if (filters.rfqOnly) {
    query = query.or(
      "product_id.is.null,description.ilike.%RFQ Technical & Delivery Specifications%",
    );
  }

  if (filters.search?.trim()) {
    query = query.ilike("enquiry_title", `%${escapeLike(filters.search.trim())}%`);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as EnquiryStatus);
  }

  if (filters.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom)) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo)) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  query = query
    .order("created_at", { ascending: filters.sort === "oldest" })
    .range(from, to);

  const { data: rows, count } = await query;
  const enquiries = (rows ?? []) as EnquiryRow[];
  const total = count ?? 0;

  const [sellerMap, productMap, { data: quoteRows }] = await Promise.all([
    batchLoadPublicSellers(enquiries.map((e) => e.seller_id).filter((id): id is string => Boolean(id))),
    batchLoadProducts(enquiries.map((e) => e.product_id)),
    enquiries.length > 0
      ? supabase
          .from("quotations")
          .select("enquiry_id")
          .eq("buyer_id", buyerId)
          .neq("status", "draft")
          .in(
            "enquiry_id",
            enquiries.map((e) => e.id),
          )
      : Promise.resolve({ data: [] as Array<{ enquiry_id: string }> }),
  ]);

  const quoteCounts = new Map<string, number>();
  for (const r of quoteRows ?? []) {
    quoteCounts.set(r.enquiry_id, (quoteCounts.get(r.enquiry_id) ?? 0) + 1);
  }

  const items: BuyerEnquiryListItem[] = enquiries.map((e) => {
    const rfq = decodeRfqDescription(e.description);
    return {
      id: e.id,
      referenceCode: formatEnquiryReference(e.id),
      enquiryTitle: e.enquiry_title,
      quantity: Number(e.quantity),
      unit: e.unit,
      expectedBudget: e.expected_budget !== null ? Number(e.expected_budget) : null,
      currency: e.currency,
      deliveryLocation: e.delivery_location,
      requiredDeliveryDate: e.required_delivery_date,
      status: e.status as EnquiryStatus,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      isRfq: rfq.isRfq || e.product_id === null,
      rfqMode: rfq.rfqMode ?? (e.product_id === null ? "general" : null),
      product: e.product_id ? (productMap.get(e.product_id) ?? null) : null,
      seller: (e.seller_id ? sellerMap.get(e.seller_id) : null) ?? fallbackGeneralSupplier,
      quotationsCount: quoteCounts.get(e.id) ?? 0,
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// 3. Buyer Enquiry & RFQ Detail (/buyer/enquiries/[id] & /buyer/rfqs/[id])
// ---------------------------------------------------------------------------

export interface EnquiryAttachmentItem {
  name: string;
  storagePath: string;
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: string | null;
  signedUrl: string | null;
}

export interface BuyerEnquiryDetailData {
  enquiry: EnquiryRow;
  referenceCode: string;
  rfqMeta: RfqSpecificationMeta;
  product: ProductSnapshotSummary | null;
  seller: PublicSupplierSummary;
  statusHistory: EnquiryHistoryRow[];
  quotations: Array<
    QuotationRow & {
      itemsCount: number;
    }
  >;
  attachments: EnquiryAttachmentItem[];
}

export async function getBuyerEnquiryDetail(
  buyerId: string,
  enquiryId: string,
): Promise<BuyerEnquiryDetailData | null> {
  if (!UUID_REGEX.test(enquiryId)) return null;
  const supabase = await getSupabaseServerClient();

  const { data: enquiryRow } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", enquiryId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (!enquiryRow) return null;

  const [
    sellerMap,
    productMap,
    { data: historyRows },
    { data: quotationRows },
    { data: storageFiles },
  ] = await Promise.all([
    batchLoadPublicSellers(enquiryRow.seller_id ? [enquiryRow.seller_id] : []),
    batchLoadProducts([enquiryRow.product_id]),
    supabase
      .from("enquiry_status_history")
      .select("*")
      .eq("enquiry_id", enquiryRow.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("quotations")
      .select("*")
      .eq("enquiry_id", enquiryRow.id)
      .eq("buyer_id", buyerId)
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
    supabase.storage.from("enquiry-attachments").list(enquiryRow.id, {
      limit: 30,
      sortBy: { column: "created_at", order: "asc" },
    }),
  ]);

  const quotes = (quotationRows ?? []) as QuotationRow[];
  const itemCounts = new Map<string, number>();
  if (quotes.length > 0) {
    const { data: qItems } = await supabase
      .from("quotation_items")
      .select("quotation_id")
      .in(
        "quotation_id",
        quotes.map((q) => q.id),
      );
    for (const row of qItems ?? []) {
      itemCounts.set(row.quotation_id, (itemCounts.get(row.quotation_id) ?? 0) + 1);
    }
  }

  const validFiles = (storageFiles ?? []).filter(
    (f) => f.name && f.name !== ".emptyFolderPlaceholder",
  );
  const paths = validFiles.map((f) => `${enquiryRow.id}/${f.name}`);
  const signedMap = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signedList } = await supabase.storage
      .from("enquiry-attachments")
      .createSignedUrls(paths, 900); // Short-lived 15-minute signed URLs
    for (const entry of signedList ?? []) {
      if (entry.path && entry.signedUrl) {
        signedMap.set(entry.path, entry.signedUrl);
      }
    }
  }

  const attachments: EnquiryAttachmentItem[] = validFiles.map((f) => {
    const storagePath = `${enquiryRow.id}/${f.name}`;
    const meta = (f.metadata ?? {}) as Record<string, unknown>;
    return {
      name: f.name.replace(/^\d+-[0-9a-f-]{8,}-/i, ""),
      storagePath,
      sizeBytes: typeof meta.size === "number" ? meta.size : null,
      mimeType: typeof meta.mimetype === "string" ? meta.mimetype : null,
      createdAt: f.created_at ?? null,
      signedUrl: signedMap.get(storagePath) ?? null,
    };
  });

  return {
    enquiry: enquiryRow,
    referenceCode: formatEnquiryReference(enquiryRow.id),
    rfqMeta: decodeRfqDescription(enquiryRow.description),
    product: enquiryRow.product_id
      ? (productMap.get(enquiryRow.product_id) ?? null)
      : null,
    seller: (enquiryRow.seller_id ? sellerMap.get(enquiryRow.seller_id) : null) ?? fallbackGeneralSupplier,
    statusHistory: (historyRows ?? []) as EnquiryHistoryRow[],
    quotations: quotes.map((q) => ({
      ...q,
      itemsCount: itemCounts.get(q.id) ?? 0,
    })),
    attachments,
  };
}

// ---------------------------------------------------------------------------
// 4. RFQ Creation Context (/buyer/rfqs/new)
// ---------------------------------------------------------------------------

export interface RfqCreationContext {
  categories: CategoryItem[];
  verifiedSuppliers: PublicSupplierSummary[];
  preselectedProduct: (ProductSnapshotSummary & { seller: PublicSupplierSummary }) | null;
  preselectedSupplier: PublicSupplierSummary | null;
  requestedProductUnavailable: boolean;
}

export async function getRfqCreationContext(
  buyerId: string,
  params: { productSlugOrId?: string; supplierSlugOrId?: string },
): Promise<RfqCreationContext> {
  const supabase = await getSupabaseServerClient();

  const [categories, { data: publicSellers }, { data: ownSellerProfile }] =
    await Promise.all([
      getActiveCategories(),
      supabase
        .from("public_seller_profiles")
        .select("*")
        .order("business_name", { ascending: true })
        .limit(100),
      supabase
        .from("seller_profiles")
        .select("id")
        .eq("user_id", buyerId)
        .maybeSingle(),
    ]);

  const ownSellerId = ownSellerProfile?.id ?? null;

  const verifiedSuppliers: PublicSupplierSummary[] = ((publicSellers ?? []) as PublicSellerRow[])
    .filter((s) => s.id !== ownSellerId)
    .map((row) => ({
      id: row.id,
      businessName: row.business_name,
      slug: row.slug,
      businessType: row.business_type,
      city: row.city,
      state: row.state,
      country: row.country,
      website: row.website,
      yearsInBusiness: row.years_in_business,
      logoUrl:
        resolveStorageUrl(row.logo_url, "seller-logos") ??
        getSupplierFallbackLogo(row.slug),
      isVerified: true,
    }));

  let preselectedProduct: (ProductSnapshotSummary & { seller: PublicSupplierSummary }) | null =
    null;
  let requestedProductUnavailable = false;

  if (params.productSlugOrId?.trim()) {
    const key = params.productSlugOrId.trim();
    let prodQuery = supabase
      .from("products")
      .select("id, seller_id, moderation_status, published_at")
      .eq("moderation_status", "approved")
      .not("published_at", "is", null);

    prodQuery = UUID_REGEX.test(key) ? prodQuery.eq("id", key) : prodQuery.eq("slug", key);

    const { data: prodRow } = await prodQuery.maybeSingle();
    if (prodRow && prodRow.seller_id !== ownSellerId) {
      const [prodMap, sellerMap] = await Promise.all([
        batchLoadProducts([prodRow.id]),
        batchLoadPublicSellers([prodRow.seller_id]),
      ]);
      const hydrated = prodMap.get(prodRow.id);
      const seller = sellerMap.get(prodRow.seller_id);
      if (hydrated && seller && seller.isVerified) {
        preselectedProduct = { ...hydrated, seller };
      } else {
        requestedProductUnavailable = true;
      }
    } else {
      requestedProductUnavailable = true;
    }
  }

  let preselectedSupplier: PublicSupplierSummary | null = null;
  if (params.supplierSlugOrId?.trim()) {
    const key = params.supplierSlugOrId.trim();
    preselectedSupplier =
      verifiedSuppliers.find((s) => s.id === key || s.slug === key) ?? null;
  }

  return {
    categories,
    verifiedSuppliers,
    preselectedProduct,
    preselectedSupplier,
    requestedProductUnavailable,
  };
}

// ---------------------------------------------------------------------------
// 5. Received Quotations Inbox & Detail (/buyer/quotes & /buyer/quotes/[id])
// ---------------------------------------------------------------------------

export interface BuyerQuotationFilters {
  search?: string;
  status?: string;
  sellerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}

export interface PaginatedBuyerQuotations {
  items: BuyerQuotationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  availableSellers: Array<{ id: string; businessName: string }>;
}

export async function getBuyerQuotations(
  buyerId: string,
  filters: BuyerQuotationFilters = {},
): Promise<PaginatedBuyerQuotations> {
  const supabase = await getSupabaseServerClient();
  const { page, pageSize, from, to } = parsePagination(
    filters.page ?? 1,
    filters.pageSize ?? 10,
    10,
  );

  // Load distinct seller IDs from buyer's quotations for the seller filter dropdown
  const { data: allQuoteSellers } = await supabase
    .from("quotations")
    .select("seller_id")
    .eq("buyer_id", buyerId)
    .neq("status", "draft");

  const distinctSellerIds = Array.from(
    new Set((allQuoteSellers ?? []).map((r) => r.seller_id)),
  );
  const filterSellerMap = await batchLoadPublicSellers(distinctSellerIds);
  const availableSellers = distinctSellerIds
    .map((id) => ({
      id,
      businessName: filterSellerMap.get(id)?.businessName ?? "Stone Supplier",
    }))
    .sort((a, b) => a.businessName.localeCompare(b.businessName));

  let matchingEnquiryIds: string[] = [];
  if (filters.search?.trim()) {
    const { data: matchedEnquiries } = await supabase
      .from("enquiries")
      .select("id")
      .eq("buyer_id", buyerId)
      .ilike("enquiry_title", `%${escapeLike(filters.search.trim())}%`)
      .limit(50);
    matchingEnquiryIds = (matchedEnquiries ?? []).map((e) => e.id);
  }

  let query = supabase
    .from("quotations")
    .select("*", { count: "exact" })
    .eq("buyer_id", buyerId)
    .neq("status", "draft");

  if (filters.search?.trim()) {
    const escaped = escapeLike(filters.search.trim());
    if (matchingEnquiryIds.length > 0) {
      query = query.or(
        `quote_number.ilike.%${escaped}%,enquiry_id.in.(${matchingEnquiryIds.join(",")})`,
      );
    } else {
      query = query.ilike("quote_number", `%${escaped}%`);
    }
  }

  if (filters.status && filters.status !== "all" && filters.status !== "draft") {
    query = query.eq("status", filters.status as QuotationStatus);
  }

  if (filters.sellerId && UUID_REGEX.test(filters.sellerId)) {
    query = query.eq("seller_id", filters.sellerId);
  }

  if (filters.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom)) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo)) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  query = query
    .order("created_at", { ascending: filters.sort === "oldest" })
    .range(from, to);

  const { data: rows, count } = await query;
  const quotations = (rows ?? []) as QuotationRow[];
  const total = count ?? 0;

  const enquiryIds = Array.from(new Set(quotations.map((q) => q.enquiry_id)));
  const [sellerMap, { data: enquiryRows }] = await Promise.all([
    batchLoadPublicSellers(quotations.map((q) => q.seller_id)),
    enquiryIds.length > 0
      ? supabase
          .from("enquiries")
          .select("id, enquiry_title")
          .eq("buyer_id", buyerId)
          .in("id", enquiryIds)
      : Promise.resolve({ data: [] as Array<{ id: string; enquiry_title: string }> }),
  ]);

  const titleByEnquiry = new Map<string, string>();
  for (const e of enquiryRows ?? []) {
    titleByEnquiry.set(e.id, e.enquiry_title);
  }

  const items: BuyerQuotationListItem[] = quotations.map((q) => ({
    id: q.id,
    quoteNumber: q.quote_number,
    enquiryId: q.enquiry_id,
    enquiryTitle: titleByEnquiry.get(q.enquiry_id) ?? "Stone Enquiry",
    enquiryReference: formatEnquiryReference(q.enquiry_id),
    seller: sellerMap.get(q.seller_id)!,
    subtotal: Number(q.subtotal),
    taxAmount: Number(q.tax_amount),
    shippingCharges: Number(q.shipping_charges),
    discountAmount: Number(q.discount_amount),
    totalAmount: Number(q.total_amount),
    currency: q.currency,
    validUntil: q.valid_until,
    status: q.status as QuotationStatus,
    createdAt: q.created_at,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    availableSellers,
  };
}

export interface BuyerQuotationDetailData {
  quotation: QuotationRow;
  items: QuotationItemRow[];
  enquiry: EnquiryRow;
  enquiryReference: string;
  rfqMeta: RfqSpecificationMeta;
  seller: PublicSupplierSummary;
  buyerProfile: ProfileRow | null;
  buyerExtendedAddress: DecodedBuyerAddress;
  commercialTerms: ParsedCommercialTerms;
  siblingQuotationsCount: number;
}

export async function getBuyerQuotationDetail(
  buyerId: string,
  quotationId: string,
): Promise<BuyerQuotationDetailData | null> {
  if (!UUID_REGEX.test(quotationId)) return null;
  const supabase = await getSupabaseServerClient();

  const { data: quoteRow } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", quotationId)
    .eq("buyer_id", buyerId)
    .neq("status", "draft")
    .maybeSingle();

  if (!quoteRow) return null;

  const [
    { data: itemRows },
    { data: enquiryRow },
    sellerMap,
    { data: buyerProfile },
    { count: siblingCount },
  ] = await Promise.all([
    supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quoteRow.id)
      .order("id", { ascending: true }),
    supabase
      .from("enquiries")
      .select("*")
      .eq("id", quoteRow.enquiry_id)
      .eq("buyer_id", buyerId)
      .maybeSingle(),
    batchLoadPublicSellers([quoteRow.seller_id]),
    supabase.from("profiles").select("*").eq("id", buyerId).maybeSingle(),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .eq("enquiry_id", quoteRow.enquiry_id)
      .neq("status", "draft"),
  ]);

  if (!enquiryRow) return null;

  return {
    quotation: quoteRow,
    items: (itemRows ?? []) as QuotationItemRow[],
    enquiry: enquiryRow,
    enquiryReference: formatEnquiryReference(enquiryRow.id),
    rfqMeta: decodeRfqDescription(enquiryRow.description),
    seller: sellerMap.get(quoteRow.seller_id)!,
    buyerProfile: buyerProfile ?? null,
    buyerExtendedAddress: decodeBuyerAddress(buyerProfile?.address),
    commercialTerms: parseQuotationCommercialTerms(quoteRow.terms, quoteRow.valid_until),
    siblingQuotationsCount: siblingCount ?? 1,
  };
}

// ---------------------------------------------------------------------------
// 6. Quotation Comparison (/buyer/quotes/compare)
// ---------------------------------------------------------------------------

export interface ComparisonQuotationRecord extends ComparableQuotationInput {
  enquiryTitle: string;
  enquiryReference: string;
  sellerSlug: string | null;
  sellerLocation: string;
  commercialTerms: ParsedCommercialTerms;
  items: QuotationItemRow[];
  productSpecsSummary: string;
}

export interface BuyerQuotationComparisonViewData {
  allQuotations: Array<{
    id: string;
    quoteNumber: string;
    enquiryId: string;
    enquiryTitle: string;
    enquiryReference: string;
    sellerName: string;
    totalAmount: number;
    currency: string;
    status: QuotationStatus;
    createdAt: string;
  }>;
  compared: ComparisonQuotationRecord[];
  analysis: QuotationComparisonAnalysis;
  selectedEnquiryId: string | null;
}

export async function getBuyerQuotationsForComparison(
  buyerId: string,
  params: { enquiryId?: string; ids?: string[] },
): Promise<BuyerQuotationComparisonViewData> {
  const supabase = await getSupabaseServerClient();

  const { data: quoteRows } = await supabase
    .from("quotations")
    .select("*")
    .eq("buyer_id", buyerId)
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(60);

  const allRows = (quoteRows ?? []) as QuotationRow[];
  const enquiryIds = Array.from(new Set(allRows.map((q) => q.enquiry_id)));

  const [sellerMap, { data: enquiryRows }] = await Promise.all([
    batchLoadPublicSellers(allRows.map((q) => q.seller_id)),
    enquiryIds.length > 0
      ? supabase
          .from("enquiries")
          .select("*")
          .eq("buyer_id", buyerId)
          .in("id", enquiryIds)
      : Promise.resolve({ data: [] as EnquiryRow[] }),
  ]);

  const enquiryMap = new Map<string, EnquiryRow>();
  for (const e of (enquiryRows ?? []) as EnquiryRow[]) {
    enquiryMap.set(e.id, e);
  }

  const allQuotations = allRows.map((q) => {
    const enq = enquiryMap.get(q.enquiry_id);
    return {
      id: q.id,
      quoteNumber: q.quote_number,
      enquiryId: q.enquiry_id,
      enquiryTitle: enq?.enquiry_title ?? "Stone Requirement",
      enquiryReference: formatEnquiryReference(q.enquiry_id),
      sellerName: sellerMap.get(q.seller_id)?.businessName ?? "Stone Supplier",
      totalAmount: Number(q.total_amount),
      currency: q.currency,
      status: q.status as QuotationStatus,
      createdAt: q.created_at,
    };
  });

  // Determine which quotations are actively selected for side-by-side comparison
  let selectedRows: QuotationRow[] = [];
  let selectedEnquiryId: string | null = null;

  const cleanIds = (params.ids ?? []).filter((id) => UUID_REGEX.test(id));
  if (cleanIds.length > 0) {
    const idSet = new Set(cleanIds);
    selectedRows = allRows.filter((q) => idSet.has(q.id)).slice(0, 5);
  } else if (params.enquiryId && UUID_REGEX.test(params.enquiryId)) {
    selectedEnquiryId = params.enquiryId;
    selectedRows = allRows
      .filter((q) => q.enquiry_id === params.enquiryId)
      .slice(0, 5);
  } else {
    // Auto-select the most recent enquiry that has >= 2 quotations, or the 2 most recent quotes
    const byEnquiry = new Map<string, QuotationRow[]>();
    for (const q of allRows) {
      const list = byEnquiry.get(q.enquiry_id) ?? [];
      list.push(q);
      byEnquiry.set(q.enquiry_id, list);
    }
    const multiQuoteEnquiry = Array.from(byEnquiry.entries()).find(
      ([, list]) => list.length >= 2,
    );
    if (multiQuoteEnquiry) {
      selectedEnquiryId = multiQuoteEnquiry[0];
      selectedRows = multiQuoteEnquiry[1].slice(0, 4);
    } else if (allRows.length >= 2) {
      selectedRows = allRows.slice(0, 2);
    } else {
      selectedRows = allRows.slice(0, 1);
    }
  }

  const itemsByQuote = new Map<string, QuotationItemRow[]>();
  if (selectedRows.length > 0) {
    const { data: qItems } = await supabase
      .from("quotation_items")
      .select("*")
      .in(
        "quotation_id",
        selectedRows.map((q) => q.id),
      );
    for (const item of (qItems ?? []) as QuotationItemRow[]) {
      const list = itemsByQuote.get(item.quotation_id) ?? [];
      list.push(item);
      itemsByQuote.set(item.quotation_id, list);
    }
  }

  const compared: ComparisonQuotationRecord[] = selectedRows.map((q) => {
    const seller = sellerMap.get(q.seller_id)!;
    const enq = enquiryMap.get(q.enquiry_id);
    const items = itemsByQuote.get(q.id) ?? [];
    const units = Array.from(new Set(items.map((i) => i.unit)));
    const totalQty = items.reduce((sum, i) => sum + Number(i.quantity), 0);
    const subtotalNum = Number(q.subtotal);
    const effectiveUnitPrice =
      units.length === 1 && totalQty > 0
        ? Math.round((subtotalNum / totalQty) * 100) / 100
        : items[0]
          ? Number(items[0].unit_price)
          : null;

    const rfqMeta = decodeRfqDescription(enq?.description);
    const specPieces = [
      rfqMeta.materialType,
      rfqMeta.colour,
      rfqMeta.finish,
      rfqMeta.thickness ? `Thickness: ${rfqMeta.thickness}` : null,
      ...items.map((i) => i.description),
    ].filter(Boolean);

    return {
      id: q.id,
      quoteNumber: q.quote_number,
      enquiryId: q.enquiry_id,
      enquiryTitle: enq?.enquiry_title ?? "Stone Requirement",
      enquiryReference: formatEnquiryReference(q.enquiry_id),
      sellerName: seller.businessName,
      sellerSlug: seller.slug,
      sellerLocation:
        [seller.city, seller.state, seller.country].filter(Boolean).join(", ") || "India",
      sellerVerificationStatus: seller.isVerified ? "verified" : null,
      currency: q.currency,
      subtotal: subtotalNum,
      taxAmount: Number(q.tax_amount),
      shippingCharges: Number(q.shipping_charges),
      discountAmount: Number(q.discount_amount),
      totalAmount: Number(q.total_amount),
      validUntil: q.valid_until,
      status: q.status as QuotationStatus,
      totalQuantity: Math.round(totalQty * 1000) / 1000,
      primaryUnit: units[0] ?? enq?.unit ?? null,
      hasMixedUnits: units.length > 1,
      effectiveUnitPrice,
      commercialTerms: parseQuotationCommercialTerms(q.terms, q.valid_until),
      items,
      productSpecsSummary:
        specPieces.slice(0, 3).join(" • ") || "As specified in quotation line items",
    };
  });

  return {
    allQuotations,
    compared,
    analysis: analyzeQuotationComparison(compared),
    selectedEnquiryId,
  };
}

// ---------------------------------------------------------------------------
// 7. Saved Products / Favourites (/buyer/favourites & Marketplace Heart State)
// ---------------------------------------------------------------------------

export async function getBuyerFavourites(
  buyerId: string,
  limit = 60,
): Promise<BuyerSavedProductItem[]> {
  const supabase = await getSupabaseServerClient();
  const { data: favRows } = await supabase
    .from("product_favourites")
    .select("id, product_id, created_at")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const favs = favRows ?? [];
  if (favs.length === 0) return [];

  const productMap = await batchLoadProducts(favs.map((f) => f.product_id));
  const sellerIds = Array.from(productMap.values()).map((p) => p.sellerId);
  const sellerMap = await batchLoadPublicSellers(sellerIds);

  return favs.map((fav) => {
    const product = productMap.get(fav.product_id) ?? null;
    const seller = product ? (sellerMap.get(product.sellerId) ?? null) : null;
    return {
      favouriteId: fav.id,
      productId: fav.product_id,
      savedAt: fav.created_at,
      isAvailable: Boolean(product),
      product,
      seller,
    };
  });
}

/**
 * Safe helper for public marketplace pages: returns the set of saved product UUIDs
 * for the currently signed-in user, or an empty Set for anonymous visitors.
 */
export async function getCurrentUserFavouriteIds(): Promise<Set<string>> {
  try {
    const user = await getCurrentUser();
    if (!user) return new Set();
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("product_favourites")
      .select("product_id")
      .eq("buyer_id", user.id)
      .limit(200);
    return new Set((data ?? []).map((r) => r.product_id));
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// 8. Buyer Notifications (/buyer/notifications)
// ---------------------------------------------------------------------------

export interface BuyerNotificationItem {
  id: string;
  title: string;
  message: string;
  notificationType: NotificationRow["notification_type"];
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
  href: string | null;
}

export interface BuyerNotificationsViewData {
  items: BuyerNotificationItem[];
  unreadCount: number;
  accountStatus: AccountStatus;
}

function resolveNotificationHref(
  type: NotificationRow["notification_type"],
  referenceId: string | null,
  options?: { isBuyerConversation?: boolean },
): string | null {
  if (!referenceId || !UUID_REGEX.test(referenceId)) {
    if (type === "account_status") return "/buyer/settings";
    if (type === "message_received") return "/buyer/messages";
    if (type === "seller_verification") return "/seller/verification";
    if (type === "product_moderation") return "/seller/products";
    return null;
  }

  switch (type) {
    case "message_received":
      return options?.isBuyerConversation === false
        ? `/seller/messages/${referenceId}`
        : `/buyer/messages/${referenceId}`;
    case "quotation_received":
    case "quotation_accepted":
    case "quotation_rejected":
      return `/buyer/quotes/${referenceId}`;
    case "enquiry_received":
    case "enquiry_viewed":
    case "system":
      return `/buyer/enquiries/${referenceId}`;
    case "seller_verification":
      return "/seller/verification";
    case "product_moderation":
      return `/seller/products/${referenceId}/edit`;
    default:
      return null;
  }
}

export async function getBuyerNotifications(
  buyerId: string,
  filter: "all" | "unread" = "all",
): Promise<BuyerNotificationsViewData> {
  const supabase = await getSupabaseServerClient();

  let listQuery = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", buyerId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "unread") {
    listQuery = listQuery.eq("is_read", false);
  }

  const [{ data: rows }, { count: unreadCount }, { data: profile }] = await Promise.all([
    listQuery,
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", buyerId)
      .eq("is_read", false),
    supabase.from("profiles").select("account_status").eq("id", buyerId).maybeSingle(),
  ]);

  const rawNotifications = (rows ?? []) as NotificationRow[];
  const msgConvIds = Array.from(
    new Set(
      rawNotifications
        .filter((n) => n.notification_type === "message_received" && n.reference_id)
        .map((n) => n.reference_id!),
    ),
  );
  const convBuyerById = new Map<string, string>();
  if (msgConvIds.length > 0) {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, buyer_id")
      .in("id", msgConvIds);
    for (const c of convs ?? []) {
      convBuyerById.set(c.id, c.buyer_id);
    }
  }

  const items: BuyerNotificationItem[] = rawNotifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    notificationType: n.notification_type,
    referenceId: n.reference_id,
    isRead: n.is_read,
    createdAt: n.created_at,
    href: resolveNotificationHref(n.notification_type, n.reference_id, {
      isBuyerConversation:
        n.reference_id && convBuyerById.has(n.reference_id)
          ? convBuyerById.get(n.reference_id) === buyerId
          : true,
    }),
  }));

  return {
    items,
    unreadCount: unreadCount ?? 0,
    accountStatus: (profile?.account_status as AccountStatus) ?? "active",
  };
}

// ---------------------------------------------------------------------------
// Phase 2: Buyer Orders Queries (/buyer/orders)
// ---------------------------------------------------------------------------

export interface BuyerOrderItem {
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

export interface BuyerOrderStatusHistoryItem {
  id: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface BuyerOrderSummary {
  id: string;
  orderNumber: string;
  quotationId: string;
  enquiryId: string;
  sellerId: string;
  sellerBusinessName: string;
  sellerCity: string | null;
  sellerState: string | null;
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

export interface BuyerOrderDetail extends BuyerOrderSummary {
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
  items: BuyerOrderItem[];
  history: BuyerOrderStatusHistoryItem[];
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

export interface BuyerOrdersResult {
  orders: BuyerOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getBuyerOrders(options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}): Promise<BuyerOrdersResult> {
  const user = await requireBuyer();
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
      seller_id,
      seller_snapshot,
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
    .eq("buyer_id", user.id);

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status as OrderStatus);
  }

  if (options.search && options.search.trim()) {
    const s = escapeLike(options.search.trim());
    query = query.or(`order_number.ilike.%${s}%,delivery_location.ilike.%${s}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("[getBuyerOrders] error:", error);
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

  const orders: BuyerOrderSummary[] = orderRows.map((row) => {
    const sellerSnap = (row.seller_snapshot as OrderSellerSnapshot | null) ?? {};
    return {
      id: row.id,
      orderNumber: row.order_number,
      quotationId: row.quotation_id,
      enquiryId: row.enquiry_id,
      sellerId: row.seller_id,
      sellerBusinessName: sellerSnap.business_name || "Verified Supplier",
      sellerCity: sellerSnap.city || null,
      sellerState: sellerSnap.state || null,
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

export async function getBuyerOrderDetail(orderId: string): Promise<BuyerOrderDetail | null> {
  const user = await requireBuyer();
  const supabase = await getSupabaseServerClient();

  const { data: row, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
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
    row.quotation_id
      ? supabase.from("quotations").select("quote_number").eq("id", row.quotation_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.enquiry_id
      ? supabase.from("enquiries").select("enquiry_title").eq("id", row.enquiry_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const sellerSnap = (row.seller_snapshot as OrderSellerSnapshot | null) ?? {};
  const buyerSnap = (row.buyer_snapshot as OrderBuyerSnapshot | null) ?? {};

  const items: BuyerOrderItem[] = (itemsRes.data ?? []).map((it) => ({
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

  const history: BuyerOrderStatusHistoryItem[] = (histRes.data ?? []).map((h) => ({
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
    sellerId: row.seller_id,
    sellerBusinessName: sellerSnap.business_name || "Verified Supplier",
    sellerCity: sellerSnap.city || null,
    sellerState: sellerSnap.state || null,
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

export async function getBuyerSavedAddresses() {
  const user = await requireBuyer();
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("buyer_addresses")
    .select("*")
    .eq("buyer_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getBuyerSavedAddresses] error:", error);
    return [];
  }
  return data ?? [];
}
