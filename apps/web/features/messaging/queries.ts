import "server-only";
import type { Database } from "@stone/database";
import type {
  ChatAttachmentMime,
  EnquiryStatus,
  MessageSenderRole,
  MessageType,
  NotificationType,
  QuotationStatus,
} from "@stone/types";
import {
  conversationInboxFilterSchema,
  type ConversationInboxTab,
} from "@stone/validation";
import { decodeBuyerAddress } from "@/features/buyer/buyer-meta";
import { resolveStorageUrl } from "@/lib/db";
import { getProductFallbackImage, getSupplierFallbackLogo } from "@/lib/images";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ThreadMessageItem } from "./messaging-utils";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PublicSellerRow = Database["public"]["Views"]["public_seller_profiles"]["Row"];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ConversationCounterpartySummary {
  id: string;
  displayName: string;
  subtitle: string | null;
  location: string | null;
  avatarUrl: string | null;
  slug: string | null;
  isVerified: boolean;
}

export interface ConversationProductSummary {
  id: string;
  name: string;
  slug: string;
  materialType: string | null;
  finish: string | null;
  unit: string;
  thumbnailUrl: string;
}

export interface ConversationEnquirySummary {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  status: EnquiryStatus;
  latestQuotation: {
    id: string;
    quoteNumber: string;
    totalAmount: number;
    currency: string;
    status: QuotationStatus;
  } | null;
}

export interface ConversationListItem {
  id: string;
  subject: string;
  buyerId: string;
  sellerId: string;
  enquiryId: string | null;
  productId: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  lastMessageAt: string;
  unreadCount: number;
  isArchived: boolean;
  counterpartyLastReadAt: string | null;
  counterparty: ConversationCounterpartySummary;
  product: ConversationProductSummary | null;
  enquiry: ConversationEnquirySummary | null;
}

export interface ConversationInboxResult {
  items: ConversationListItem[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tab: ConversationInboxTab;
  search: string;
  counts: {
    active: number;
    unread: number;
    archived: number;
  };
}

export interface MessagePageCursor {
  beforeCreatedAt: string;
  beforeId: string;
}

export interface ConversationThreadViewData {
  conversation: ConversationListItem;
  viewerRole: MessageSenderRole;
  viewerUserId: string;
  messages: ThreadMessageItem[];
  hasOlderMessages: boolean;
  nextCursor: MessagePageCursor | null;
}

function formatLocation(city: string | null, state: string | null, country?: string | null): string | null {
  const parts = [city, state].filter((p): p is string => Boolean(p && p.trim()));
  if (parts.length > 0) return parts.join(", ");
  return country && country.trim() ? country : null;
}

async function batchSignAttachmentPaths(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  paths: string[],
  expiresInSeconds = 900,
): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter((p) => Boolean(p))));
  const signedMap = new Map<string, string>();
  if (uniquePaths.length === 0) return signedMap;

  const { data } = await supabase.storage
    .from("message-attachments")
    .createSignedUrls(uniquePaths, expiresInSeconds);

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) {
      signedMap.set(entry.path, entry.signedUrl);
    }
  }
  return signedMap;
}

function mapMessageRowToItem(
  row: MessageRow,
  signedUrls: Map<string, string>,
): ThreadMessageItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderRole: row.sender_role as MessageSenderRole,
    messageType: row.message_type as MessageType,
    body: row.body,
    attachmentPath: row.attachment_path,
    attachmentName: row.attachment_name,
    attachmentMime: (row.attachment_mime as ChatAttachmentMime | null) ?? null,
    attachmentSize: row.attachment_size,
    attachmentSignedUrl: row.attachment_path
      ? (signedUrls.get(row.attachment_path) ?? null)
      : null,
    clientMessageId: row.client_message_id,
    createdAt: row.created_at,
    deliveryState: "sent",
  };
}

