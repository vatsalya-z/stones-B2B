import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { createAdminClient } from "@stone/database/admin";
import { getSellerEntitlements, type SellerEntitlements, type PlanFeatures } from "./entitlements";

export interface SubscriptionPlanRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxActiveListings: number | null;
  maxMonthlyLeads: number | null;
  priceMonthly: number | null;
  currency: string;
  features: PlanFeatures;
  sortOrder: number;
}

export interface SellerSubscriptionDetails {
  subscription: {
    id: string;
    sellerId: string;
    planId: string;
    status: "active" | "past_due" | "canceled" | "expired" | "trialing" | "suspended";
    billingCycle: string;
    startedAt: string;
    currentPeriodStart: string;
    currentPeriodEnd: string | null;
    gracePeriodEnd: string | null;
    canceledAt: string | null;
    cancelAtPeriodEnd: boolean;
    promotionalGrant: boolean;
    grantReason: string | null;
    customMaxListings: number | null;
    customMaxMonthlyLeads: number | null;
    billingProvider: string | null;
  } | null;
  plan: SubscriptionPlanRow;
  entitlements: SellerEntitlements;
  plans: SubscriptionPlanRow[];
}

export interface SubscriptionEventRow {
  id: string;
  eventType: string;
  triggeredBy: string;
  notes: string | null;
  createdAt: string;
  previousPlanName: string | null;
  newPlanName: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Returns complete subscription details for a seller portal view.
 */
export async function getSellerSubscriptionDetails(
  sellerId: string,
): Promise<SellerSubscriptionDetails> {
  const supabase = await getSupabaseServerClient();
  const entitlements = await getSellerEntitlements(sellerId, supabase);

  // Fetch all available public plans
  const { data: plansData } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const plans: SubscriptionPlanRow[] = (plansData ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    maxActiveListings: p.max_active_listings,
    maxMonthlyLeads: p.max_monthly_leads,
    priceMonthly: p.price_monthly ? Number(p.price_monthly) : null,
    currency: p.currency,
    features: (p.features as unknown as PlanFeatures) ?? {},
    sortOrder: p.sort_order,
  }));

  // Fetch the seller's active subscription row
  const { data: subData } = await supabase
    .from("seller_subscriptions")
    .select("*")
    .eq("seller_id", sellerId)
    .in("status", ["active", "trialing", "past_due", "suspended"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentPlan =
    plans.find((p) => p.code === entitlements.planCode) ||
    plans.find((p) => p.code === "free") ||
    ({
      id: "free",
      code: "free",
      name: "Free",
      description: "Default free tier",
      maxActiveListings: 5,
      maxMonthlyLeads: 5,
      priceMonthly: null,
      currency: "INR",
      features: {} as PlanFeatures,
      sortOrder: 1,
    } as SubscriptionPlanRow);

  return {
    subscription: subData
      ? {
          id: subData.id,
          sellerId: subData.seller_id,
          planId: subData.plan_id,
          status: subData.status,
          billingCycle: subData.billing_cycle,
          startedAt: subData.started_at,
          currentPeriodStart: subData.current_period_start,
          currentPeriodEnd: subData.current_period_end,
          gracePeriodEnd: subData.grace_period_end,
          canceledAt: subData.canceled_at,
          cancelAtPeriodEnd: subData.cancel_at_period_end,
          promotionalGrant: subData.promotional_grant,
          grantReason: subData.grant_reason,
          customMaxListings: subData.custom_max_listings,
          customMaxMonthlyLeads: subData.custom_max_monthly_leads,
          billingProvider: subData.billing_provider,
        }
      : null,
    plan: currentPlan,
    entitlements,
    plans,
  };
}

/**
 * Returns subscription audit event history for a seller.
 */
export async function getSellerSubscriptionEvents(
  sellerId: string,
  limit = 20,
): Promise<SubscriptionEventRow[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscription_events")
    .select(`
      id,
      event_type,
      triggered_by,
      notes,
      created_at,
      metadata,
      previous_plan:subscription_plans!subscription_events_previous_plan_id_fkey(name),
      new_plan:subscription_plans!subscription_events_new_plan_id_fkey(name)
    `)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((e) => {
    const prev = e.previous_plan as { name?: string } | null;
    const nxt = e.new_plan as { name?: string } | null;
    return {
      id: e.id,
      eventType: e.event_type,
      triggeredBy: e.triggered_by,
      notes: e.notes,
      createdAt: e.created_at,
      previousPlanName: prev?.name ?? null,
      newPlanName: nxt?.name ?? null,
      metadata: (e.metadata as Record<string, unknown>) ?? {},
    };
  });
}

export interface AdminSellerSubscriptionItem {
  subscriptionId: string | null;
  sellerId: string;
  businessName: string;
  businessEmail: string | null;
  city: string | null;
  state: string | null;
  verificationStatus: string;
  planCode: string;
  planName: string;
  status: string;
  maxActiveListings: number | null;
  activeListingsCount: number;
  remainingListings: number | null;
  isOverListingLimit: boolean;
  maxMonthlyLeads: number | null;
  usedMonthlyLeads: number;
  remainingMonthlyLeads: number | null;
  isSuspended: boolean;
  currentPeriodEnd: string | null;
  promotionalGrant: boolean;
  grantReason: string | null;
  startedAt: string | null;
}

/**
 * Admin: List all seller subscriptions with entitlements and usage metrics.
 */
export async function getAdminSellerSubscriptionsList(params?: {
  planCode?: string;
  status?: string;
  search?: string;
}): Promise<AdminSellerSubscriptionItem[]> {
  const admin = createAdminClient();

  // Load all sellers
  let query = admin
    .from("seller_profiles")
    .select(`
      id,
      business_name,
      business_email,
      city,
      state,
      verification_status,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (params?.search) {
    query = query.ilike("business_name", `%${params.search}%`);
  }

  const { data: sellers, error } = await query;
  if (error || !sellers) return [];

  // Concurrently fetch entitlements for each seller
  const results = await Promise.all(
    sellers.map(async (seller) => {
      const entitlements = await getSellerEntitlements(seller.id, admin);
      return {
        subscriptionId: entitlements.subscriptionId,
        sellerId: seller.id,
        businessName: seller.business_name,
        businessEmail: seller.business_email,
        city: seller.city,
        state: seller.state,
        verificationStatus: seller.verification_status,
        planCode: entitlements.planCode,
        planName: entitlements.planName,
        status: entitlements.status,
        maxActiveListings: entitlements.maxActiveListings,
        activeListingsCount: entitlements.activeListingsCount,
        remainingListings: entitlements.remainingListings,
        isOverListingLimit: entitlements.isOverListingLimit,
        maxMonthlyLeads: entitlements.maxMonthlyLeads,
        usedMonthlyLeads: entitlements.usedMonthlyLeads,
        remainingMonthlyLeads: entitlements.remainingMonthlyLeads,
        isSuspended: entitlements.isSuspended,
        currentPeriodEnd: entitlements.currentPeriodEnd,
        promotionalGrant: entitlements.isPromotional,
        grantReason: null, // Detailed in modal/drawer
        startedAt: null,
      };
    }),
  );

  let filtered = results;
  if (params?.planCode && params.planCode !== "all") {
    filtered = filtered.filter((r) => r.planCode === params.planCode);
  }
  if (params?.status && params.status !== "all") {
    filtered = filtered.filter((r) => r.status === params.status);
  }

  return filtered;
}
