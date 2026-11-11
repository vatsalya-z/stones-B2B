import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { createAdminClient } from "@stone/database/admin";

export interface PlanFeatures {
  storefront: "basic" | "premium" | "advanced";
  analytics: "basic" | "advanced";
  priority_support: boolean;
  lead_access: "standard" | "high" | "unlimited";
  badge?: string | null;
  rfq_response_limit?: number | null;
  custom_domain?: boolean;
  custom_entitlements?: boolean;
  featured_products?: boolean;
  priority_lead_routing?: boolean;
}

export interface SellerEntitlements {
  sellerId: string;
  subscriptionId: string | null;
  planCode: string;
  planName: string;
  status: "active" | "past_due" | "canceled" | "expired" | "trialing" | "suspended";
  maxActiveListings: number | null; // null indicates unlimited listings
  activeListingsCount: number;
  remainingListings: number | null; // null indicates unlimited
  isOverListingLimit: boolean;
  canCreateListing: boolean;
  isUnlimited: boolean;
  maxMonthlyLeads: number | null; // null indicates unlimited leads
  usedMonthlyLeads: number;
  remainingMonthlyLeads: number | null; // null indicates unlimited
  canReceiveLeads: boolean;
  isUnlimitedLeads: boolean;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
  isInGracePeriod: boolean;
  isExpired: boolean;
  isSuspended: boolean;
  isPromotional: boolean;
  features: PlanFeatures;
}

const DEFAULT_FREE_FEATURES: PlanFeatures = {
  storefront: "basic",
  analytics: "basic",
  priority_support: false,
  lead_access: "standard",
  badge: null,
  rfq_response_limit: 10,
  custom_domain: false,
  featured_products: false,
  priority_lead_routing: false,
};

/**
 * Server-side entitlement resolver.
 * Executes the secure PostgreSQL function `get_seller_subscription_entitlements`
 * to resolve active plans, grace periods, listing counts, monthly lead quotas, and remaining capacity.
 * Never trusts any client-provided or browser-stored plan information.
 */
export async function getSellerEntitlements(
  sellerId: string,
  clientOverride?: ReturnType<typeof createAdminClient>,
): Promise<SellerEntitlements> {
  const client = clientOverride || (await getSupabaseServerClient());

  const { data, error } = await client.rpc("get_seller_subscription_entitlements", {
    _seller_id: sellerId,
  });

  if (error || !data) {
    // Graceful fallback to default Free Plan limits if RPC unavailable or seller not yet enrolled
    const admin = clientOverride || createAdminClient();
    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .not("moderation_status", "in", '("archived","rejected")');

    const activeCount = count ?? 0;
    const maxFree = 5;
    const maxLeadsFree = 5;
    return {
      sellerId,
      subscriptionId: null,
      planCode: "free",
      planName: "Free",
      status: "active",
      maxActiveListings: maxFree,
      activeListingsCount: activeCount,
      remainingListings: Math.max(0, maxFree - activeCount),
      isOverListingLimit: activeCount > maxFree,
      canCreateListing: activeCount < maxFree,
      isUnlimited: false,
      maxMonthlyLeads: maxLeadsFree,
      usedMonthlyLeads: 0,
      remainingMonthlyLeads: maxLeadsFree,
      canReceiveLeads: true,
      isUnlimitedLeads: false,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      currentPeriodEnd: null,
      gracePeriodEnd: null,
      isInGracePeriod: false,
      isExpired: false,
      isSuspended: false,
      isPromotional: false,
      features: DEFAULT_FREE_FEATURES,
    };
  }

  const payload = data as Record<string, unknown>;

  const maxActive =
    payload.max_active_listings !== null && payload.max_active_listings !== undefined
      ? Number(payload.max_active_listings)
      : null;
  const activeCount = Number(payload.active_listings_count ?? 0);
  const isUnlimited = payload.is_unlimited_listings === true || maxActive === null;
  const remaining = isUnlimited ? null : Math.max(0, (maxActive ?? 0) - activeCount);
  const canCreate = Boolean(payload.can_create_listing);

  const maxLeads =
    payload.max_monthly_leads !== null && payload.max_monthly_leads !== undefined
      ? Number(payload.max_monthly_leads)
      : null;
  const usedLeads = Number(payload.used_monthly_leads ?? 0);
  const isUnlimitedLeads = payload.is_unlimited_leads === true || maxLeads === null;
  const remainingLeads = isUnlimitedLeads ? null : Math.max(0, (maxLeads ?? 0) - usedLeads);
  const canReceiveLeads = Boolean(payload.can_receive_leads);

  return {
    sellerId: String(payload.seller_id ?? sellerId),
    subscriptionId: payload.subscription_id ? String(payload.subscription_id) : null,
    planCode: String(payload.plan_code ?? "free"),
    planName: String(payload.plan_name ?? "Free"),
    status: (payload.status as SellerEntitlements["status"]) ?? "active",
    maxActiveListings: maxActive,
    activeListingsCount: activeCount,
    remainingListings: remaining,
    isOverListingLimit: Boolean(payload.is_over_listing_limit),
    canCreateListing: canCreate,
    isUnlimited,
    maxMonthlyLeads: maxLeads,
    usedMonthlyLeads: usedLeads,
    remainingMonthlyLeads: remainingLeads,
    canReceiveLeads,
    isUnlimitedLeads,
    billingPeriodStart: payload.billing_period_start ? String(payload.billing_period_start) : null,
    billingPeriodEnd: payload.billing_period_end ? String(payload.billing_period_end) : null,
    currentPeriodEnd: payload.current_period_end ? String(payload.current_period_end) : null,
    gracePeriodEnd: payload.grace_period_end ? String(payload.grace_period_end) : null,
    isInGracePeriod: Boolean(payload.is_in_grace_period),
    isExpired: Boolean(payload.is_expired),
    isSuspended: Boolean(payload.is_suspended),
    isPromotional: Boolean(payload.is_promotional),
    features: (payload.features as PlanFeatures) ?? DEFAULT_FREE_FEATURES,
  };
}