async function batchLoadContextMaps(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  rows: ConversationRow[],
  viewerRole: MessageSenderRole,
) {
  const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
  const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id)));
  const productIds = Array.from(
    new Set(rows.map((r) => r.product_id).filter((id): id is string => Boolean(id))),
  );
  const enquiryIds = Array.from(
    new Set(rows.map((r) => r.enquiry_id).filter((id): id is string => Boolean(id))),
  );

  const [sellersRes, buyersRes, productsRes, productImagesRes, enquiriesRes, quotesRes] =
    await Promise.all([
      viewerRole === "buyer" && sellerIds.length > 0
        ? supabase.from("public_seller_profiles").select("*").in("id", sellerIds)
        : Promise.resolve({ data: [] as PublicSellerRow[] }),
      viewerRole === "seller" && buyerIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, full_name, city, state, country, address, avatar_url")
            .in("id", buyerIds)
        : Promise.resolve({
            data: [] as Pick<
              ProfileRow,
              "id" | "full_name" | "city" | "state" | "country" | "address" | "avatar_url"
            >[],
          }),
      productIds.length > 0
        ? supabase
            .from("products")
            .select("id, name, slug, material_type, finish, unit")
            .in("id", productIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              name: string;
              slug: string;
              material_type: string | null;
              finish: string | null;
              unit: string;
            }[],
          }),
      productIds.length > 0
        ? supabase
            .from("product_images")
            .select("product_id, storage_path, is_primary, display_order")
            .in("product_id", productIds)
            .order("is_primary", { ascending: false })
            .order("display_order", { ascending: true })
        : Promise.resolve({
            data: [] as {
              product_id: string;
              storage_path: string;
              is_primary: boolean;
              display_order: number;
            }[],
          }),
      enquiryIds.length > 0
        ? supabase
            .from("enquiries")
            .select("id, enquiry_title, quantity, unit, status")
            .in("id", enquiryIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              enquiry_title: string;
              quantity: number;
              unit: string;
              status: string;
            }[],
          }),
      enquiryIds.length > 0
        ? supabase
            .from("quotations")
            .select("id, enquiry_id, quote_number, total_amount, currency, status, created_at")
            .in("enquiry_id", enquiryIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({
            data: [] as {
              id: string;
              enquiry_id: string;
              quote_number: string;
              total_amount: number;
              currency: string;
              status: string;
              created_at: string;
            }[],
          }),
    ]);

  const sellerMap = new Map<string, PublicSellerRow>();
  for (const s of (sellersRes.data ?? []) as PublicSellerRow[]) {
    sellerMap.set(s.id, s);
  }

  const buyerMap = new Map<
    string,
    Pick<ProfileRow, "id" | "full_name" | "city" | "state" | "country" | "address" | "avatar_url">
  >();
  for (const b of buyersRes.data ?? []) {
    buyerMap.set(b.id, b);
  }

  const primaryImageByProduct = new Map<string, string>();
  for (const img of productImagesRes.data ?? []) {
    if (!primaryImageByProduct.has(img.product_id)) {
      const url = resolveStorageUrl(img.storage_path, "product-images");
      if (url) primaryImageByProduct.set(img.product_id, url);
    }
  }

  const productMap = new Map<string, ConversationProductSummary>();
  for (const p of productsRes.data ?? []) {
    productMap.set(p.id, {
      id: p.id,
      name: p.name,
      slug: p.slug,
      materialType: p.material_type,
      finish: p.finish,
      unit: p.unit,
      thumbnailUrl:
        primaryImageByProduct.get(p.id) ??
        getProductFallbackImage(p.slug, p.material_type),
    });
  }

  const latestQuoteByEnquiry = new Map<
    string,
    ConversationEnquirySummary["latestQuotation"]
  >();
  for (const q of quotesRes.data ?? []) {
    if (viewerRole === "buyer" && q.status === "draft") continue;
    if (!latestQuoteByEnquiry.has(q.enquiry_id)) {
      latestQuoteByEnquiry.set(q.enquiry_id, {
        id: q.id,
        quoteNumber: q.quote_number,
        totalAmount: Number(q.total_amount),
        currency: q.currency,
        status: q.status as QuotationStatus,
      });
    }
  }

  const enquiryMap = new Map<string, ConversationEnquirySummary>();
  for (const e of enquiriesRes.data ?? []) {
    enquiryMap.set(e.id, {
      id: e.id,
      title: e.enquiry_title,
      quantity: Number(e.quantity),
      unit: e.unit,
      status: e.status as EnquiryStatus,
      latestQuotation: latestQuoteByEnquiry.get(e.id) ?? null,
    });
  }

  return { sellerMap, buyerMap, productMap, enquiryMap };
}

