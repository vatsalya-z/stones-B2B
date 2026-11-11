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
  getSellerEntitlements,
  assertCanCreateProduct,
  assertCanReceiveLead,
  consumeLeadCredit,
} from "@/features/subscription/entitlements";
import { findMatchingSuppliers } from "@/features/matching/supplier-matching";

const DB_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("StoneB2B Phase 4.1 — Subscription Entitlement Hardening Real DB Tests", () => {
  let pgClient: Client;
  const supabaseAdmin = createAdminClient();

  // Synthetic deterministic UUIDs
  const freeSellerUserId = "d1111111-1111-4111-8111-111111111111";
  const freeSellerProfileId = "d2222222-2222-4222-8222-222222222222";

  const destSellerUserId = "d3333333-3333-4333-8333-333333333333";
  const destSellerProfileId = "d4444444-4444-4444-8444-444444444444";

  const enterpriseSellerUserId = "d5555555-5555-4555-8555-555555555555";
  const enterpriseSellerProfileId = "d6666666-6666-4666-8666-666666666666";

  const buyerUserId = "d7777777-7777-4777-8777-777777777777";
  const testEnquiryId = "d8888888-8888-4888-8888-888888888888";

  async function cleanSyntheticRecords() {
    await pgClient.query(`
      SET session_replication_role = 'replica';
      DELETE FROM public.seller_lead_usage 
      WHERE seller_id IN ('${freeSellerProfileId}', '${destSellerProfileId}', '${enterpriseSellerProfileId}');
      
      DELETE FROM public.subscription_events 
      WHERE seller_id IN ('${freeSellerProfileId}', '${destSellerProfileId}', '${enterpriseSellerProfileId}');

      DELETE FROM public.seller_subscriptions 
      WHERE seller_id IN ('${freeSellerProfileId}', '${destSellerProfileId}', '${enterpriseSellerProfileId}');

      DELETE FROM public.lead_assignments
      WHERE seller_id IN ('${freeSellerProfileId}', '${destSellerProfileId}', '${enterpriseSellerProfileId}');

      DELETE FROM public.products 
      WHERE seller_id IN ('${freeSellerProfileId}', '${destSellerProfileId}', '${enterpriseSellerProfileId}');

      DELETE FROM public.enquiries WHERE id = '${testEnquiryId}' OR id::text LIKE 'e0000000-%';

      DELETE FROM public.seller_profiles 
      WHERE id IN ('${freeSellerProfileId}', '${destSellerProfileId}', '${enterpriseSellerProfileId}');

      DELETE FROM public.user_roles
      WHERE user_id IN ('${freeSellerUserId}', '${destSellerUserId}', '${enterpriseSellerUserId}', '${buyerUserId}');

      DELETE FROM public.profiles 
      WHERE id IN ('${freeSellerUserId}', '${destSellerUserId}', '${enterpriseSellerUserId}', '${buyerUserId}');

      DELETE FROM auth.users
      WHERE id IN ('${freeSellerUserId}', '${destSellerUserId}', '${enterpriseSellerUserId}', '${buyerUserId}');
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
      VALUES ('${sellerId}', '${name}', '${slug}', '${status}', '${material}', ${publishedAt}, 100, 'fixed', 'INR', 'sq_ft')
      RETURNING id, name, moderation_status;
    `);
    return res.rows[0];
  }

  beforeAll(async () => {
    pgClient = new Client({ connectionString: DB_URL });
    await pgClient.connect();

    await cleanSyntheticRecords();

    // 1. Create Base Auth Users & Roles
    await pgClient.query(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${freeSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'free_hardened@stoneb2b.test', '{"full_name": "Free Hardened Seller", "account_type": "seller"}', now(), now()),
        ('${destSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dest_hardened@stoneb2b.test', '{"full_name": "Dest Hardened Seller", "account_type": "seller"}', now(), now()),
        ('${enterpriseSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ent_hardened@stoneb2b.test', '{"full_name": "Enterprise Hardened Seller", "account_type": "seller"}', now(), now()),
        ('${buyerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'buyer_hardened@stoneb2b.test', '{"full_name": "Hardened Buyer", "account_type": "buyer"}', now(), now())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.user_roles (user_id, role)
      VALUES 
        ('${freeSellerUserId}', 'seller'),
        ('${destSellerUserId}', 'seller'),
        ('${enterpriseSellerUserId}', 'seller'),
        ('${buyerUserId}', 'buyer')
      ON CONFLICT (user_id, role) DO NOTHING;

      UPDATE public.profiles SET account_status = 'active'
      WHERE id IN ('${freeSellerUserId}', '${destSellerUserId}', '${enterpriseSellerUserId}', '${buyerUserId}');
    `);

    // 2. Create Seller Profiles
    await pgClient.query(`
      INSERT INTO public.seller_profiles (id, user_id, business_name, slug, verification_status, business_type, city, state, country, years_in_business)
      VALUES 
        ('${freeSellerProfileId}', '${freeSellerUserId}', 'Free Hardened Stones Ltd', 'free-hardened-stones', 'verified', 'manufacturer', 'Makrana', 'Rajasthan', 'IN', 5),
        ('${destSellerProfileId}', '${destSellerUserId}', 'Destination Capacity Marble', 'dest-capacity-marble', 'verified', 'stone_supplier', 'Ongole', 'Andhra Pradesh', 'IN', 10),
        ('${enterpriseSellerProfileId}', '${enterpriseSellerUserId}', 'Enterprise Mega Quarry', 'enterprise-mega-quarry', 'verified', 'mine_owner', 'Udaipur', 'Rajasthan', 'IN', 25)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Set Up Subscriptions (Free, Free, Enterprise)
    await pgClient.query(`
      UPDATE public.seller_subscriptions 
      SET plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'free'),
          status = 'active'
      WHERE seller_id = '${freeSellerProfileId}';

      UPDATE public.seller_subscriptions 
      SET plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'free'),
          status = 'active'
      WHERE seller_id = '${destSellerProfileId}';

      UPDATE public.seller_subscriptions 
      SET plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'enterprise'),
          status = 'active',
          current_period_end = NULL,
          promotional_grant = true
      WHERE seller_id = '${enterpriseSellerProfileId}';
    `);

    // 4. Create a test enquiry for lead tests
    await pgClient.query(`
      INSERT INTO public.enquiries (id, buyer_id, enquiry_title, description, enquiry_type, quantity, unit, status)
      VALUES ('${testEnquiryId}', '${buyerUserId}', 'Test Architectural Marble RFQ', '1000 sq ft Makrana white', 'rfq', 1000, 'sq_ft', 'submitted')
      ON CONFLICT (id) DO NOTHING;
    `);
  });

  afterAll(async () => {
    try {
      await cleanSyntheticRecords();
    } catch {
      // Ignore cleanup error on shutdown
    }
    await pgClient.end();
  });

  // =========================================================================
  // 1. LISTING QUOTA SECURITY & EDGE CASES
  // =========================================================================

  it("1.1 Destination seller quota cannot be bypassed by ownership change (seller_id transfer)", async () => {
    // Fill destination seller up to Free plan capacity (5 active listings)
    for (let i = 0; i < 5; i++) {
      await createProduct(destSellerProfileId, `Dest Pre-fill Slab ${i}`, "approved");
    }

    const destEntitlements = await getSellerEntitlements(destSellerProfileId, supabaseAdmin);
    expect(destEntitlements.activeListingsCount).toBe(5);
    expect(destEntitlements.canCreateListing).toBe(false);

    // Create 1 product owned by freeSeller
    const freeProduct = await createProduct(freeSellerProfileId, "Transfer Test Slab", "draft");

    // Attempt to transfer product ownership to destination seller (which is at capacity 5/5)
    let transferError: Error | null = null;
    try {
      await pgClient.query(`
        UPDATE public.products
        SET seller_id = '${destSellerProfileId}'
        WHERE id = '${freeProduct.id}';
      `);
    } catch (err: unknown) {
      transferError = err as Error;
    }

    expect(transferError).not.toBeNull();
    expect(transferError?.message).toContain("Listing limit exceeded");

    // Verify product ownership remained with original seller
    const verifyOwner = await pgClient.query(`
      SELECT seller_id FROM public.products WHERE id = '${freeProduct.id}';
    `);
    expect(verifyOwner.rows[0].seller_id).toBe(freeSellerProfileId);
  });

  it("1.2 Over-limit sellers can always archive products to manage catalogue", async () => {
    // Fill freeSeller up to 5 products
    for (let i = 0; i < 4; i++) {
      await createProduct(freeSellerProfileId, `Free Seller Slab ${i}`, "draft");
    }

    const check = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(check.activeListingsCount).toBe(5);
    expect(check.canCreateListing).toBe(false);

    // Pick 1 product and transition it to 'archived'
    const productToArchive = await pgClient.query(`
      SELECT id FROM public.products WHERE seller_id = '${freeSellerProfileId}' LIMIT 1;
    `);
    const prodId = productToArchive.rows[0].id;

    // Transitioning to archived must SUCCEED without error
    const archiveRes = await pgClient.query(`
      UPDATE public.products
      SET moderation_status = 'archived'
      WHERE id = '${prodId}'
      RETURNING moderation_status;
    `);
    expect(archiveRes.rows[0].moderation_status).toBe("archived");

    // After archiving, active count is 4, so canCreateListing opens up!
    const afterArchive = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(afterArchive.activeListingsCount).toBe(4);
    expect(afterArchive.remainingListings).toBe(1);
    expect(afterArchive.canCreateListing).toBe(true);
  });

  it("1.3 Downgrading or expiring does not delete products, but blocks new creation until under limit", async () => {
    // Fill up to 5 again
    await createProduct(freeSellerProfileId, "Replacement Slab", "approved");
    const fullCheck = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(fullCheck.activeListingsCount).toBe(5);

    // Simulate over-limit situation by manually setting custom_max_listings = 3 (lower than existing 5)
    await pgClient.query(`
      UPDATE public.seller_subscriptions
      SET custom_max_listings = 3
      WHERE seller_id = '${freeSellerProfileId}';
    `);

    const overCheck = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(overCheck.activeListingsCount).toBe(5);
    expect(overCheck.maxActiveListings).toBe(3);
    expect(overCheck.isOverListingLimit).toBe(true);
    expect(overCheck.canCreateListing).toBe(false);

    // Assert that TypeScript assertion also cleanly blocks
    const assertRes = await assertCanCreateProduct(freeSellerProfileId, supabaseAdmin);
    expect(assertRes.allowed).toBe(false);
    expect(assertRes.reason).toContain("Listing limit reached");

    // Attempting to insert a 6th product must be rejected by PostgreSQL trigger
    let insertError: Error | null = null;
    try {
      await createProduct(freeSellerProfileId, "Illegal Over-limit Slab", "draft");
    } catch (err: unknown) {
      insertError = err as Error;
    }
    expect(insertError).not.toBeNull();
    expect(insertError?.message).toContain("Listing limit exceeded");

    // Reset custom limit back to default
    await pgClient.query(`
      UPDATE public.seller_subscriptions
      SET custom_max_listings = NULL
      WHERE seller_id = '${freeSellerProfileId}';
    `);
  });

  // =========================================================================
  // 2. MONTHLY LEAD ALLOWANCE ENGINE
  // =========================================================================

  it("2.1 Free plan seller has a 5 monthly lead allowance and consumes credits atomically", async () => {
    const entitlements = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(entitlements.maxMonthlyLeads).toBe(5);
    expect(entitlements.usedMonthlyLeads).toBe(0);
    expect(entitlements.remainingMonthlyLeads).toBe(5);
    expect(entitlements.canReceiveLeads).toBe(true);

    // Consume 1 lead credit for testEnquiryId
    const res1 = await consumeLeadCredit(freeSellerProfileId, testEnquiryId, supabaseAdmin);
    expect(res1.success).toBe(true);
    expect(res1.used).toBe(1);
    expect(res1.remaining).toBe(4);
    expect(res1.alreadyConsumed).toBe(false);

    // Verify DB ledger record
    const ledgerCheck = await pgClient.query(`
      SELECT seller_id, enquiry_id, credits_consumed, action
      FROM public.seller_lead_usage
      WHERE seller_id = '${freeSellerProfileId}' AND enquiry_id = '${testEnquiryId}';
    `);
    expect(ledgerCheck.rowCount).toBe(1);
    expect(ledgerCheck.rows[0].credits_consumed).toBe(1);
    expect(ledgerCheck.rows[0].action).toBe("assigned");
  });

  it("2.2 Duplicate enquiry assignment does not consume additional lead credits (idempotent)", async () => {
    // Calling consumeLeadCredit with the same (seller_id, enquiry_id) again
    const resDuplicate = await consumeLeadCredit(freeSellerProfileId, testEnquiryId, supabaseAdmin);
    expect(resDuplicate.success).toBe(true);
    expect(resDuplicate.alreadyConsumed).toBe(true);
    expect(resDuplicate.used).toBe(1); // Still 1, NOT 2!
    expect(resDuplicate.remaining).toBe(4);

    // Verify only 1 row exists in public.seller_lead_usage
    const countCheck = await pgClient.query(`
      SELECT count(*) FROM public.seller_lead_usage
      WHERE seller_id = '${freeSellerProfileId}';
    `);
    expect(parseInt(countCheck.rows[0].count, 10)).toBe(1);
  });

  it("2.3 Monthly lead allowance exhaustion blocks further lead assignments", async () => {
    // Consume remaining 4 leads using synthetic enquiries
    for (let i = 2; i <= 5; i++) {
      const synEnquiryId = `e0000000-0000-4000-8000-00000000000${i}`;
      await pgClient.query(`
        INSERT INTO public.enquiries (id, buyer_id, enquiry_title, description, enquiry_type, quantity, unit, status)
        VALUES ('${synEnquiryId}', '${buyerUserId}', 'Synthetic RFQ ${i}', 'Description', 'rfq', 500, 'sq_ft', 'submitted')
        ON CONFLICT (id) DO NOTHING;
      `);
      const consumeRes = await consumeLeadCredit(freeSellerProfileId, synEnquiryId, supabaseAdmin);
      expect(consumeRes.success).toBe(true);
    }

    // Now seller has consumed 5/5 leads
    const exhaustedEntitlements = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(exhaustedEntitlements.usedMonthlyLeads).toBe(5);
    expect(exhaustedEntitlements.remainingMonthlyLeads).toBe(0);
    expect(exhaustedEntitlements.canReceiveLeads).toBe(false);

    const checkGate = await assertCanReceiveLead(freeSellerProfileId, supabaseAdmin);
    expect(checkGate.allowed).toBe(false);
    expect(checkGate.reason).toContain("Monthly lead quota exhausted");

    // Attempting to consume 6th lead must fail
    const synEnquiry6 = `e0000000-0000-4000-8000-000000000006`;
    await pgClient.query(`
      INSERT INTO public.enquiries (id, buyer_id, enquiry_title, description, enquiry_type, quantity, unit, status)
      VALUES ('${synEnquiry6}', '${buyerUserId}', 'Synthetic RFQ 6', 'Description', 'rfq', 500, 'sq_ft', 'submitted')
      ON CONFLICT (id) DO NOTHING;
    `);

    const res6 = await consumeLeadCredit(freeSellerProfileId, synEnquiry6, supabaseAdmin);
    expect(res6.success).toBe(false);
    expect(res6.error).toContain("Monthly lead quota exhausted");
  });

  it("2.4 Enterprise seller has unlimited monthly leads", async () => {
    const entEntitlements = await getSellerEntitlements(enterpriseSellerProfileId, supabaseAdmin);
    expect(entEntitlements.isUnlimitedLeads).toBe(true);
    expect(entEntitlements.maxMonthlyLeads).toBeNull();
    expect(entEntitlements.canReceiveLeads).toBe(true);

    const consumeEnt = await consumeLeadCredit(enterpriseSellerProfileId, testEnquiryId, supabaseAdmin);
    expect(consumeEnt.success).toBe(true);
    expect(consumeEnt.remaining).toBeNull(); // Unlimited
  });

  // =========================================================================
  // 3. SUBSCRIPTION LIFECYCLE & ADMINISTRATIVE SUSPENSION
  // =========================================================================

  it("3.1 Suspended subscription blocks product creation and lead consumption", async () => {
    // Administratively suspend destSeller
    await pgClient.query(`
      UPDATE public.seller_subscriptions
      SET status = 'suspended'
      WHERE seller_id = '${destSellerProfileId}';
    `);

    const suspEntitlements = await getSellerEntitlements(destSellerProfileId, supabaseAdmin);
    expect(suspEntitlements.status).toBe("suspended");
    expect(suspEntitlements.isSuspended).toBe(true);
    expect(suspEntitlements.canCreateListing).toBe(false);
    expect(suspEntitlements.canReceiveLeads).toBe(false);

    // Product creation blocked
    let prodError: Error | null = null;
    try {
      await createProduct(destSellerProfileId, "Suspended Attempt Slab", "draft");
    } catch (err: unknown) {
      prodError = err as Error;
    }
    expect(prodError).not.toBeNull();
    expect(prodError?.message).toContain("Listing blocked: Seller subscription is currently suspended");

    // Lead credit consumption blocked
    const leadRes = await consumeLeadCredit(destSellerProfileId, testEnquiryId, supabaseAdmin);
    expect(leadRes.success).toBe(false);
    expect(leadRes.error).toContain("Seller subscription is suspended");
  });

  it("3.2 Admin restoration unblocks product creation and restores entitlements", async () => {
    // Restore destSeller to active
    await pgClient.query(`
      UPDATE public.seller_subscriptions
      SET status = 'active'
      WHERE seller_id = '${destSellerProfileId}';
    `);

    const activeEntitlements = await getSellerEntitlements(destSellerProfileId, supabaseAdmin);
    expect(activeEntitlements.status).toBe("active");
    expect(activeEntitlements.isSuspended).toBe(false);
    expect(activeEntitlements.canReceiveLeads).toBe(true);
  });

  // =========================================================================
  // 4. FEATURE ENTITLEMENTS & PRIORITY MATCHING
  // =========================================================================

  it("4.1 Supplier matching grants Priority Lead Routing score boost to Pro/Enterprise sellers", async () => {
    // Seed approved marble product for enterprise seller
    await createProduct(enterpriseSellerProfileId, "Enterprise Italian Carrara Marble", "approved", "Marble");

    const matches = await findMatchingSuppliers(supabaseAdmin, {
      materialType: "Marble",
      deliveryLocation: "Rajasthan",
    });

    const entMatch = matches.find((m) => m.sellerId === enterpriseSellerProfileId);
    expect(entMatch).toBeDefined();
    expect(entMatch?.matchReasons.some((r) => r.includes("Priority Lead Routing"))).toBe(true);
  });

  it("4.2 Direct seller cannot modify their own subscription plan or lead ledger via RLS", async () => {
    // RLS policy on seller_subscriptions permits manage only for is_admin()
    const allSubPolicies = await pgClient.query(`
      SELECT polname, pg_get_expr(polqual, polrelid) as qual
      FROM pg_policy 
      WHERE polrelid = 'public.seller_subscriptions'::regclass;
    `);
    const adminManageSub = allSubPolicies.rows.find((p) => p.polname === "seller_subscriptions_admin_manage");
    expect(adminManageSub).toBeDefined();
    expect(adminManageSub.qual).toContain("is_admin()");

    // RLS policy on seller_lead_usage restricts management to is_admin()
    const allLeadPolicies = await pgClient.query(`
      SELECT polname, pg_get_expr(polqual, polrelid) as qual
      FROM pg_policy 
      WHERE polrelid = 'public.seller_lead_usage'::regclass;
    `);
    const adminManageLead = allLeadPolicies.rows.find((p) => p.polname === "seller_lead_usage_admin_manage");
    expect(adminManageLead).toBeDefined();
    expect(adminManageLead.qual).toContain("is_admin()");
  });
});
