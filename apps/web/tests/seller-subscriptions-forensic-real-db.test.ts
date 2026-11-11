import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

import path from "node:path";
import fs from "node:fs";

// Load .env.local into process.env before parsing environment
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "../../.env.local"),
  path.resolve(__dirname, "../../../.env.local"),
];
const envLocalPath = candidateEnvPaths.find((p) => fs.existsSync(p));
if (envLocalPath) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "").trim();
      process.env[key] = val;
    }
  }
}

// Force local database URLs for local test execution
process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DIRECT_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

import { Client } from "@stone/database/pg";
import { createAdminClient } from "@stone/database/admin";
import {
  findMatchingSuppliers,
  type MatchCriteria,
} from "@/features/matching/supplier-matching";
import { getSellerEntitlements } from "@/features/subscription/entitlements";

const DB_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("StoneB2B Phase 4.1.1 — Forensic Verification & Hardening Real DB Tests", () => {
  let pgClient: Client;
  const supabaseAdmin = createAdminClient();

  // Synthetic deterministic UUIDs
  const freeSellerUserId = "f1111111-1111-4111-8111-111111111111";
  const freeSellerProfileId = "f1222222-2222-4222-8222-222222222222";

  const proSellerUserId = "f2111111-1111-4111-8111-111111111111";
  const proSellerProfileId = "f2222222-2222-4222-8222-222222222222";

  const entSellerUserId = "f3111111-1111-4111-8111-111111111111";
  const entSellerProfileId = "f3222222-2222-4222-8222-222222222222";

  const unverifiedSellerUserId = "f4111111-1111-4111-8111-111111111111";
  const unverifiedSellerProfileId = "f4222222-2222-4222-8222-222222222222";

  const buyerUserId = "f5111111-1111-4111-8111-111111111111";
  const testEnquiryId = "f6000000-0000-4000-8000-000000000000";

  async function cleanSyntheticRecords() {
    await pgClient.query(`
      SET session_replication_role = 'replica';
      DELETE FROM public.seller_lead_usage 
      WHERE seller_id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}', '${unverifiedSellerProfileId}');
      
      DELETE FROM public.subscription_events 
      WHERE seller_id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}', '${unverifiedSellerProfileId}');

      DELETE FROM public.seller_subscriptions 
      WHERE seller_id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}', '${unverifiedSellerProfileId}');

      DELETE FROM public.lead_assignments
      WHERE seller_id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}', '${unverifiedSellerProfileId}');

      DELETE FROM public.products 
      WHERE seller_id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}', '${unverifiedSellerProfileId}');

      DELETE FROM public.enquiries WHERE id = '${testEnquiryId}' OR id::text LIKE 'f6000000-%';

      DELETE FROM public.seller_profiles 
      WHERE id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}', '${unverifiedSellerProfileId}');

      DELETE FROM public.user_roles
      WHERE user_id IN ('${freeSellerUserId}', '${proSellerUserId}', '${entSellerUserId}', '${unverifiedSellerUserId}', '${buyerUserId}');

      DELETE FROM public.profiles 
      WHERE id IN ('${freeSellerUserId}', '${proSellerUserId}', '${entSellerUserId}', '${unverifiedSellerUserId}', '${buyerUserId}');

      DELETE FROM auth.users
      WHERE id IN ('${freeSellerUserId}', '${proSellerUserId}', '${entSellerUserId}', '${unverifiedSellerUserId}', '${buyerUserId}');
      SET session_replication_role = 'origin';
    `);
  }

  async function createProduct(
    sellerId: string,
    name: string,
    status: "draft" | "pending_review" | "approved" | "archived" | "rejected" = "draft",
    material: string = "Marble",
  ) {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const publishedAt = status === "approved" ? "now()" : "NULL";
    const res = await pgClient.query(`
      INSERT INTO public.products (seller_id, name, slug, moderation_status, material_type, published_at, price, price_type, currency, unit)
      VALUES ('${sellerId}', '${name}', '${slug}', '${status}', '${material}', ${publishedAt}, 150, 'fixed', 'INR', 'sq_ft')
      RETURNING id, name, moderation_status;
    `);
    return res.rows[0];
  }

  async function createEnquiry(enquiryId: string, title: string = "Test Forensic Marble RFQ") {
    await pgClient.query(`
      INSERT INTO public.enquiries (id, buyer_id, enquiry_title, description, enquiry_type, quantity, unit, status, created_at)
      VALUES ('${enquiryId}', '${buyerUserId}', '${title}', 'Forensic White Marble requirement', 'rfq', 1000, 'sq_ft', 'submitted', now())
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  beforeAll(async () => {
    pgClient = new Client({ connectionString: DB_URL });
    await pgClient.connect();

    await cleanSyntheticRecords();

    // 1. Create Base Auth Users & Roles
    await pgClient.query(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${freeSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'forensic_free@stoneb2b.test', '{"full_name": "Forensic Free Seller", "account_type": "seller"}', now(), now()),
        ('${proSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'forensic_pro@stoneb2b.test', '{"full_name": "Forensic Pro Seller", "account_type": "seller"}', now(), now()),
        ('${entSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'forensic_ent@stoneb2b.test', '{"full_name": "Forensic Enterprise Seller", "account_type": "seller"}', now(), now()),
        ('${unverifiedSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'forensic_unver@stoneb2b.test', '{"full_name": "Forensic Unverified Seller", "account_type": "seller"}', now(), now()),
        ('${buyerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'forensic_buyer@stoneb2b.test', '{"full_name": "Forensic Buyer", "account_type": "buyer"}', now(), now())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.user_roles (user_id, role)
      VALUES 
        ('${freeSellerUserId}', 'seller'),
        ('${proSellerUserId}', 'seller'),
        ('${entSellerUserId}', 'seller'),
        ('${unverifiedSellerUserId}', 'seller'),
        ('${buyerUserId}', 'buyer')
      ON CONFLICT (user_id, role) DO NOTHING;

      UPDATE public.profiles SET account_status = 'active'
      WHERE id IN ('${freeSellerUserId}', '${proSellerUserId}', '${entSellerUserId}', '${unverifiedSellerUserId}', '${buyerUserId}');
    `);

    // 2. Create Seller Profiles
    await pgClient.query(`
      INSERT INTO public.seller_profiles (id, user_id, business_name, slug, verification_status, business_type, city, state, country, years_in_business)
      VALUES 
        ('${freeSellerProfileId}', '${freeSellerUserId}', 'Forensic Free Stones', 'forensic-free-stones', 'verified', 'manufacturer', 'Makrana', 'Rajasthan', 'IN', 5),
        ('${proSellerProfileId}', '${proSellerUserId}', 'Forensic Pro Marbles', 'forensic-pro-marbles', 'verified', 'stone_supplier', 'Kishangarh', 'Rajasthan', 'IN', 12),
        ('${entSellerProfileId}', '${entSellerUserId}', 'Forensic Enterprise Granite', 'forensic-ent-granite', 'verified', 'mine_owner', 'Bengaluru', 'Karnataka', 'IN', 25),
        ('${unverifiedSellerProfileId}', '${unverifiedSellerUserId}', 'Forensic Unverified Supplier', 'forensic-unverified-supplier', 'under_review', 'manufacturer', 'Udaipur', 'Rajasthan', 'IN', 3)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Configure Subscriptions (Free is automatically created by trigger on seller_profiles insert)
    await pgClient.query(`
      UPDATE public.seller_subscriptions
      SET 
        plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'pro'),
        billing_cycle = 'monthly',
        current_period_start = now(),
        current_period_end = now() + interval '30 days'
      WHERE seller_id = '${proSellerProfileId}';

      UPDATE public.seller_subscriptions
      SET 
        plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'enterprise'),
        billing_cycle = 'yearly',
        current_period_start = now(),
        current_period_end = now() + interval '365 days'
      WHERE seller_id = '${entSellerProfileId}';
    `);

    // Create default test enquiry
    await createEnquiry(testEnquiryId);
  }, 30000);

  afterAll(async () => {
    if (pgClient) {
      await cleanSyntheticRecords();
      await pgClient.end();
    }
  });

  // =========================================================================
  // Section 1: Atomic Lead Consumption and Assignment
  // =========================================================================

  it("1.1 Transaction Atomicity: Database RPC rolls back completely on assignment failure without leaking credit", async () => {
    // Attempt assignment for a non-existent enquiry (violates FK constraint on lead_assignments and seller_lead_usage)
    const fakeEnquiryId = "f6999999-9999-4999-8999-999999999999";

    const { data, error } = await supabaseAdmin.rpc("assign_rfq_lead_with_credit", {
      _enquiry_id: fakeEnquiryId,
      _seller_id: freeSellerProfileId,
      _match_score: 85,
    });

    // Foreign key violation causes RPC error
    expect(error).toBeTruthy();
    expect(data).toBeNull();

    // Verify 0 credits were recorded in seller_lead_usage
    const usageCheck = await pgClient.query(`
      SELECT count(*) FROM public.seller_lead_usage 
      WHERE seller_id = '${freeSellerProfileId}' AND enquiry_id = '${fakeEnquiryId}';
    `);
    expect(parseInt(usageCheck.rows[0].count, 10)).toBe(0);
  });

  it("1.2 Idempotency: Duplicate assignment call does not double-charge lead credits", async () => {
    const singleEnquiryId = "f6000000-0000-4000-8000-000000000001";
    await createEnquiry(singleEnquiryId);

    // Call 1: First assignment
    const { data: res1, error: err1 } = await supabaseAdmin.rpc("assign_rfq_lead_with_credit", {
      _enquiry_id: singleEnquiryId,
      _seller_id: freeSellerProfileId,
      _match_score: 90,
    });

    expect(err1).toBeNull();
    const r1 = res1 as { success: boolean; assigned: boolean; already_assigned: boolean };
    expect(r1.success).toBe(true);
    expect(r1.assigned).toBe(true);
    expect(r1.already_assigned).toBe(false);

    // Call 2: Duplicate invocation for same enquiry
    const { data: res2, error: err2 } = await supabaseAdmin.rpc("assign_rfq_lead_with_credit", {
      _enquiry_id: singleEnquiryId,
      _seller_id: freeSellerProfileId,
      _match_score: 90,
    });

    expect(err2).toBeNull();
    const r2 = res2 as { success: boolean; assigned: boolean; already_assigned: boolean };
    expect(r2.success).toBe(true);
    expect(r2.assigned).toBe(false);
    expect(r2.already_assigned).toBe(true);

    // Verify exactly 1 ledger record in seller_lead_usage
    const usageCheck = await pgClient.query(`
      SELECT count(*) FROM public.seller_lead_usage 
      WHERE seller_id = '${freeSellerProfileId}' AND enquiry_id = '${singleEnquiryId}';
    `);
    expect(parseInt(usageCheck.rows[0].count, 10)).toBe(1);
  });

  it("1.3 Multi-Client Concurrency: Parallel distributions serialize and cannot overspend monthly lead allowance", async () => {
    // Current usage for Free seller is 1 (from test 1.2).
    // Free seller max leads is 5. Remaining allowance is exactly 4.
    // We launch 10 concurrent requests to assign 10 distinct enquiries in parallel!
    const enquiryIds: string[] = [];
    for (let i = 2; i <= 11; i++) {
      const eid = `f6000000-0000-4000-8000-0000000000${i.toString().padStart(2, "0")}`;
      enquiryIds.push(eid);
      await createEnquiry(eid);
    }

    // Launch 10 parallel assignments across separate clients
    const results = await Promise.all(
      enquiryIds.map(async (eid) => {
        const client = createAdminClient();
        return client.rpc("assign_rfq_lead_with_credit", {
          _enquiry_id: eid,
          _seller_id: freeSellerProfileId,
          _match_score: 80,
        });
      }),
    );

    let successes = 0;
    let quotaRejections = 0;

    for (const res of results) {
      if (res.error) continue;
      const data = res.data as { success: boolean; error_code?: string };
      if (data.success) {
        successes++;
      } else if (data.error_code === "MONTHLY_LEAD_LIMIT_EXCEEDED") {
        quotaRejections++;
      }
    }

    // Since initial usage was 1, exactly 4 must succeed to hit the cap of 5, and exactly 6 must be blocked!
    expect(successes).toBe(4);
    expect(quotaRejections).toBe(6);

    // Total recorded in ledger must be strictly 5
    const totalUsage = await pgClient.query(`
      SELECT count(*) FROM public.seller_lead_usage WHERE seller_id = '${freeSellerProfileId}';
    `);
    expect(parseInt(totalUsage.rows[0].count, 10)).toBe(5);

    // Entitlement status must show 0 remaining leads
    const entitlements = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(entitlements.canReceiveLeads).toBe(false);
    expect(entitlements.remainingMonthlyLeads).toBe(0);
    expect(entitlements.usedMonthlyLeads).toBe(5);
  });

  it("1.4 Outbox Notification Isolation: In-app notification failure does not revoke lead assignment or refund credit", async () => {
    const notifyEnquiryId = "f6000000-0000-4000-8000-000000000020";
    await createEnquiry(notifyEnquiryId);

    // Use Pro seller who has 50 leads allowance
    const { data: assignRes } = await supabaseAdmin.rpc("assign_rfq_lead_with_credit", {
      _enquiry_id: notifyEnquiryId,
      _seller_id: proSellerProfileId,
      _match_score: 95,
    });
    expect((assignRes as { success: boolean }).success).toBe(true);

    // Simulate notification delivery failure in lead_assignments
    await pgClient.query(`
      UPDATE public.lead_assignments 
      SET notification_status = 'failed', notification_error = 'Simulated push gateway timeout'
      WHERE enquiry_id = '${notifyEnquiryId}' AND seller_id = '${proSellerProfileId}';
    `);

    // Verify lead assignment is still active and accessible
    const assignmentRes = await pgClient.query(`
      SELECT status, notification_status, notification_error 
      FROM public.lead_assignments 
      WHERE enquiry_id = '${notifyEnquiryId}' AND seller_id = '${proSellerProfileId}';
    `);
    expect(assignmentRes.rows[0].status).toBe("assigned");
    expect(assignmentRes.rows[0].notification_status).toBe("failed");

    // Verify credit is NOT refunded (remains 1 consumed)
    const usageRes = await pgClient.query(`
      SELECT credits_consumed FROM public.seller_lead_usage 
      WHERE enquiry_id = '${notifyEnquiryId}' AND seller_id = '${proSellerProfileId}';
    `);
    expect(usageRes.rows.length).toBe(1);
    expect(usageRes.rows[0].credits_consumed).toBe(1);
  });

  // =========================================================================
  // Section 2: Monthly Quota Period & IST Midnight Boundary
  // =========================================================================

  it("2.1 IST Calendar Month Isolation: Usage records on either side of midnight IST partition strictly without overlap", async () => {
    // Record A: Last second of November 2026 IST: '2026-11-30 23:59:59+05:30' (UTC 18:29:59)
    // Record B: First second of December 2026 IST: '2026-12-01 00:00:00+05:30' (UTC 18:30:00)
    const novEnquiry = "f6000000-0000-4000-8000-000000000031";
    const decEnquiry = "f6000000-0000-4000-8000-000000000032";
    await createEnquiry(novEnquiry);
    await createEnquiry(decEnquiry);

    await pgClient.query(`
      INSERT INTO public.seller_lead_usage (seller_id, enquiry_id, billing_period_start, billing_period_end, credits_consumed, action, created_at)
      VALUES 
        ('${proSellerProfileId}', '${novEnquiry}', '2026-11-01 00:00:00+05:30', '2026-12-01 00:00:00+05:30', 1, 'assigned', '2026-11-30 23:59:59+05:30'),
        ('${proSellerProfileId}', '${decEnquiry}', '2026-12-01 00:00:00+05:30', '2027-01-01 00:00:00+05:30', 1, 'assigned', '2026-12-01 00:00:00+05:30');
    `);

    // Query strictly November bucket: [2026-11-01 00:00:00+05:30, 2026-12-01 00:00:00+05:30)
    const novCount = await pgClient.query(`
      SELECT count(*) FROM public.seller_lead_usage 
      WHERE seller_id = '${proSellerProfileId}'
        AND created_at >= ('2026-11-01 00:00:00+05:30'::timestamptz)
        AND created_at < ('2026-12-01 00:00:00+05:30'::timestamptz)
        AND enquiry_id IN ('${novEnquiry}', '${decEnquiry}');
    `);
    expect(parseInt(novCount.rows[0].count, 10)).toBe(1);

    // Query strictly December bucket: [2026-12-01 00:00:00+05:30, 2027-01-01 00:00:00+05:30)
    const decCount = await pgClient.query(`
      SELECT count(*) FROM public.seller_lead_usage 
      WHERE seller_id = '${proSellerProfileId}'
        AND created_at >= ('2026-12-01 00:00:00+05:30'::timestamptz)
        AND created_at < ('2027-01-01 00:00:00+05:30'::timestamptz)
        AND enquiry_id IN ('${novEnquiry}', '${decEnquiry}');
    `);
    expect(parseInt(decCount.rows[0].count, 10)).toBe(1);
  });

  it("2.2 Paid Plan Custom Anniversary: Paid plans evaluate leads over [period_start, period_end]", async () => {
    const entitlements = await getSellerEntitlements(proSellerProfileId, supabaseAdmin);
    expect(entitlements.planCode).toBe("pro");
    expect(entitlements.billingPeriodStart).toBeTruthy();
    expect(entitlements.billingPeriodEnd).toBeTruthy();

    const start = new Date(entitlements.billingPeriodStart!).getTime();
    const end = new Date(entitlements.billingPeriodEnd!).getTime();
    // Paid 30-day Pro plan duration should be approx 30 days
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  // =========================================================================
  // Section 3: Subscription Lifecycle State Machine & Expiration Integrity
  // =========================================================================

  it("3.1 Suspension preserves prior state and restoration returns to exact prior valid status", async () => {
    // 1. Set Pro seller to 'trialing'
    await pgClient.query(`
      UPDATE public.seller_subscriptions 
      SET status = 'trialing', previous_status = NULL 
      WHERE seller_id = '${proSellerProfileId}';
    `);

    // 2. Suspend via RPC
    const { data: suspendRes, error: suspErr } = await supabaseAdmin.rpc("admin_suspend_seller_subscription", {
      _seller_id: proSellerProfileId,
      _reason: "Investigating customer complaints",
    });

    expect(suspErr).toBeNull();
    const suspObj = suspendRes as { success: boolean; status: string; previous_status: string };
    expect(suspObj.status).toBe("suspended");
    expect(suspObj.previous_status).toBe("trialing");

    // Check DB state
    const subCheck = await pgClient.query(`
      SELECT status, previous_status FROM public.seller_subscriptions WHERE seller_id = '${proSellerProfileId}';
    `);
    expect(subCheck.rows[0].status).toBe("suspended");
    expect(subCheck.rows[0].previous_status).toBe("trialing");

    // 3. Restore via RPC
    const { data: restoreRes, error: restErr } = await supabaseAdmin.rpc("admin_restore_seller_subscription", {
      _seller_id: proSellerProfileId,
      _reason: "Investigation completed and resolved",
    });

    expect(restErr).toBeNull();
    const restObj = restoreRes as { success: boolean; status: string; previous_status: string | null };
    expect(restObj.status).toBe("trialing"); // Exact prior valid state preserved!
    expect(restObj.previous_status).toBe("trialing");

    // In the database row, previous_status is cleared to NULL
    const rowCheck = await pgClient.query(`
      SELECT status, previous_status FROM public.seller_subscriptions WHERE seller_id = '${proSellerProfileId}';
    `);
    expect(rowCheck.rows[0].status).toBe("trialing");
    expect(rowCheck.rows[0].previous_status).toBeNull();
  });

  it("3.2 Expiration Safety: Restoring a subscription whose period elapsed while suspended restores as 'expired'", async () => {
    // Set current_period_end to past (e.g. 5 days ago) while suspended
    await pgClient.query(`
      UPDATE public.seller_subscriptions 
      SET 
        status = 'suspended', 
        previous_status = 'active',
        current_period_end = now() - interval '5 days'
      WHERE seller_id = '${proSellerProfileId}';
    `);

    // Restore via RPC
    const { data: restoreRes, error: restErr } = await supabaseAdmin.rpc("admin_restore_seller_subscription", {
      _seller_id: proSellerProfileId,
      _reason: "Admin un-suspending account",
    });

    expect(restErr).toBeNull();
    const restObj = restoreRes as { success: boolean; status: string; was_expired: boolean };
    expect(restObj.status).toBe("expired");
    expect(restObj.was_expired).toBe(true);

    // Verify entitlements now fall back to Free tier limits rather than full Pro limits
    const entitlements = await getSellerEntitlements(proSellerProfileId, supabaseAdmin);
    expect(entitlements.isExpired).toBe(true);
    expect(entitlements.planCode).toBe("free");
    expect(entitlements.maxActiveListings).toBe(5);
  });

  it("3.3 Direct restoration of non-suspended subscription is rejected", async () => {
    // Reset Pro seller to active
    await pgClient.query(`
      UPDATE public.seller_subscriptions 
      SET status = 'active', previous_status = NULL, current_period_end = now() + interval '30 days'
      WHERE seller_id = '${proSellerProfileId}';
    `);

    const { data, error } = await supabaseAdmin.rpc("admin_restore_seller_subscription", {
      _seller_id: proSellerProfileId,
      _reason: "Should fail because not suspended",
    });

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  // =========================================================================
  // Section 4: Listing Quota Concurrency & Archival Protection
  // =========================================================================

  it("4.1 Multi-Client Product Creation Concurrency: Parallel inserts serialize and cannot exceed plan limits", async () => {
    // Free seller currently has 0 products. Limit is 5.
    // We first insert 4 products.
    for (let i = 1; i <= 4; i++) {
      await createProduct(freeSellerProfileId, `Product Base ${i}`, "draft");
    }

    // Now 1 slot is left (4 / 5).
    // Concurrently attempt to insert 5 products via 5 parallel queries.
    const attemptNames = ["P-Conc-1", "P-Conc-2", "P-Conc-3", "P-Conc-4", "P-Conc-5"];

    const results = await Promise.allSettled(
      attemptNames.map(async (name) => {
        const client = new Client({ connectionString: DB_URL });
        await client.connect();
        try {
          const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
          const res = await client.query(`
            INSERT INTO public.products (seller_id, name, slug, moderation_status, material_type, price, price_type, currency, unit)
            VALUES ('${freeSellerProfileId}', '${name}', '${slug}', 'draft', 'Marble', 100, 'fixed', 'INR', 'sq_ft')
            RETURNING id;
          `);
          return res.rows[0].id;
        } finally {
          await client.end();
        }
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    // Exactly 1 must succeed and 4 must fail with listing limit exception
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(4);

    // Total active count must be strictly 5
    const countCheck = await pgClient.query(`
      SELECT count(*) FROM public.products 
      WHERE seller_id = '${freeSellerProfileId}' AND moderation_status NOT IN ('archived', 'rejected');
    `);
    expect(parseInt(countCheck.rows[0].count, 10)).toBe(5);
  });

  it("4.2 Ownership Transfer Quota Enforcement: Transferring product to a seller at capacity is blocked", async () => {
    // Enterprise seller has unlimited quota, create product there
    const entProd = await createProduct(entSellerProfileId, "Transfer Test Slab", "draft");

    // Free seller is at capacity (5 active products). Transferring to Free seller must fail!
    await expect(
      pgClient.query(`
        UPDATE public.products 
        SET seller_id = '${freeSellerProfileId}'
        WHERE id = '${entProd.id}';
      `),
    ).rejects.toThrow(/Listing limit exceeded/i);

    // Product must still belong to Enterprise seller
    const prodOwner = await pgClient.query(`SELECT seller_id FROM public.products WHERE id = '${entProd.id}';`);
    expect(prodOwner.rows[0].seller_id).toBe(entSellerProfileId);
  });

  it("4.3 Over-Limit Archival Protection: Over-limit sellers can archive, but cannot restore until under cap", async () => {
    // Temporarily insert a product as replica (simulating seller who downgraded while having 6 products)
    await pgClient.query(`
      SET session_replication_role = 'replica';
      INSERT INTO public.products (id, seller_id, name, slug, moderation_status, material_type, published_at, price, price_type, currency, unit)
      VALUES ('f7000000-0000-4000-8000-000000000006', '${freeSellerProfileId}', 'Overlimit Item 6', 'overlimit-6', 'approved', 'Marble', now(), 100, 'fixed', 'INR', 'sq_ft');
      SET session_replication_role = 'origin';
    `);

    // Verify 6 active products exist
    const count6 = await pgClient.query(`
      SELECT count(*) FROM public.products WHERE seller_id = '${freeSellerProfileId}' AND moderation_status NOT IN ('archived', 'rejected');
    `);
    expect(parseInt(count6.rows[0].count, 10)).toBe(6);

    // Archiving an item must SUCCEED even when over-limit
    await pgClient.query(`
      UPDATE public.products 
      SET moderation_status = 'archived'
      WHERE id = 'f7000000-0000-4000-8000-000000000006';
    `);

    const archivedCheck = await pgClient.query(`
      SELECT moderation_status FROM public.products WHERE id = 'f7000000-0000-4000-8000-000000000006';
    `);
    expect(archivedCheck.rows[0].moderation_status).toBe("archived");

    // But attempting to unarchive it back to 'pending_review' must FAIL because 5 active products already exist!
    await expect(
      pgClient.query(`
        UPDATE public.products 
        SET moderation_status = 'pending_review'
        WHERE id = 'f7000000-0000-4000-8000-000000000006';
      `),
    ).rejects.toThrow(/Listing limit exceeded/i);
  });

  // =========================================================================
  // Section 5: Supplier Matching Fairness & Gating
  // =========================================================================

  it("5.1 Capability Gating: Enterprise priority boost NEVER bypasses mandatory material capability", async () => {
    // Enterprise seller supplies only Granite
    await createProduct(entSellerProfileId, "Black Galaxy Granite Mega Slab", "approved", "Granite");

    // Pro seller supplies Marble
    await createProduct(proSellerProfileId, "Makrana White Marble Slab", "approved", "Marble");

    // RFQ requests Marble
    const criteria: MatchCriteria = {
      materialType: "Marble",
      stoneVariety: "Makrana",
      deliveryLocation: "Jaipur, Rajasthan",
      quantity: 500,
    };

    const matches = await findMatchingSuppliers(supabaseAdmin, criteria);

    // Enterprise seller does NOT supply Marble and must NOT appear in matches despite +15 priority boost!
    const entMatch = matches.find((m) => m.sellerId === entSellerProfileId);
    expect(entMatch).toBeUndefined();

    // Pro seller does supply Marble and must be matched
    const proMatch = matches.find((m) => m.sellerId === proSellerProfileId);
    expect(proMatch).toBeDefined();
    expect(proMatch?.matchReasons.some((r) => r.includes("Priority Lead Routing"))).toBe(true);
  });

  it("5.2 Unverified Seller Gating: Unverified sellers NEVER receive leads even if they stock the exact material", async () => {
    // Unverified seller supplies Marble
    await createProduct(unverifiedSellerProfileId, "Unverified White Marble", "approved", "Marble");

    const criteria: MatchCriteria = {
      materialType: "Marble",
      deliveryLocation: "Udaipur",
      quantity: 500,
    };

    const matches = await findMatchingSuppliers(supabaseAdmin, criteria);
    const unverifiedMatch = matches.find((m) => m.sellerId === unverifiedSellerProfileId);
    expect(unverifiedMatch).toBeUndefined();
  });

  it("5.3 Quota-Exhausted Gating: Free seller with exhausted monthly allowance is excluded from matches", async () => {
    // Free seller has already used 5/5 leads in previous concurrency test
    // Update an existing product to approved Marble so seller has catalog capability
    await pgClient.query(`
      UPDATE public.products 
      SET moderation_status = 'approved', material_type = 'Marble', published_at = now()
      WHERE id = (
        SELECT id FROM public.products 
        WHERE seller_id = '${freeSellerProfileId}' 
        LIMIT 1
      );
    `);

    const criteria: MatchCriteria = {
      materialType: "Marble",
      deliveryLocation: "Makrana",
      quantity: 200,
    };

    const matches = await findMatchingSuppliers(supabaseAdmin, criteria);

    // Free seller must be excluded due to quota exhaustion
    const freeMatch = matches.find((m) => m.sellerId === freeSellerProfileId);
    expect(freeMatch).toBeUndefined();
  });

  it("5.4 Suspended Seller Gating: Suspended sellers are excluded from matching and distribution", async () => {
    // Suspend Pro seller
    await supabaseAdmin.rpc("admin_suspend_seller_subscription", {
      _seller_id: proSellerProfileId,
      _reason: "Temporary compliance check",
    });

    const criteria: MatchCriteria = {
      materialType: "Marble",
      quantity: 500,
    };

    const matches = await findMatchingSuppliers(supabaseAdmin, criteria);
    const proMatch = matches.find((m) => m.sellerId === proSellerProfileId);
    expect(proMatch).toBeUndefined();

    // Restore Pro seller
    await supabaseAdmin.rpc("admin_restore_seller_subscription", {
      _seller_id: proSellerProfileId,
      _reason: "Compliance check passed",
    });
  });

  // =========================================================================
  // Section 6: Security & Role-Based Access Control (RLS)
  // =========================================================================

  it("6.1 Non-Admin Cannot Execute Admin RPCs", async () => {
    // Simulate non-admin / anon execution of admin RPCs
    const anonClient = new Client({ connectionString: DB_URL });
    await anonClient.connect();

    try {
      // Execute as unprivileged role
      await anonClient.query("SET ROLE anon;");
      await expect(
        anonClient.query(`
          SELECT public.admin_suspend_seller_subscription('${proSellerProfileId}', 'Malicious suspension attempt');
        `),
      ).rejects.toThrow(/Unauthorized/i);
    } finally {
      await anonClient.query("RESET ROLE;");
      await anonClient.end();
    }
  });

  it("6.2 Direct Mutation to seller_lead_usage or seller_subscriptions Blocked by RLS", async () => {
    const unprivilegedClient = new Client({ connectionString: DB_URL });
    await unprivilegedClient.connect();

    try {
      // Execute as authenticated non-admin seller
      await unprivilegedClient.query(`
        SET ROLE authenticated;
        SET request.jwt.claims = '{"sub": "${freeSellerUserId}", "role": "authenticated"}';
      `);

      // 1. Direct update to upgrade own subscription must be blocked by RLS
      const subUpdateRes = await unprivilegedClient.query(`
        UPDATE public.seller_subscriptions 
        SET plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'enterprise')
        WHERE seller_id = '${freeSellerProfileId}';
      `);
      expect(subUpdateRes.rowCount).toBe(0); // 0 rows affected due to RLS filter

      // 2. Direct insert to falsify lead usage must be actively rejected by RLS
      await expect(
        unprivilegedClient.query(`
          INSERT INTO public.seller_lead_usage (seller_id, enquiry_id, billing_period_start, billing_period_end, action, credits_consumed)
          VALUES ('${freeSellerProfileId}', '${testEnquiryId}', now(), now() + interval '1 month', 'assigned', 1);
        `),
      ).rejects.toThrow(/violates row-level security policy/i);
    } finally {
      await unprivilegedClient.query("RESET ROLE;");
      await unprivilegedClient.end();
    }
  });
});