function hydrateConversationRow(
  row: ConversationRow,
  viewerRole: MessageSenderRole,
  maps: Awaited<ReturnType<typeof batchLoadContextMaps>>,
): ConversationListItem {
  let counterparty: ConversationCounterpartySummary;

  if (viewerRole === "buyer") {
    const s = maps.sellerMap.get(row.seller_id);
    counterparty = {
      id: row.seller_id,
      displayName: s?.business_name ?? "StonesDekho Verified Supplier",
      subtitle: s?.business_type ? s.business_type.replace(/_/g, " ") : "Stone Supplier",
      location: formatLocation(s?.city ?? null, s?.state ?? null, s?.country ?? null),
      avatarUrl:
        (s?.logo_url ? resolveStorageUrl(s.logo_url, "seller-logos") : null) ??
        getSupplierFallbackLogo(s?.slug ?? row.seller_id),
      slug: s?.slug ?? null,
      isVerified: Boolean(s?.verified_at),
    };
  } else {
    const b = maps.buyerMap.get(row.buyer_id);
    const decoded = decodeBuyerAddress(b?.address ?? null);
    counterparty = {
      id: row.buyer_id,
      displayName: b?.full_name?.trim() || decoded.companyName || "Verified StonesDekho Buyer",
      subtitle: decoded.companyName
        ? `${decoded.companyName}${decoded.buyerType ? ` · ${decoded.buyerType.replace(/_/g, " ")}` : ""}`
        : decoded.buyerType
          ? decoded.buyerType.replace(/_/g, " ")
          : "Trade Buyer",
      location: formatLocation(b?.city ?? null, b?.state ?? null, b?.country ?? null),
      avatarUrl: b?.avatar_url ?? null,
      slug: null,
      isVerified: false,
    };
  }

  const unreadCount =
    viewerRole === "buyer" ? row.buyer_unread_count : row.seller_unread_count;
  const isArchived =
    viewerRole === "buyer"
      ? Boolean(row.buyer_archived_at)
      : Boolean(row.seller_archived_at);
  const counterpartyLastReadAt =
    viewerRole === "buyer" ? row.seller_last_read_at : row.buyer_last_read_at;

  return {
    id: row.id,
    subject: row.subject,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    enquiryId: row.enquiry_id,
    productId: row.product_id,
    lastMessagePreview: row.last_message_preview,
    lastMessageSenderId: row.last_message_sender_id,
    lastMessageAt: row.last_message_at,
    unreadCount,
    isArchived,
    counterpartyLastReadAt,
    counterparty,
    product: row.product_id ? (maps.productMap.get(row.product_id) ?? null) : null,
    enquiry: row.enquiry_id ? (maps.enquiryMap.get(row.enquiry_id) ?? null) : null,
  };
}

