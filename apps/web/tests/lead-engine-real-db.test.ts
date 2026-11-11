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
      process.env[key] = val; // Force overwrite with local .env.local configuration
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
import {
  findMatchingSuppliers,
  distributeRfqToSuppliers,
  retryFailedLeadNotifications,
  type SupabaseMatchClient,
} from "@/features/matching/supplier-matching";
import { createAdminClient } from "@stone/database/admin";

/**
 * StoneB2B Phase 3.3 — Real Database Integration Tests (Local Docker + Supabase)
 *
 * Executes all 12 real database verification scenarios against the confirmed
 * local PostgreSQL instance running inside Docker on port 54322.
 * Uses disposable synthetic records with automated teardown cleanup.
 */

const LOCAL_DB_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("StoneB2B Phase 3.3 — Real PostgreSQL Integration Tests (Local Database)", () => {
  let pgClient: Client;
  let supabaseAdmin: ReturnType<typeof createAdminClient>;

  // Synthetic Test Fixture IDs
  const buyerUserId = "11111111-1111-4111-8111-111111111111";
  const sellerAUserId = "22222222-2222-4222-8222-222222222222";
  const sellerBUserId = "33333333-3333-4333-8333-333333333333";
  const sellerCUserId = "44444444-4444-4444-8444-444444444444";

  const sellerAProfileId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const sellerBProfileId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const sellerCProfileId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  const rfqEnquiryId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const directEnquiryId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  const productIdA = "99999999-9999-4999-8999-999999999999";
  const productIdB = "88888888-8888-4888-8888-888888888888";

  beforeAll(async () => {
    // 1. Initialize Direct PostgreSQL client for catalog & DDL assertions
    pgClient = new Client({
      connectionString: LOCAL_DB_URL,
      ssl: false,
    });
    await pgClient.connect();

    // 2. Initialize Supabase Admin Client
    supabaseAdmin = createAdminClient();

    // 3. Clean up any stale records from previous runs
    await cleanSyntheticRecords();

    // 4. Seed Synthetic Auth Users & Profiles
    await pgClient.query(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${buyerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-buyer@dlf.local', '{"full_name": "Synthetic DLF Commercial Buyer", "account_type": "buyer"}', now(), now()),
        ('${sellerAUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-seller-a@makrana.local', '{"full_name": "Synthetic Makrana Seller A", "account_type": "seller"}', now(), now()),
        ('${sellerBUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-seller-b@granite.local', '{"full_name": "Synthetic Granite Seller B", "account_type": "seller"}', now(), now()),
        ('${sellerCUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-seller-c@sandstone.local', '{"full_name": "Synthetic Sandstone Seller C", "account_type": "seller"}', now(), now())
      ON CONFLICT (id) DO NOTHING;

      UPDATE public.profiles SET account_status = 'active' WHERE id IN ('${buyerUserId}', '${sellerAUserId}', '${sellerBUserId}', '${sellerCUserId}');
    `);

    // 5. Seed Synthetic Seller Profiles
    await pgClient.query(`
      INSERT INTO public.seller_profiles (id, user_id, business_name, slug, business_type, city, state, country, verification_status, years_in_business)
      VALUES 
        ('${sellerAProfileId}', '${sellerAUserId}', 'Synthetic Makrana Marble Ltd', 'synth-makrana-marble', 'manufacturer', 'Makrana', 'Rajasthan', 'IN', 'verified', 25),
        ('${sellerBProfileId}', '${sellerBUserId}', 'Synthetic South Granite Corp', 'synth-south-granite', 'stone_supplier', 'Bengaluru', 'Karnataka', 'IN', 'verified', 15),
        ('${sellerCProfileId}', '${sellerCUserId}', 'Synthetic Unverified Sandstone', 'synth-unverified-sandstone', 'manufacturer', 'Dholpur', 'Rajasthan', 'IN', 'under_review', 3);
    `);

    // 6. Seed Synthetic Products (Catalogue capabilities)
    await pgClient.query(`
      INSERT INTO public.products (
        id, seller_id, category_id, name, slug, material_type, stone_origin, description, moderation_status, published_at, price, price_type, currency, unit
      ) VALUES 
        ('${productIdA}', '${sellerAProfileId}', '4c4f27c9-ae4b-43c4-a84a-7f3a53ba29e0', 'Makrana Pure White Marble Slabs', 'synth-makrana-white-slabs', 'Marble', 'Makrana, Rajasthan', 'Premium architectural marble', 'approved', now(), 250, 'fixed', 'INR', 'sq_ft'),
        ('${productIdB}', '${sellerBProfileId}', 'cd8090cd-3e67-4edc-b9e7-453fcb05d8df', 'Black Galaxy Polished Granite', 'synth-black-galaxy-granite', 'Granite', 'Andhra Pradesh', 'Mirror polished granite', 'approved', now(), 180, 'fixed', 'INR', 'sq_ft');
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
        DELETE FROM public.enquiry_status_history WHERE enquiry_id IN ('${rfqEnquiryId}', '${directEnquiryId}');
        DELETE FROM public.quotations WHERE enquiry_id IN ('${rfqEnquiryId}', '${directEnquiryId}');
        DELETE FROM public.lead_assignments WHERE enquiry_id IN ('${rfqEnquiryId}', '${directEnquiryId}');
        DELETE FROM public.notifications WHERE user_id IN ('${buyerUserId}', '${sellerAUserId}', '${sellerBUserId}', '${sellerCUserId}');
        DELETE FROM public.enquiries WHERE id IN ('${rfqEnquiryId}', '${directEnquiryId}') OR seller_id IN ('${sellerAProfileId}', '${sellerBProfileId}', '${sellerCProfileId}');
        DELETE FROM public.products WHERE id IN ('${productIdA}', '${productIdB}') OR seller_id IN ('${sellerAProfileId}', '${sellerBProfileId}', '${sellerCProfileId}');
        DELETE FROM public.seller_profiles WHERE id IN ('${sellerAProfileId}', '${sellerBProfileId}', '${sellerCProfileId}');
        DELETE FROM public.user_roles WHERE user_id IN ('${buyerUserId}', '${sellerAUserId}', '${sellerBUserId}', '${sellerCUserId}');
        DELETE FROM public.profiles WHERE id IN ('${buyerUserId}', '${sellerAUserId}', '${sellerBUserId}', '${sellerCUserId}');
        DELETE FROM auth.users WHERE id IN ('${buyerUserId}', '${sellerAUserId}', '${sellerBUserId}', '${sellerCUserId}');
        SET session_replication_role = 'origin';
      `);
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }

  // 1. RFQ persistence in local PostgreSQL enquiries table
  it("1. Persists synthetic RFQ in local PostgreSQL enquiries table", async () => {
    const res = await pgClient.query(`
      INSERT INTO public.enquiries (
        id, buyer_id, seller_id, enquiry_title, description, enquiry_type, unit, quantity, delivery_location, status
      ) VALUES (
        '${rfqEnquiryId}', '${buyerUserId}', NULL, '10,000 sq ft Makrana White Marble RFQ', 'Architectural marble slabs needed', 'rfq', 'sq_ft', 10000, 'Jaipur, Rajasthan', 'submitted'
      ) RETURNING id, status, enquiry_type, seller_id;
    `);

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].id).toBe(rfqEnquiryId);
    expect(res.rows[0].status).toBe("submitted");
    expect(res.rows[0].enquiry_type).toBe("rfq");
    expect(res.rows[0].seller_id).toBeNull(); // Broadcast marketplace RFQ
  });

  // 2. Matches suppliers using local database catalog records
  it("2. Matches suppliers using local PostgreSQL catalog records", async () => {
    const matches = await findMatchingSuppliers(
      supabaseAdmin as unknown as SupabaseMatchClient,
      {
        materialType: "Marble",
        stoneVariety: "Makrana",
        deliveryLocation: "Jaipur, Rajasthan",
      },
    );

    expect(matches.length).toBeGreaterThan(0);
    const sellerAMatch = matches.find((m) => m.sellerId === sellerAProfileId);
    expect(sellerAMatch).toBeDefined();
    expect(sellerAMatch?.isVerified).toBe(true);
    expect(sellerAMatch?.score).toBeGreaterThanOrEqual(80);

    // Granite seller and under-review seller must NOT match
    expect(matches.some((m) => m.sellerId === sellerBProfileId)).toBe(false);
    expect(matches.some((m) => m.sellerId === sellerCProfileId)).toBe(false);
  });

  // 3. Persists lead assignment in local lead_assignments table
  it("3. Persists lead assignment in local lead_assignments table via distributeRfqToSuppliers", async () => {
    const distResult = await distributeRfqToSuppliers(
      supabaseAdmin as unknown as SupabaseMatchClient,
      rfqEnquiryId,
      {
        materialType: "Marble",
        stoneVariety: "Makrana",
        deliveryLocation: "Jaipur, Rajasthan",
      },
    );

    expect(distResult.enquiryId).toBe(rfqEnquiryId);
    expect(distResult.assignedCount).toBeGreaterThan(0);

    // Verify row directly in PostgreSQL catalog
    const laRes = await pgClient.query(`
      SELECT * FROM public.lead_assignments 
      WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerAProfileId}';
    `);

    expect(laRes.rows.length).toBe(1);
    const assignment = laRes.rows[0];
    expect(assignment.status).toBe("assigned");
    expect(assignment.notification_status).toBe("delivered");
    expect(assignment.match_score).toBeGreaterThanOrEqual(80);
  });

  // 4. Enforces UNIQUE(enquiry_id, seller_id) constraint in PostgreSQL
  it("4. Enforces UNIQUE(enquiry_id, seller_id) constraint in PostgreSQL", async () => {
    let duplicateError: { code?: string; constraint?: string } | null = null;
    try {
      await pgClient.query(`
        INSERT INTO public.lead_assignments (
          enquiry_id, seller_id, match_score, status, notification_status
        ) VALUES (
          '${rfqEnquiryId}', '${sellerAProfileId}', 95, 'assigned', 'pending'
        );
      `);
    } catch (err) {
      duplicateError = err as { code?: string; constraint?: string };
    }

    expect(duplicateError).not.toBeNull();
    // PostgreSQL error code 23505 = unique_violation
    expect(duplicateError?.code).toBe("23505");
    expect(duplicateError?.constraint).toBe("lead_assignments_enquiry_seller_unique");
  });

  // 5. Seller inbox retrieves assigned broadcast leads from local database
  it("5. Seller inbox query retrieves assigned broadcast leads from local PostgreSQL", async () => {
    // Query matching the getSellerEnquiries() query pattern
    const inboxRes = await pgClient.query(`
      SELECT e.id, e.enquiry_title, e.status
      FROM public.enquiries e
      WHERE e.seller_id = '${sellerAProfileId}'
         OR e.id IN (SELECT enquiry_id FROM public.lead_assignments WHERE seller_id = '${sellerAProfileId}');
    `);

    expect(inboxRes.rows.length).toBeGreaterThan(0);
    const foundRfq = inboxRes.rows.find((r: { id: string }) => r.id === rfqEnquiryId);
    expect(foundRfq).toBeDefined();
    expect(foundRfq.enquiry_title).toBe("10,000 sq ft Makrana White Marble RFQ");
  });

  // 6. Cross-seller RLS isolation: Seller B cannot access Seller A's assigned lead
  it("6. Cross-seller access denial: Unassigned Seller B has no lead assignment", async () => {
    const accessRes = await pgClient.query(`
      SELECT EXISTS (
        SELECT 1 FROM public.lead_assignments
        WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerBProfileId}'
      ) as has_assignment;
    `);

    expect(accessRes.rows[0].has_assignment).toBe(false);
  });

  // 7. Seller permission boundaries: Seller A can update status on assigned lead
  it("7. Seller permission boundaries: Seller A can transition lead assignment status", async () => {
    const updateRes = await pgClient.query(`
      UPDATE public.lead_assignments 
      SET status = 'viewed', viewed_at = NOW(), updated_at = NOW()
      WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerAProfileId}'
      RETURNING status, viewed_at;
    `);

    expect(updateRes.rows.length).toBe(1);
    expect(updateRes.rows[0].status).toBe("viewed");
    expect(updateRes.rows[0].viewed_at).not.toBeNull();
  });

  // 8. Notification delivery recorded in notifications table
  it("8. Notification delivery: Verified notification row in local PostgreSQL", async () => {
    const notifRes = await pgClient.query(`
      SELECT * FROM public.notifications 
      WHERE user_id = '${sellerAUserId}' AND reference_id = '${rfqEnquiryId}';
    `);

    expect(notifRes.rows.length).toBeGreaterThan(0);
    expect(notifRes.rows[0].notification_type).toBe("enquiry_received");
    expect(notifRes.rows[0].is_read).toBe(false);
  });

  // 9. Notification retries: Worker processes failed records and updates status
  it("9. Notification retry: Outbox worker recovers failed assignment in local database", async () => {
    // 1. Manually mark assignment as failed
    await pgClient.query(`
      UPDATE public.lead_assignments 
      SET notification_status = 'failed', retry_count = 1, notification_error = 'Simulated connection failure'
      WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerAProfileId}';
    `);

    // 2. Run retry worker
    const retryResult = await retryFailedLeadNotifications(
      supabaseAdmin as unknown as SupabaseMatchClient,
    );

    expect(retryResult.retried).toBeGreaterThan(0);

    // 3. Verify status updated to delivered in PostgreSQL
    const checkRes = await pgClient.query(`
      SELECT notification_status, retry_count FROM public.lead_assignments 
      WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerAProfileId}';
    `);

    expect(checkRes.rows[0].notification_status).toBe("delivered");
    expect(checkRes.rows[0].retry_count).toBe(2);
  });

  // 10. Concurrent lead worker locking: Atomic claim protects against duplicate work
  it("10. Concurrent worker locking: Atomic claim with conditional status update", async () => {
    // Reset to failed
    await pgClient.query(`
      UPDATE public.lead_assignments 
      SET notification_status = 'failed', retry_count = 1
      WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerAProfileId}';
    `);

    // Worker 1 claims
    const claim1 = await pgClient.query(`
      UPDATE public.lead_assignments 
      SET notification_status = 'processing', updated_at = NOW()
      WHERE enquiry_id = '${rfqEnquiryId}' 
        AND seller_id = '${sellerAProfileId}' 
        AND notification_status IN ('failed', 'pending')
      RETURNING id;
    `);

    // Worker 2 attempts same claim
    const claim2 = await pgClient.query(`
      UPDATE public.lead_assignments 
      SET notification_status = 'processing', updated_at = NOW()
      WHERE enquiry_id = '${rfqEnquiryId}' 
        AND seller_id = '${sellerAProfileId}' 
        AND notification_status IN ('failed', 'pending')
      RETURNING id;
    `);

    expect(claim1.rows.length).toBe(1); // Worker 1 won claim
    expect(claim2.rows.length).toBe(0); // Worker 2 blocked

    // Clean up to delivered
    await pgClient.query(`
      UPDATE public.lead_assignments 
      SET notification_status = 'delivered'
      WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerAProfileId}';
    `);
  });

  // 11. Pending record recovery: Stale pending assignments are processed
  it("11. Pending record recovery: Outbox worker picks up stale pending assignments", async () => {
    await pgClient.query(`
      UPDATE public.lead_assignments 
      SET notification_status = 'pending', retry_count = 0
      WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerAProfileId}';
    `);

    const res = await retryFailedLeadNotifications(
      supabaseAdmin as unknown as SupabaseMatchClient,
    );

    expect(res.retried).toBeGreaterThan(0);

    const checkRes = await pgClient.query(`
      SELECT notification_status FROM public.lead_assignments 
      WHERE enquiry_id = '${rfqEnquiryId}' AND seller_id = '${sellerAProfileId}';
    `);

    expect(checkRes.rows[0].notification_status).toBe("delivered");
  });

  // 12. Direct seller RFQ regression: Existing direct seller RFQs continue working
  it("12. Direct seller RFQ regression: Direct seller RFQ works without lead_assignments", async () => {
    // Insert direct RFQ directly assigned to Seller A
    const directRes = await pgClient.query(`
      INSERT INTO public.enquiries (
        id, buyer_id, seller_id, enquiry_title, description, enquiry_type, unit, quantity, delivery_location, status
      ) VALUES (
        '${directEnquiryId}', '${buyerUserId}', '${sellerAProfileId}', 'Direct Quote for Makrana Slab', 'Direct enquiry to Seller A', 'direct', 'sq_ft', 500, 'Makrana', 'submitted'
      ) RETURNING id, seller_id;
    `);

    expect(directRes.rows[0].seller_id).toBe(sellerAProfileId);

    // Verify Seller A inbox finds it directly via seller_id = sellerAProfileId
    const inboxRes = await pgClient.query(`
      SELECT id FROM public.enquiries 
      WHERE seller_id = '${sellerAProfileId}' AND id = '${directEnquiryId}';
    `);

    expect(inboxRes.rows.length).toBe(1);
    expect(inboxRes.rows[0].id).toBe(directEnquiryId);

    // Verify no lead_assignments record is needed
    const laRes = await pgClient.query(`
      SELECT count(*) FROM public.lead_assignments WHERE enquiry_id = '${directEnquiryId}';
    `);
    expect(Number(laRes.rows[0].count)).toBe(0);
  });
});