/**
 * Validates whether a seller is authorized to create or activate a new product listing.
 * Throws or returns an error explanation if the seller has reached their active listing limit.
 */
export async function assertCanCreateProduct(
  sellerId: string,
  clientOverride?: ReturnType<typeof createAdminClient>,
): Promise<{ allowed: boolean; reason?: string; entitlements: SellerEntitlements }> {
  const entitlements = await getSellerEntitlements(sellerId, clientOverride);

  if (entitlements.isSuspended) {
    return {
      allowed: false,
      reason: "Your seller subscription is currently suspended. Product listings cannot be created or modified.",
      entitlements,
    };
  }

  if (entitlements.canCreateListing) {
    return { allowed: true, entitlements };
  }

  const reason = `Listing limit reached: Your current '${entitlements.planName}' subscription plan allows a maximum of ${entitlements.maxActiveListings} active listings (currently ${entitlements.activeListingsCount} used). Upgrade to Pro or Enterprise to add more products, or archive existing listings.`;

  return {
    allowed: false,
    reason,
    entitlements,
  };
}

/**
 * Validates whether a seller has available monthly lead allowance to receive a new RFQ assignment.
 */
export async function assertCanReceiveLead(
  sellerId: string,
  clientOverride?: ReturnType<typeof createAdminClient>,
): Promise<{ allowed: boolean; reason?: string; entitlements: SellerEntitlements }> {
  const entitlements = await getSellerEntitlements(sellerId, clientOverride);

  if (entitlements.isSuspended) {
    return {
      allowed: false,
      reason: "Seller subscription is suspended.",
      entitlements,
    };
  }

  if (entitlements.canReceiveLeads) {
    return { allowed: true, entitlements };
  }

  const reason = `Monthly lead quota exhausted: Current plan '${entitlements.planName}' allows a maximum of ${entitlements.maxMonthlyLeads} leads/month (${entitlements.usedMonthlyLeads} used).`;

  return {
    allowed: false,
    reason,
    entitlements,
  };
}

/**
 * Consumes 1 monthly lead credit for a seller upon RFQ assignment in a transactionally-safe atomic RPC.
 * Deduplicates automatically if the enquiry was already assigned to this seller.
 */
export async function consumeLeadCredit(
  sellerId: string,
  enquiryId: string,
  clientOverride?: ReturnType<typeof createAdminClient>,
): Promise<{
  success: boolean;
  alreadyConsumed?: boolean;
  used?: number;
  remaining?: number | null;
  error?: string;
}> {
  const client = clientOverride || createAdminClient();

  const { data, error } = await client.rpc("consume_seller_lead_credit", {
    _seller_id: sellerId,
    _enquiry_id: enquiryId,
  });

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Failed to consume lead credit.",
    };
  }

  const result = data as {
    success: boolean;
    already_consumed?: boolean;
    used?: number;
    remaining?: number | null;
    reason?: string;
  };

  return {
    success: result.success,
    alreadyConsumed: result.already_consumed,
    used: result.used,
    remaining: result.remaining,
    error: result.reason,
  };
}