async function queryConversationInbox(params: {
  viewerRole: MessageSenderRole;
  ownerId: string;
  rawFilter?: Record<string, unknown>;
}): Promise<ConversationInboxResult> {
  const parsed = conversationInboxFilterSchema.safeParse(params.rawFilter ?? {});
  const filter = parsed.success
    ? parsed.data
    : { search: "", tab: "active" as const, page: 1, pageSize: 25 };

  const supabase = await getSupabaseServerClient();
  const ownerColumn = params.viewerRole === "buyer" ? "buyer_id" : "seller_id";

  const { data: rawRows, error } = await supabase
    .from("conversations")
    .select("*")
    .eq(ownerColumn, params.ownerId)
    .order("last_message_at", { ascending: false })
    .limit(250);

  if (error) {
    console.error("[messaging/queries] inbox load error:", error.message);
    return {
      items: [],
      totalFiltered: 0,
      page: filter.page,
      pageSize: filter.pageSize,
      totalPages: 1,
      tab: filter.tab,
      search: filter.search,
      counts: { active: 0, unread: 0, archived: 0 },
    };
  }

  const rows = (rawRows ?? []) as ConversationRow[];
  const maps = await batchLoadContextMaps(supabase, rows, params.viewerRole);
  const allItems = rows.map((r) => hydrateConversationRow(r, params.viewerRole, maps));

  const counts = {
    active: allItems.filter((i) => !i.isArchived).length,
    unread: allItems.filter((i) => !i.isArchived && i.unreadCount > 0).length,
    archived: allItems.filter((i) => i.isArchived).length,
  };

  let filtered = allItems.filter((item) => {
    if (filter.tab === "archived") return item.isArchived;
    if (filter.tab === "unread") return !item.isArchived && item.unreadCount > 0;
    return !item.isArchived;
  });

  if (filter.search) {
    const needle = filter.search.toLowerCase();
    filtered = filtered.filter((item) => {
      const haystacks = [
        item.subject,
        item.lastMessagePreview ?? "",
        item.counterparty.displayName,
        item.counterparty.subtitle ?? "",
        item.counterparty.location ?? "",
        item.product?.name ?? "",
        item.enquiry?.title ?? "",
      ];
      return haystacks.some((h) => h.toLowerCase().includes(needle));
    });
  }

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / filter.pageSize));
  const safePage = Math.min(filter.page, totalPages);
  const start = (safePage - 1) * filter.pageSize;
  const pageItems = filtered.slice(start, start + filter.pageSize);

  return {
    items: pageItems,
    totalFiltered,
    page: safePage,
    pageSize: filter.pageSize,
    totalPages,
    tab: filter.tab,
    search: filter.search,
    counts,
  };
}

export async function getBuyerConversationInbox(
  buyerId: string,
  rawFilter?: Record<string, unknown>,
): Promise<ConversationInboxResult> {
  return queryConversationInbox({
    viewerRole: "buyer",
    ownerId: buyerId,
    rawFilter,
  });
}

export async function getSellerConversationInbox(
  sellerId: string,
  rawFilter?: Record<string, unknown>,
): Promise<ConversationInboxResult> {
  return queryConversationInbox({
    viewerRole: "seller",
    ownerId: sellerId,
    rawFilter,
  });
}

export async function getUnreadMessagesCountForBuyer(buyerId: string): Promise<number> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("conversations")
      .select("buyer_unread_count")
      .eq("buyer_id", buyerId)
      .is("buyer_archived_at", null)
      .gt("buyer_unread_count", 0);
    return (data ?? []).reduce((sum, row) => sum + (row.buyer_unread_count ?? 0), 0);
  } catch {
    return 0;
  }
}

export async function getUnreadMessagesCountForSeller(sellerId: string): Promise<number> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("conversations")
      .select("seller_unread_count")
      .eq("seller_id", sellerId)
      .is("seller_archived_at", null)
      .gt("seller_unread_count", 0);
    return (data ?? []).reduce((sum, row) => sum + (row.seller_unread_count ?? 0), 0);
  } catch {
    return 0;
  }
}

