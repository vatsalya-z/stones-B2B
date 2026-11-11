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
} from "@/features/subscription/entitlements";

/**
 * StoneB2B Phase 4 — Seller Subscription & Monetization Engine Integration Tests
 *
 * Validates plan limits, concurrent creation locks, grace period fallbacks,
 * RLS security boundaries, audit trails, and product moderation compatibility
 * against the live local PostgreSQL instance.
 */

const LOCAL_DB_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("StoneB2B Phase 4 — Real PostgreSQL Subscription Integration Tests", () => {
  let pgClient: Client;
  let supabaseAdmin: ReturnType<typeof createAdminClient>;

  // Synthetic Test Fixture IDs
  const adminUserId = "a0000000-0000-4000-8000-000000000001";
  const buyerUserId = "b0000000-0000-4000-8000-000000000002";
  const freeSellerUserId = "c0000000-0000-4000-8000-000000000003";
  const proSellerUserId = "d0000000-0000-4000-8000-000000000004";
  const entSellerUserId = "e0000000-0000-4000-8000-000000000005";

  const freeSellerProfileId = "baaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const proSellerProfileId = "caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const entSellerProfileId = "daaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  const marbleCategoryId = "4c4f27c9-ae4b-43c4-a84a-7f3a53ba29e0";

  beforeAll(async () => {
    pgClient = new Client({
      connectionString: LOCAL_DB_URL,
      ssl: false,
    });
    await pgClient.connect();

    supabaseAdmin = createAdminClient();

    // Clean any previous artifacts
    await cleanSyntheticRecords();

    // 1. Seed Synthetic Auth Users
    await pgClient.query(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${adminUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-sub-admin@stonesdekho.local', '{"full_name": "Synthetic Admin", "account_type": "admin"}', now(), now()),
        ('${buyerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-sub-buyer@dlf.local', '{"full_name": "Synthetic Buyer", "account_type": "buyer"}', now(), now()),
        ('${freeSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-sub-free@makrana.local', '{"full_name": "Synthetic Free Seller", "account_type": "seller"}', now(), now()),
        ('${proSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-sub-pro@granite.local', '{"full_name": "Synthetic Pro Seller", "account_type": "seller"}', now(), now()),
        ('${entSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-sub-ent@sandstone.local', '{"full_name": "Synthetic Ent Seller", "account_type": "seller"}', now(), now())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.user_roles (user_id, role)
      VALUES ('${adminUserId}', 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;

      UPDATE public.profiles SET account_status = 'active'
      WHERE id IN ('${adminUserId}', '${buyerUserId}', '${freeSellerUserId}', '${proSellerUserId}', '${entSellerUserId}');
    `);

    // 2. Seed Synthetic Seller Profiles
    await pgClient.query(`
      INSERT INTO public.seller_profiles (id, user_id, business_name, slug, business_type, city, state, country, verification_status, years_in_business)
      VALUES 
        ('${freeSellerProfileId}', '${freeSellerUserId}', 'Synthetic Free Makrana Marble', 'synth-free-makrana', 'manufacturer', 'Makrana', 'Rajasthan', 'IN', 'verified', 5),
        ('${proSellerProfileId}', '${proSellerUserId}', 'Synthetic Pro Granite Corp', 'synth-pro-granite', 'stone_supplier', 'Bengaluru', 'Karnataka', 'IN', 'verified', 15),
        ('${entSellerProfileId}', '${entSellerUserId}', 'Synthetic Enterprise Stone Ltd', 'synth-ent-stone', 'manufacturer', 'Udaipur', 'Rajasthan', 'IN', 'verified', 30)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Configure Active Subscriptions for Pro and Enterprise Sellers
    await pgClient.query(`
      UPDATE public.seller_subscriptions 
      SET plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'pro'),
          current_period_end = now() + interval '30 days',
          promotional_grant = false
      WHERE seller_id = '${proSellerProfileId}';

      UPDATE public.seller_subscriptions 
      SET plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'enterprise'),
          current_period_end = NULL,
          promotional_grant = true
      WHERE seller_id = '${entSellerProfileId}';
    `);
  });

  afterAll(async () => {
    await cleanSyntheticRecords();
    if (pgClient) {
      await pgClient.end();
    }
  });

  async function cleanSyntheticRecords() {
    if (!pgClient) return;
    try {
      await pgClient.query(`
        SET session_replication_role = 'replica';
        DELETE FROM public.subscription_events WHERE seller_id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}');
        DELETE FROM public.seller_subscriptions WHERE seller_id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}');
        DELETE FROM public.products WHERE seller_id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}');
        DELETE FROM public.seller_profiles WHERE id IN ('${freeSellerProfileId}', '${proSellerProfileId}', '${entSellerProfileId}');
        DELETE FROM public.user_roles WHERE user_id IN ('${adminUserId}', '${buyerUserId}', '${freeSellerUserId}', '${proSellerUserId}', '${entSellerUserId}');
        DELETE FROM public.profiles WHERE id IN ('${adminUserId}', '${buyerUserId}', '${freeSellerUserId}', '${proSellerUserId}', '${entSellerUserId}');
        DELETE FROM auth.users WHERE id IN ('${adminUserId}', '${buyerUserId}', '${freeSellerUserId}', '${proSellerUserId}', '${entSellerUserId}')
          OR email IN ('synth-sub-admin@stonesdekho.local', 'synth-sub-buyer@dlf.local', 'synth-sub-free@makrana.local', 'synth-sub-pro@granite.local', 'synth-sub-ent@sandstone.local');
        SET session_replication_role = 'origin';
      `);
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }

  // Helper to create synthetic products
  async function createProduct(sellerId: string, name: string, status = "approved") {
    const slug = `synth-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const publishedAt = status === "approved" ? "now()" : "NULL";
    return pgClient.query(`
      INSERT INTO public.products (
        seller_id, category_id, name, slug, material_type, stone_origin, description, moderation_status, published_at, price, price_type, currency, unit
      ) VALUES (
        '${sellerId}', '${marbleCategoryId}', '${name}', '${slug}', 'Marble', 'Rajasthan', 'Premium stone', '${status}', ${publishedAt}, 150, 'fixed', 'INR', 'sq_ft'
      ) RETURNING id, moderation_status, slug;
    `);
  }

  // 1. Free plan seller can create up to 5 active listings
  it("1. Free plan seller can create up to 5 active listings", async () => {
    // Free seller was auto-enrolled on trigger or fallback
    const entitlementsBefore = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(entitlementsBefore.planCode).toBe("free");
    expect(entitlementsBefore.maxActiveListings).toBe(5);

    for (let i = 1; i <= 5; i++) {
      const res = await createProduct(freeSellerProfileId, `Free Makrana Marble Slab ${i}`, "draft");
      expect(res.rows.length).toBe(1);
    }

    const entitlementsAfter = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(entitlementsAfter.activeListingsCount).toBe(5);
    expect(entitlementsAfter.remainingListings).toBe(0);
    expect(entitlementsAfter.canCreateListing).toBe(false);
  });

  // 2. Sixth active listing is rejected
  it("2. Sixth active listing is rejected by PostgreSQL trigger", async () => {
    let limitError: { message?: string; code?: string } | null = null;
    try {
      await createProduct(freeSellerProfileId, "Sixth Makrana Slab — Should Be Blocked", "draft");
    } catch (err) {
      limitError = err as { message?: string; code?: string };
    }

    expect(limitError).not.toBeNull();
    // PostgreSQL error code P0001 (raise_exception from trigger)
    expect(limitError?.code).toBe("P0001");
    expect(limitError?.message).toContain("Listing limit exceeded");
  });

  // 3. Pro plan seller can create up to 100 listings
  it("3. Pro plan seller has high listing capacity (100 listings)", async () => {
    const entitlements = await getSellerEntitlements(proSellerProfileId, supabaseAdmin);
    expect(entitlements.planCode).toBe("pro");
    expect(entitlements.maxActiveListings).toBe(100);
    expect(entitlements.canCreateListing).toBe(true);

    // Can create products without getting blocked at 5
    for (let i = 1; i <= 6; i++) {
      const res = await createProduct(proSellerProfileId, `Pro Black Granite ${i}`, "approved");
      expect(res.rows.length).toBe(1);
    }

    const updated = await getSellerEntitlements(proSellerProfileId, supabaseAdmin);
    expect(updated.activeListingsCount).toBe(6);
    expect(updated.remainingListings).toBe(94);
  });

  // 4. Enterprise listing limit behaves as unlimited
  it("4. Enterprise listing limit behaves as unlimited", async () => {
    const entitlements = await getSellerEntitlements(entSellerProfileId, supabaseAdmin);
    expect(entitlements.planCode).toBe("enterprise");
    expect(entitlements.isUnlimited).toBe(true);
    expect(entitlements.maxActiveListings).toBeNull();
    expect(entitlements.remainingListings).toBeNull();
    expect(entitlements.canCreateListing).toBe(true);
  });

  // 5. Rejected products do not consume active capacity
  it("5. Rejected products do not consume active capacity", async () => {
    // Current free seller active count is 5
    // Change one of the products to rejected
    const { rows: products } = await pgClient.query(`
      SELECT id FROM public.products WHERE seller_id = '${freeSellerProfileId}' LIMIT 1;
    `);
    const prodId = products[0].id;

    await pgClient.query(`
      UPDATE public.products SET moderation_status = 'rejected' WHERE id = '${prodId}';
    `);

    // Active count should now be 4
    const entitlements = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(entitlements.activeListingsCount).toBe(4);
    expect(entitlements.remainingListings).toBe(1);
    expect(entitlements.canCreateListing).toBe(true);

    // Now inserting a 5th active product should succeed
    const newProd = await createProduct(freeSellerProfileId, "New Replacement Slab After Rejection", "draft");
    expect(newProd.rows.length).toBe(1);
  });

  // 6. Archived products follow documented counting policy
  it("6. Archived products follow documented counting policy", async () => {
    // Seller has 5 active products again.
    // Archive one active product
    const { rows: products } = await pgClient.query(`
      SELECT id FROM public.products 
      WHERE seller_id = '${freeSellerProfileId}' AND moderation_status NOT IN ('archived', 'rejected')
      LIMIT 1;
    `);
    const prodId = products[0].id;

    await pgClient.query(`
      UPDATE public.products SET moderation_status = 'archived' WHERE id = '${prodId}';
    `);

    // Verify active capacity is freed up
    const entitlements = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(entitlements.activeListingsCount).toBe(4);
    expect(entitlements.remainingListings).toBe(1);

    // Can create replacement product
    const newProd = await createProduct(freeSellerProfileId, "Active Replacement For Archived", "approved");
    expect(newProd.rows.length).toBe(1);
  });

  // 7. Expired subscriptions fall back to Free plan entitlement policy
  it("7. Expired subscriptions fall back to Free plan entitlement policy", async () => {
    // Temporarily expire Pro seller's subscription (past grace period)
    await pgClient.query(`
      UPDATE public.seller_subscriptions 
      SET current_period_end = now() - interval '10 days',
          grace_period_end = now() - interval '3 days'
      WHERE seller_id = '${proSellerProfileId}' AND status = 'active';
    `);

    const expiredEntitlements = await getSellerEntitlements(proSellerProfileId, supabaseAdmin);
    expect(expiredEntitlements.isExpired).toBe(true);
    // Max listings falls back to Free plan (5)
    expect(expiredEntitlements.maxActiveListings).toBe(5);

    // Restore active period for subsequent tests
    await pgClient.query(`
      UPDATE public.seller_subscriptions 
      SET current_period_end = now() + interval '30 days',
          grace_period_end = NULL
      WHERE seller_id = '${proSellerProfileId}';
    `);
  });

  // 8. Concurrent product creation cannot exceed plan limits
  it("8. Concurrent product creation cannot exceed plan limits", async () => {
    // Set Free seller active listings to 4 (so exactly 1 slot remains)
    await pgClient.query(`
      UPDATE public.products 
      SET moderation_status = 'archived' 
      WHERE id IN (
        SELECT id FROM public.products 
        WHERE seller_id = '${freeSellerProfileId}' AND moderation_status NOT IN ('archived', 'rejected') 
        LIMIT 2
      );
    `);

    const check = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    const expectedRemaining = check.remainingListings ?? 0;
    expect(expectedRemaining).toBeGreaterThanOrEqual(1);

    // Fire 6 concurrent insert attempts simultaneously
    const attempts = Array.from({ length: 6 }).map((_, idx) =>
      createProduct(freeSellerProfileId, `Concurrent Race Slab ${idx}`, "draft"),
    );

    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    // Exactly the remaining capacity was fulfilled; excess was blocked by the lock/trigger
    expect(succeeded.length).toBe(expectedRemaining);
    expect(failed.length).toBe(6 - expectedRemaining);

    // Verify total active listings strictly equals 5 (never 6 or more)
    const finalEntitlements = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(finalEntitlements.activeListingsCount).toBe(5);
  });

  // 9. Buyer cannot access seller subscription records
  it("9. Buyer cannot access seller subscription records via RLS", async () => {
    // When evaluating without seller ownership, is_seller_owner() returns false
    const isOwnerRes = await pgClient.query(`
      SELECT public.is_seller_owner('${freeSellerProfileId}') as is_owner;
    `);
    expect(isOwnerRes.rows[0].is_owner).toBe(false);

    // Verify RLS policy restricts seller_subscriptions select to is_seller_owner() or is_admin()
    const rlsPolicies = await pgClient.query(`
      SELECT polname, pg_get_expr(polqual, polrelid) as qual
      FROM pg_policy 
      WHERE polrelid = 'public.seller_subscriptions'::regclass AND polcmd = 'r';
    `);
    const selectPolicy = rlsPolicies.rows.find((p) => p.polname === "seller_subscriptions_select");
    expect(selectPolicy).toBeDefined();
    expect(selectPolicy.qual).toContain("is_seller_owner");
    expect(selectPolicy.qual).toContain("is_admin");
  });

  // 10. Seller cannot modify their own plan or subscription status
  it("10. Seller cannot modify their own plan or subscription status", async () => {
    // Verify RLS policy restricts management on seller_subscriptions to admins only
    const allPolicies = await pgClient.query(`
      SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as qual
      FROM pg_policy 
      WHERE polrelid = 'public.seller_subscriptions'::regclass;
    `);
    const adminManagePolicy = allPolicies.rows.find((p) => p.polname === "seller_subscriptions_admin_manage");
    expect(adminManagePolicy).toBeDefined();
    expect(adminManagePolicy.qual).toContain("is_admin()");
  });

  // 11. Admin authorization works
  it("11. Admin authorization works via admin_modify_seller_subscription RPC", async () => {
    // Call admin RPC within a transaction setting the admin JWT claim
    await pgClient.query("BEGIN;");
    await pgClient.query(`SET LOCAL "request.jwt.claim.sub" = '${adminUserId}';`);
    const res = await pgClient.query(`
      SELECT public.admin_modify_seller_subscription(
        '${freeSellerProfileId}',
        'pro',
        'VIP Quarry Onboarding Grant',
        true,
        NULL,
        60
      ) as result;
    `);
    await pgClient.query("COMMIT;");

    expect(res.rows.length).toBe(1);
    const result = res.rows[0].result;
    expect(result.success).toBe(true);
    expect(result.plan_code).toBe("pro");

    // Entitlements should reflect Pro plan now
    const updated = await getSellerEntitlements(freeSellerProfileId, supabaseAdmin);
    expect(updated.planCode).toBe("pro");
    expect(updated.isPromotional).toBe(true);
  });

  // 12. Promotional plan grants create audit records
  it("12. Promotional plan grants create audit records in subscription_events", async () => {
    const events = await pgClient.query(`
      SELECT event_type, triggered_by, notes, metadata
      FROM public.subscription_events
      WHERE seller_id = '${freeSellerProfileId}' AND event_type = 'grant_added'
      ORDER BY created_at DESC
      LIMIT 1;
    `);

    expect(events.rows.length).toBe(1);
    const event = events.rows[0];
    expect(event.event_type).toBe("grant_added");
    expect(event.triggered_by).toBe("admin");
    expect(event.notes).toBe("VIP Quarry Onboarding Grant");
    expect(event.metadata.is_promotional).toBe(true);
  });

  // 13. Unauthorized API requests cannot bypass limits (assertCanCreateProduct check)
  it("13. assertCanCreateProduct rejects sellers who have reached active limits", async () => {
    // Reset seller to free plan with 5 active products
    await pgClient.query(`
      UPDATE public.seller_subscriptions 
      SET plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'free'),
          custom_max_listings = 5,
          promotional_grant = false
      WHERE seller_id = '${freeSellerProfileId}' AND status = 'active';
    `);

    const check = await assertCanCreateProduct(freeSellerProfileId, supabaseAdmin);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Listing limit reached");
  });

  // 14. Existing product CRUD and moderation remain functional
  it("14. Existing product CRUD and moderation remain functional without false limit blocks", async () => {
    // Updating existing active product's price/name does not trigger limit error
    const { rows: products } = await pgClient.query(`
      SELECT id, slug FROM public.products 
      WHERE seller_id = '${freeSellerProfileId}' AND moderation_status NOT IN ('archived', 'rejected')
      LIMIT 1;
    `);
    const prodId = products[0].id;

    const updateRes = await pgClient.query(`
      UPDATE public.products 
      SET price = 299, name = 'Updated Architectural Marble Slabs'
      WHERE id = '${prodId}'
      RETURNING id, price, name;
    `);

    expect(updateRes.rows.length).toBe(1);
    expect(Number(updateRes.rows[0].price)).toBe(299);
  });
});
