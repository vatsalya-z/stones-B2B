"use server";

import { revalidatePath } from "next/cache";
import { requireSeller } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { authorizeAdminAction } from "@/features/admin/guard";
import { createAdminClient } from "@stone/database/admin";
import { getSellerEntitlements } from "./entitlements";

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Admin Action: Change a seller's plan or grant promotional access.
 * Protected by server-side authorizeAdminAction().
 */
export async function adminModifySellerSubscriptionAction(input: {
  sellerId: string;
  targetPlanCode: "free" | "pro" | "enterprise";
  reason: string;
  isPromotional?: boolean;
  customMaxListings?: number | null;
  customMaxMonthlyLeads?: number | null;
  periodDays?: number | null;
}): Promise<ActionResult<{ subscriptionId: string; planCode: string }>> {
  const auth = await authorizeAdminAction();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  if (!input.sellerId || !input.targetPlanCode) {
    return { success: false, error: "Missing required seller ID or target plan code." };
  }

  if (!input.reason || input.reason.trim().length < 3) {
    return { success: false, error: "A valid reason (min 3 characters) is required for audit logs." };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient.rpc("admin_modify_seller_subscription", {
    _seller_id: input.sellerId,
    _target_plan_code: input.targetPlanCode,
    _reason: input.reason.trim(),
    _is_promotional: Boolean(input.isPromotional),
    _custom_max_listings: input.customMaxListings ?? null,
    _period_days: input.periodDays ?? null,
    _custom_max_monthly_leads: input.customMaxMonthlyLeads ?? null,
  });

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update seller subscription." };
  }

  const result = data as { subscription_id: string; plan_code: string };

  revalidatePath("/admin/subscriptions");
  revalidatePath("/seller/subscription");
  revalidatePath("/seller/products");
  revalidatePath("/seller/dashboard");

  return {
    success: true,
    data: {
      subscriptionId: result.subscription_id,
      planCode: result.plan_code,
    },
  };
}

/**
 * Admin Action: Suspend a seller's subscription entitlements.
 */
export async function adminSuspendSellerSubscriptionAction(input: {
  sellerId: string;
  reason: string;
}): Promise<ActionResult> {
  const auth = await authorizeAdminAction();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.rpc("admin_suspend_seller_subscription", {
    _seller_id: input.sellerId,
    _reason: input.reason,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath("/seller/subscription");
  revalidatePath("/seller/products");

  return { success: true };
}

/**
 * Admin Action: Restore a seller's subscription entitlements.
 */
export async function adminRestoreSellerSubscriptionAction(input: {
  sellerId: string;
  reason: string;
}): Promise<ActionResult> {
  const auth = await authorizeAdminAction();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.rpc("admin_restore_seller_subscription", {
    _seller_id: input.sellerId,
    _reason: input.reason,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath("/seller/subscription");
  revalidatePath("/seller/products");

  return { success: true };
}

/**
 * Seller Action: Request plan upgrade or switch to Free plan.
 * Per Phase 4 instructions:
 * - Free plan activates immediately.
 * - Paid plans (Pro/Enterprise) log upgrade requests for admin approval or preview access.
 */
export async function sellerSelectPlanAction(input: {
  targetPlanCode: "free" | "pro" | "enterprise";
  notes?: string;
}): Promise<ActionResult<{ planCode: string; message: string }>> {
  const user = await requireSeller();
  const supabase = await getSupabaseServerClient();

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!seller) {
    return { success: false, error: "Seller profile not found." };
  }

  const entitlements = await getSellerEntitlements(seller.id, supabase);

  if (input.targetPlanCode === entitlements.planCode) {
    return {
      success: true,
      data: { planCode: input.targetPlanCode, message: "You are already on this plan." },
    };
  }

  const adminClient = createAdminClient();

  if (input.targetPlanCode === "free") {
    // If downgrading to Free, check that active listings don't exceed 5
    if (entitlements.activeListingsCount > 5) {
      return {
        success: false,
        error: `Cannot switch to Free plan: You currently have ${entitlements.activeListingsCount} active listings. Please archive down to 5 or fewer listings before downgrading.`,
      };
    }

    const { error } = await adminClient.rpc("admin_modify_seller_subscription", {
      _seller_id: seller.id,
      _target_plan_code: "free",
      _reason: input.notes?.trim() || "Seller downgraded to Free plan",
      _is_promotional: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/seller/subscription");
    return {
      success: true,
      data: { planCode: "free", message: "Switched to Free plan successfully." },
    };
  }

  // For Pro or Enterprise in Preview mode (deferred payment gateway):
  // Check if development preview grant is allowed or record an upgrade request
  const isDevPreview = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_SUBSCRIPTION_GRANTS === "true";

  if (isDevPreview) {
    // In local development, automatically activate the plan for immediate testing
    const { error } = await adminClient.rpc("admin_modify_seller_subscription", {
      _seller_id: seller.id,
      _target_plan_code: input.targetPlanCode,
      _reason: `Development Preview Grant: ${input.notes || "Seller requested " + input.targetPlanCode}`,
      _is_promotional: true,
      _period_days: 30,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/seller/subscription");
    revalidatePath("/seller/products");

    return {
      success: true,
      data: {
        planCode: input.targetPlanCode,
        message: `Plan upgraded to ${input.targetPlanCode.toUpperCase()} (Development Preview Grant activated).`,
      },
    };
  }

  // Production deferred billing: Record request event for admin approval
  const { data: targetPlan } = await adminClient
    .from("subscription_plans")
    .select("id, name")
    .eq("code", input.targetPlanCode)
    .single();

  if (targetPlan) {
    await adminClient.from("subscription_events").insert({
      seller_id: seller.id,
      event_type: "plan_changed",
      new_plan_id: targetPlan.id,
      triggered_by: "seller",
      actor_id: user.id,
      notes: `Upgrade request to ${targetPlan.name}: ${input.notes || "Deferred payment mode"}`,
    });
  }

  return {
    success: true,
    data: {
      planCode: input.targetPlanCode,
      message: `Your request for the ${input.targetPlanCode.toUpperCase()} plan has been registered. Our marketplace account team will activate your subscription.`,
    },
  };
}