export async function getConversationThreadForViewer(params: {
  conversationId: string;
  viewerRole: MessageSenderRole;
  userId: string;
  sellerId?: string | null;
  pageSize?: number;
}): Promise<ConversationThreadViewData | null> {
  if (!UUID_REGEX.test(params.conversationId)) return null;
  if (params.viewerRole === "seller" && !params.sellerId) return null;

  const supabase = await getSupabaseServerClient();
  const limit = Math.min(Math.max(params.pageSize ?? 30, 10), 50);

  let convQuery = supabase
    .from("conversations")
    .select("*")
    .eq("id", params.conversationId);

  if (params.viewerRole === "buyer") {
    convQuery = convQuery.eq("buyer_id", params.userId);
  } else {
    convQuery = convQuery.eq("seller_id", params.sellerId!);
  }

  const { data: convRow } = await convQuery.maybeSingle();
  if (!convRow) return null;

  const [maps, { data: messageRows }] = await Promise.all([
    batchLoadContextMaps(supabase, [convRow as ConversationRow], params.viewerRole),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", params.conversationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1),
  ]);

  const rawMessages = (messageRows ?? []) as MessageRow[];
  const hasOlderMessages = rawMessages.length > limit;
  const slicedDesc = hasOlderMessages ? rawMessages.slice(0, limit) : rawMessages;
  const chronological = [...slicedDesc].reverse();

  const attachmentPaths = chronological
    .map((m) => m.attachment_path)
    .filter((p): p is string => Boolean(p));
  const signedMap = await batchSignAttachmentPaths(supabase, attachmentPaths, 900);

  const messages = chronological.map((row) => mapMessageRowToItem(row, signedMap));
  const oldest = chronological[0];
  const nextCursor: MessagePageCursor | null =
    hasOlderMessages && oldest
      ? { beforeCreatedAt: oldest.created_at, beforeId: oldest.id }
      : null;

  const conversation = hydrateConversationRow(
    convRow as ConversationRow,
    params.viewerRole,
    maps,
  );

  return {
    conversation,
    viewerRole: params.viewerRole,
    viewerUserId: params.userId,
    messages,
    hasOlderMessages,
    nextCursor,
  };
}

export async function getConversationMessagesPage(params: {
  conversationId: string;
  viewerRole: MessageSenderRole;
  userId: string;
  sellerId?: string | null;
  beforeCreatedAt: string;
  beforeId: string;
  limit?: number;
}): Promise<{
  messages: ThreadMessageItem[];
  hasOlderMessages: boolean;
  nextCursor: MessagePageCursor | null;
} | null> {
  if (!UUID_REGEX.test(params.conversationId) || !UUID_REGEX.test(params.beforeId)) {
    return null;
  }

  const parsedTime = new Date(params.beforeCreatedAt);
  if (Number.isNaN(parsedTime.getTime())) return null;
  const safeIso = parsedTime.toISOString();

  const supabase = await getSupabaseServerClient();
  let convCheck = supabase
    .from("conversations")
    .select("id")
    .eq("id", params.conversationId);

  if (params.viewerRole === "buyer") {
    convCheck = convCheck.eq("buyer_id", params.userId);
  } else {
    if (!params.sellerId) return null;
    convCheck = convCheck.eq("seller_id", params.sellerId);
  }

  const { data: authorizedConv } = await convCheck.maybeSingle();
  if (!authorizedConv) return null;

  const limit = Math.min(Math.max(params.limit ?? 30, 5), 50);

  const { data: rows } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.conversationId)
    .or(
      `created_at.lt.${safeIso},and(created_at.eq.${safeIso},id.lt.${params.beforeId})`,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const rawRows = (rows ?? []) as MessageRow[];
  const hasOlderMessages = rawRows.length > limit;
  const slicedDesc = hasOlderMessages ? rawRows.slice(0, limit) : rawRows;
  const chronological = [...slicedDesc].reverse();

  const signedMap = await batchSignAttachmentPaths(
    supabase,
    chronological
      .map((m) => m.attachment_path)
      .filter((p): p is string => Boolean(p)),
    900,
  );

  const oldest = chronological[0];
  return {
    messages: chronological.map((r) => mapMessageRowToItem(r, signedMap)),
    hasOlderMessages,
    nextCursor:
      hasOlderMessages && oldest
        ? { beforeCreatedAt: oldest.created_at, beforeId: oldest.id }
        : null,
  };
}

export async function getConversationMessagesDelta(params: {
  conversationId: string;
  viewerRole: MessageSenderRole;
  userId: string;
  sellerId?: string | null;
  afterCreatedAt?: string | null;
}): Promise<{
  messages: ThreadMessageItem[];
  counterpartyLastReadAt: string | null;
} | null> {
  if (!UUID_REGEX.test(params.conversationId)) return null;

  const supabase = await getSupabaseServerClient();
  let convQuery = supabase
    .from("conversations")
    .select("id, buyer_last_read_at, seller_last_read_at")
    .eq("id", params.conversationId);

  if (params.viewerRole === "buyer") {
    convQuery = convQuery.eq("buyer_id", params.userId);
  } else {
    if (!params.sellerId) return null;
    convQuery = convQuery.eq("seller_id", params.sellerId);
  }

  const { data: conv } = await convQuery.maybeSingle();
  if (!conv) return null;

  let msgQuery = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(100);

  if (params.afterCreatedAt) {
    const dt = new Date(params.afterCreatedAt);
    if (!Number.isNaN(dt.getTime())) {
      // Overlap by 1 second so messages with identical timestamps are never skipped; client reconciler deduplicates.
      const overlapIso = new Date(dt.getTime() - 1000).toISOString();
      msgQuery = msgQuery.gte("created_at", overlapIso);
    }
  }

  const { data: rows } = await msgQuery;
  const rawRows = (rows ?? []) as MessageRow[];
  const signedMap = await batchSignAttachmentPaths(
    supabase,
    rawRows
      .map((m) => m.attachment_path)
      .filter((p): p is string => Boolean(p)),
    900,
  );

  return {
    messages: rawRows.map((r) => mapMessageRowToItem(r, signedMap)),
    counterpartyLastReadAt:
      params.viewerRole === "buyer"
        ? conv.seller_last_read_at
        : conv.buyer_last_read_at,
  };
}

// ---------------------------------------------------------------------------
// Seller Notifications (/seller/notifications)
// ---------------------------------------------------------------------------

export interface SellerNotificationItem {
  id: string;
  title: string;
  message: string;
  notificationType: NotificationType;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
  href: string | null;
}

export interface SellerNotificationsViewData {
  items: SellerNotificationItem[];
  unreadCount: number;
}

export async function getSellerNotifications(
  userId: string,
  sellerId: string | null,
  filter: "all" | "unread" = "all",
): Promise<SellerNotificationsViewData> {
  const supabase = await getSupabaseServerClient();

  let listQuery = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "unread") {
    listQuery = listQuery.eq("is_read", false);
  }

  const [{ data: rows }, { count: unreadCount }] = await Promise.all([
    listQuery,
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  const rawNotifications = (rows ?? []) as NotificationRow[];

  // Disambiguate conversation ownership for dual-role users
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

  const items: SellerNotificationItem[] = rawNotifications.map((n) => {
    let href: string | null = null;
    const ref = n.reference_id && UUID_REGEX.test(n.reference_id) ? n.reference_id : null;

    switch (n.notification_type) {
      case "message_received":
        if (ref) {
          href =
            convBuyerById.get(ref) === userId
              ? `/buyer/messages/${ref}`
              : `/seller/messages/${ref}`;
        } else {
          href = "/seller/messages";
        }
        break;
      case "enquiry_received":
      case "enquiry_viewed":
        href = ref ? `/seller/enquiries/${ref}` : "/seller/enquiries";
        break;
      case "quotation_accepted":
      case "quotation_rejected":
      case "quotation_received":
        href = ref ? `/seller/quotes/${ref}` : "/seller/quotes";
        break;
      case "seller_verification":
        href = "/seller/verification";
        break;
      case "product_moderation":
        href = ref ? `/seller/products/${ref}/edit` : "/seller/products";
        break;
      case "account_status":
        href = "/seller/profile";
        break;
      case "system":
        if (ref && sellerId) {
          href = `/seller/enquiries/${ref}`;
        }
        break;
      default:
        href = null;
    }

    return {
      id: n.id,
      title: n.title,
      message: n.message,
      notificationType: n.notification_type as NotificationType,
      referenceId: n.reference_id,
      isRead: n.is_read,
      createdAt: n.created_at,
      href,
    };
  });

  return {
    items,
    unreadCount: unreadCount ?? 0,
  };
}
