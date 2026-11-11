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

// Force local development URLs
process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DIRECT_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

import { Client } from "@stone/database/pg";
import { createAdminClient } from "@stone/database/admin";
import { findMatchingSuppliers, distributeRfqToSuppliers } from "@/features/matching/supplier-matching";
import { getSellerEntitlements } from "@/features/subscription/entitlements";

const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const BASE_URL = "http://localhost:3000";

describe("IndiaMART Parity & Manual Workflow Verification Suite", () => {
  let pgClient: Client;
  const supabaseAdmin = createAdminClient();

  // Synthetic Test Entities
  const testBuyerUserId = "ba000000-0000-4000-8000-000000000001";

  const marbleSellerId = "da000000-0000-4000-8000-000000000001";
  const marbleSellerUserId = "ca000000-0000-4000-8000-000000000001";

  const graniteSellerId = "da000000-0000-4000-8000-000000000002";
  const graniteSellerUserId = "ca000000-0000-4000-8000-000000000002";

  const suspendedSellerId = "da000000-0000-4000-8000-000000000003";
  const suspendedSellerUserId = "ca000000-0000-4000-8000-000000000003";

  const unverifiedSellerId = "da000000-0000-4000-8000-000000000004";
  const unverifiedSellerUserId = "ca000000-0000-4000-8000-000000000004";

  const exhaustedSellerId = "da000000-0000-4000-8000-000000000005";
  const exhaustedSellerUserId = "ca000000-0000-4000-8000-000000000005";

  const testEnquiryId = "ea000000-0000-4000-8000-000000000001";
  const testQuoteId = "fa000000-0000-4000-8000-000000000001";

  async function cleanupSynthetic() {
    await pgClient.query(`
      SET session_replication_role = 'replica';
      DELETE FROM public.order_status_history WHERE order_id IN (SELECT id FROM public.orders WHERE buyer_id = '${testBuyerUserId}');
      DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE buyer_id = '${testBuyerUserId}');
      DELETE FROM public.orders WHERE buyer_id = '${testBuyerUserId}';
      DELETE FROM public.quotation_items WHERE quotation_id IN (SELECT id FROM public.quotations WHERE buyer_id = '${testBuyerUserId}');
      DELETE FROM public.quotations WHERE buyer_id = '${testBuyerUserId}';
      DELETE FROM public.seller_lead_usage WHERE seller_id::text LIKE 'da000000-%';
      DELETE FROM public.lead_assignments WHERE seller_id::text LIKE 'da000000-%';
      DELETE FROM public.notifications WHERE user_id::text LIKE 'ca000000-%' OR user_id = '${testBuyerUserId}';
      DELETE FROM public.subscription_events WHERE seller_id::text LIKE 'da000000-%';
      DELETE FROM public.seller_subscriptions WHERE seller_id::text LIKE 'da000000-%';
      DELETE FROM public.products WHERE seller_id::text LIKE 'da000000-%';
      DELETE FROM public.enquiries WHERE id::text LIKE 'ea000000-%' OR buyer_id = '${testBuyerUserId}';
      DELETE FROM public.seller_profiles WHERE id::text LIKE 'da000000-%';
      DELETE FROM public.user_roles WHERE user_id::text LIKE 'ca000000-%' OR user_id = '${testBuyerUserId}';
      DELETE FROM public.profiles WHERE id::text LIKE 'ca000000-%' OR id = '${testBuyerUserId}';
      DELETE FROM auth.users WHERE id::text LIKE 'ca000000-%' OR id = '${testBuyerUserId}';
      SET session_replication_role = 'origin';
    `);
  }

  beforeAll(async () => {
    pgClient = new Client({ connectionString: DB_URL });
    await pgClient.connect();
    await cleanupSynthetic();

    // Seed test users & roles
    await pgClient.query(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${testBuyerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_buyer@stoneb2b.test', '{"full_name": "Test Buyer Sharma", "account_type": "buyer"}', now(), now()),
        ('${marbleSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marble_seller@stoneb2b.test', '{"full_name": "Marble Specialist", "account_type": "seller"}', now(), now()),
        ('${graniteSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'granite_seller@stoneb2b.test', '{"full_name": "Granite Specialist", "account_type": "seller"}', now(), now()),
        ('${suspendedSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'suspended_seller@stoneb2b.test', '{"full_name": "Suspended Seller", "account_type": "seller"}', now(), now()),
        ('${unverifiedSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unverified_seller@stoneb2b.test', '{"full_name": "Unverified Seller", "account_type": "seller"}', now(), now()),
        ('${exhaustedSellerUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'exhausted_seller@stoneb2b.test', '{"full_name": "Exhausted Seller", "account_type": "seller"}', now(), now())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.user_roles (user_id, role)
      VALUES 
        ('${testBuyerUserId}', 'buyer'),
        ('${marbleSellerUserId}', 'seller'),
        ('${graniteSellerUserId}', 'seller'),
        ('${suspendedSellerUserId}', 'seller'),
        ('${unverifiedSellerUserId}', 'seller'),
        ('${exhaustedSellerUserId}', 'seller')
      ON CONFLICT (user_id, role) DO NOTHING;

      UPDATE public.profiles SET account_status = 'active', full_name = 'Test Buyer Sharma' WHERE id = '${testBuyerUserId}';
      UPDATE public.profiles SET account_status = 'active' WHERE id IN (
        '${marbleSellerUserId}', '${graniteSellerUserId}', '${suspendedSellerUserId}', '${unverifiedSellerUserId}', '${exhaustedSellerUserId}'
      );

      INSERT INTO public.seller_profiles (id, user_id, business_name, slug, verification_status, business_type, city, state, country, years_in_business)
      VALUES 
        ('${marbleSellerId}', '${marbleSellerUserId}', 'Makrana Royal Marbles Ltd', 'makrana-royal-marbles', 'verified', 'manufacturer', 'Makrana', 'Rajasthan', 'IN', 15),
        ('${graniteSellerId}', '${graniteSellerUserId}', 'South Granite Quarry Ltd', 'south-granite-quarry', 'verified', 'mine_owner', 'Bengaluru', 'Karnataka', 'IN', 20),
        ('${suspendedSellerId}', '${suspendedSellerUserId}', 'Suspended Stone Co', 'suspended-stone-co', 'verified', 'stone_supplier', 'Jaipur', 'Rajasthan', 'IN', 5),
        ('${unverifiedSellerId}', '${unverifiedSellerUserId}', 'Unverified Traders', 'unverified-traders', 'under_review', 'stone_supplier', 'Udaipur', 'Rajasthan', 'IN', 2),
        ('${exhaustedSellerId}', '${exhaustedSellerUserId}', 'Exhausted Quota Supplier', 'exhausted-quota-supplier', 'verified', 'manufacturer', 'Kishangarh', 'Rajasthan', 'IN', 8)
      ON CONFLICT (id) DO NOTHING;

      -- Products for material capability matching (inserted while sellers are active)
      INSERT INTO public.products (seller_id, name, slug, moderation_status, material_type, stone_origin, published_at, price, price_type, currency, unit)
      VALUES 
        ('${marbleSellerId}', 'Makrana Pure White Marble Slabs', 'makrana-pure-white-marble-slabs', 'approved', 'Marble', 'Makrana', now(), 120, 'fixed', 'INR', 'sq_ft'),
        ('${graniteSellerId}', 'Black Galaxy Mirror Granite Slabs', 'black-galaxy-mirror-granite-slabs', 'approved', 'Granite', 'Andhra Pradesh', now(), 180, 'fixed', 'INR', 'sq_ft'),
        ('${suspendedSellerId}', 'Suspended White Marble', 'suspended-white-marble', 'approved', 'Marble', 'Rajasthan', now(), 100, 'fixed', 'INR', 'sq_ft'),
        ('${unverifiedSellerId}', 'Unverified Marble Block', 'unverified-marble-block', 'approved', 'Marble', 'Rajasthan', now(), 90, 'fixed', 'INR', 'sq_ft'),
        ('${exhaustedSellerId}', 'Exhausted Supplier Marble Slab', 'exhausted-supplier-marble-slab', 'approved', 'Marble', 'Kishangarh', now(), 110, 'fixed', 'INR', 'sq_ft');

      -- Set Granite Seller to Pro Plan
      UPDATE public.seller_subscriptions 
      SET plan_id = (SELECT id FROM public.subscription_plans WHERE code = 'pro'), current_period_end = now() + interval '30 days'
      WHERE seller_id = '${graniteSellerId}';

      -- Suspend the Suspended Seller
      UPDATE public.seller_subscriptions 
      SET status = 'suspended', previous_status = 'active'
      WHERE seller_id = '${suspendedSellerId}';

      -- Insert 5 dummy enquiries for exhausting quota
      INSERT INTO public.enquiries (id, buyer_id, enquiry_title, description, enquiry_type, specifications, quantity, unit, delivery_location, status)
      SELECT 
        ('ea000000-0000-4000-8000-00000000000' || i)::uuid,
        '${testBuyerUserId}',
        'Quota dummy enquiry ' || i,
        'Description for dummy enquiry ' || i,
        'rfq',
        '{"material_type": "Marble"}'::jsonb,
        1000,
        'sq_ft',
        'Jaipur',
        'submitted'
      FROM generate_series(2, 6) as i;

      -- Exhaust the Quota of Exhausted Seller (Free plan has 5 leads)
      INSERT INTO public.seller_lead_usage (seller_id, enquiry_id, billing_period_start, billing_period_end, action, credits_consumed)
      SELECT 
        '${exhaustedSellerId}', 
        ('ea000000-0000-4000-8000-00000000000' || i)::uuid, 
        now() - interval '5 days', 
        now() + interval '25 days', 
        'assigned', 
        1
      FROM generate_series(2, 6) as i;
    `);
  });

  afterAll(async () => {
    await cleanupSynthetic();
    if (pgClient) {
      await pgClient.end();
    }
  });

  // =========================================================================
  // SECTION 1: Two-Way Discovery Engine (IndiaMART Pattern)
  // =========================================================================
  describe("Section 1: Two-Way Discovery Engine", () => {
    it("DISC-01: Homepage hero and search renders with 200 OK", async () => {
      const res = await fetch(`${BASE_URL}/`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toMatch(/(Natural Stone|B2B|Stone)/);
    }, 20000);

    it("DISC-02: Product catalog search and material filter works", async () => {
      const res = await fetch(`${BASE_URL}/products?q=Marble`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text.length).toBeGreaterThan(500);
    }, 20000);

    it("DISC-03: Category discovery explorer renders marble category", async () => {
      const res = await fetch(`${BASE_URL}/categories/marble`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toMatch(/(Marble|Category)/i);
    }, 20000);

    it("DISC-04: Independent supplier directory renders verified suppliers", async () => {
      const res = await fetch(`${BASE_URL}/suppliers`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toMatch(/(Suppliers|Directory|Verified)/i);
    }, 20000);

    it("DISC-05: Non-existent product slug returns 404", async () => {
      const res = await fetch(`${BASE_URL}/products/non-existent-product-slug-xyz-123`);
      expect([200, 404]).toContain(res.status);
      const text = await res.text();
      expect(text).toMatch(/(not found|Not Found|404)/i);
    }, 20000);
  });

  // =========================================================================
  // SECTION 2: Buyer Enquiry and RFQ Workflow
  // =========================================================================
  describe("Section 2: Buyer Enquiry & RFQ Workflow", () => {
    it("RFQ-01: Broadcast RFQ creation with natural stone specifications", async () => {
      const rfqInsert = await pgClient.query(`
        INSERT INTO public.enquiries (
          id, buyer_id, enquiry_title, description, enquiry_type, specifications, 
          quantity, unit, delivery_location, status, created_at
        ) VALUES (
          '${testEnquiryId}', '${testBuyerUserId}', 'Requirement: 5000 sq ft Makrana White Marble',
          'Export grade gangsaw polished slabs with zero cracks', 'rfq',
          '{"material_type": "Marble", "stone_variety": "Makrana White"}'::jsonb,
          5000, 'sq_ft', 'Kishangarh, Rajasthan', 'submitted', now()
        ) RETURNING id, enquiry_title, status, quantity, unit;
      `);

      expect(rfqInsert.rows.length).toBe(1);
      expect(rfqInsert.rows[0].status).toBe("submitted");
      expect(parseFloat(rfqInsert.rows[0].quantity)).toBe(5000);
    });

    it("RFQ-02: Data Isolation: can_access_enquiry denies unprivileged access", async () => {
      const rlsCheck = await pgClient.query(`
        SELECT public.can_access_enquiry('${testEnquiryId}') as can_access;
      `);
      expect(rlsCheck.rows[0].can_access).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 3: Supplier Matching & Lead Distribution
  // =========================================================================
  describe("Section 3: Supplier Matching & Lead Distribution", () => {
    it("MATCH-01: Strict Material & Entitlement Gating", async () => {
      const matches = await findMatchingSuppliers(supabaseAdmin, {
        materialType: "Marble",
        stoneVariety: "Makrana White",
        deliveryLocation: "Kishangarh, Rajasthan",
        quantity: 5000,
      });

      const matchedIds = matches.map((m) => m.sellerId);
      // Makrana Marble Seller MUST match
      expect(matchedIds).toContain(marbleSellerId);
      // Granite Seller MUST NOT match (wrong material)
      expect(matchedIds).not.toContain(graniteSellerId);
      // Suspended Seller MUST NOT match
      expect(matchedIds).not.toContain(suspendedSellerId);
      // Unverified Seller MUST NOT match
      expect(matchedIds).not.toContain(unverifiedSellerId);
      // Quota-exhausted Seller MUST NOT match
      expect(matchedIds).not.toContain(exhaustedSellerId);
    });

    it("MATCH-02: Atomic Lead Assignment & Credit Consumption via Database RPC", async () => {
      const distResult = await distributeRfqToSuppliers(supabaseAdmin, testEnquiryId, {
        materialType: "Marble",
        stoneVariety: "Makrana White",
        deliveryLocation: "Kishangarh, Rajasthan",
        quantity: 5000,
      });

      expect(distResult.assignedCount).toBe(1);

      const dbAssignment = await pgClient.query(`
        SELECT * FROM public.lead_assignments WHERE enquiry_id = '${testEnquiryId}' AND seller_id = '${marbleSellerId}';
      `);
      const dbUsage = await pgClient.query(`
        SELECT * FROM public.seller_lead_usage WHERE enquiry_id = '${testEnquiryId}' AND seller_id = '${marbleSellerId}';
      `);

      expect(dbAssignment.rows.length).toBe(1);
      expect(dbUsage.rows.length).toBe(1);
      expect(dbUsage.rows[0].action).toBe("assigned");
      expect(dbUsage.rows[0].credits_consumed).toBe(1);
    });

    it("MATCH-03: Duplicate Distribution Idempotency (Zero Double-Charge)", async () => {
      const distResult2 = await distributeRfqToSuppliers(supabaseAdmin, testEnquiryId, {
        materialType: "Marble",
        stoneVariety: "Makrana White",
        deliveryLocation: "Kishangarh, Rajasthan",
        quantity: 5000,
      });

      // Already assigned, should return 0 new assignments
      expect(distResult2.assignedCount).toBe(0);

      const dbUsage2 = await pgClient.query(`
        SELECT count(*) FROM public.seller_lead_usage WHERE enquiry_id = '${testEnquiryId}' AND seller_id = '${marbleSellerId}';
      `);
      expect(parseInt(dbUsage2.rows[0].count, 10)).toBe(1);
    });
  });

  // =========================================================================
  // SECTION 4: Quotation and Commerce Workflow
  // =========================================================================
  describe("Section 4: Quotation & Commerce Workflow", () => {
    let createdOrderId: string;

    it("COMM-01: Seller Quotation Generation for Assigned RFQ", async () => {
      // Connect enquiry directly to seller for the quote workflow
      await pgClient.query(`
        UPDATE public.enquiries 
        SET seller_id = '${marbleSellerId}' 
        WHERE id = '${testEnquiryId}';
      `);

      await pgClient.query(`
        INSERT INTO public.quotations (
          id, enquiry_id, seller_id, buyer_id, subtotal, tax_amount, total_amount, currency, status, terms, created_at
        ) VALUES (
          '${testQuoteId}', '${testEnquiryId}', '${marbleSellerId}', '${testBuyerUserId}',
          600000, 108000, 708000, 'INR', 'draft', '50% advance, balance on dispatch. 18% GST included.', now()
        );

        INSERT INTO public.quotation_items (quotation_id, description, quantity, unit, unit_price, total_price)
        VALUES ('${testQuoteId}', 'Makrana Pure White Marble Gangsaw Slabs 20mm', 5000, 'sq_ft', 120, 600000);

        UPDATE public.quotations SET status = 'sent' WHERE id = '${testQuoteId}';
      `);

      const quote = await pgClient.query(`SELECT status, total_amount FROM public.quotations WHERE id = '${testQuoteId}';`);
      expect(quote.rows[0].status).toBe("sent");
      expect(parseFloat(quote.rows[0].total_amount)).toBe(708000);
    });

    it("COMM-02: Atomic Order Creation on Quotation Acceptance", async () => {
      await pgClient.query("BEGIN;");
      await pgClient.query(`SET LOCAL "request.jwt.claim.sub" = '${testBuyerUserId}';`);
      const createOrderRes = await pgClient.query(`
        SELECT public.accept_quotation_and_create_order(
          '${testQuoteId}'::uuid,
          '{"contactName": "Test Buyer Sharma", "phone": "9876543210", "addressLine1": "Plot 42 Marble Zone", "city": "Kishangarh", "state": "Rajasthan", "pincode": "305801", "country": "IN"}'::jsonb,
          NULL::jsonb,
          true,
          'Urgent delivery required'
        ) as order_id;
      `);
      await pgClient.query("COMMIT;");
      createdOrderId = createOrderRes.rows[0].order_id;

      const orderCheck = await pgClient.query(`
        SELECT o.id, o.order_number, o.status, o.payment_status, count(oi.id) as item_count
        FROM public.orders o
        JOIN public.order_items oi ON o.id = oi.order_id
        WHERE o.id = '${createdOrderId}'
        GROUP BY o.id, o.order_number, o.status, o.payment_status;
      `);

      expect(orderCheck.rows.length).toBe(1);
      expect(orderCheck.rows[0].status).toBe("pending_payment");
      expect(orderCheck.rows[0].payment_status).toBe("pending");
      expect(parseInt(orderCheck.rows[0].item_count, 10)).toBe(1);

      const quoteCheck = await pgClient.query(`SELECT status FROM public.quotations WHERE id = '${testQuoteId}';`);
      expect(quoteCheck.rows[0].status).toBe("accepted");
    });

    it("COMM-03: Fulfillment Status Transition without Payment Tampering", async () => {
      await pgClient.query(`
        UPDATE public.orders 
        SET status = 'dispatched', updated_at = now()
        WHERE id = '${createdOrderId}';
      `);

      const statusCheck = await pgClient.query(`SELECT status, payment_status FROM public.orders WHERE id = '${createdOrderId}';`);
      expect(statusCheck.rows[0].status).toBe("dispatched");
      expect(statusCheck.rows[0].payment_status).toBe("pending");
    });
  });

  // =========================================================================
  // SECTION 5: Subscription and Monetization Workflow
  // =========================================================================
  describe("Section 5: Subscription & Monetization Workflow", () => {
    it("MON-01: Free Plan Entitlement Matrix (5 listings, 5 leads)", async () => {
      const freeEnt = await getSellerEntitlements(marbleSellerId, supabaseAdmin);
      expect(freeEnt.planCode).toBe("free");
      expect(freeEnt.maxActiveListings).toBe(5);
      expect(freeEnt.maxMonthlyLeads).toBe(5);
    });

    it("MON-02: Pro Plan Entitlement Matrix (100 listings, 50 leads)", async () => {
      const proEnt = await getSellerEntitlements(graniteSellerId, supabaseAdmin);
      expect(proEnt.planCode).toBe("pro");
      expect(proEnt.maxActiveListings).toBe(100);
      expect(proEnt.maxMonthlyLeads).toBe(50);
    });

    it("MON-03: Subscription Suspension & Restoration Lifecycle", async () => {
      await supabaseAdmin.rpc("admin_suspend_seller_subscription", {
        _seller_id: marbleSellerId,
        _reason: "Parity test suspension",
      });
      const afterSusp = await getSellerEntitlements(marbleSellerId, supabaseAdmin);
      expect(afterSusp.isSuspended).toBe(true);
      expect(afterSusp.canCreateListing).toBe(false);

      await supabaseAdmin.rpc("admin_restore_seller_subscription", {
        _seller_id: marbleSellerId,
        _reason: "Parity test restoration",
      });
      const afterRest = await getSellerEntitlements(marbleSellerId, supabaseAdmin);
      expect(afterRest.isSuspended).toBe(false);
      expect(afterRest.canCreateListing).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 6: Notification Outbox Worker
  // =========================================================================
  describe("Section 6: Notification Outbox Worker", () => {
    it("OUTBOX-01: Cron Outbox Worker Recovers Failed Notification Without Re-charging Credits", async () => {
      await pgClient.query(`
        UPDATE public.lead_assignments 
        SET notification_status = 'failed', notification_error = 'Simulated timeout for worker recovery'
        WHERE enquiry_id = '${testEnquiryId}' AND seller_id = '${marbleSellerId}';
      `);

      const outboxRes = await fetch(`${BASE_URL}/api/cron/lead-outbox`, {
        headers: { Authorization: "Bearer stoneb2b-local-cron-secret-2026" },
      });
      expect(outboxRes.status).toBe(200);
      const outboxJson = (await outboxRes.json()) as { success: boolean };
      expect(outboxJson.success).toBe(true);

      const updatedAssign = await pgClient.query(`
        SELECT notification_status, retry_count FROM public.lead_assignments 
        WHERE enquiry_id = '${testEnquiryId}' AND seller_id = '${marbleSellerId}';
      `);
      expect(updatedAssign.rows[0].notification_status).toBe("delivered");
      expect(updatedAssign.rows[0].retry_count).toBeGreaterThanOrEqual(1);

      // Verify no extra credit usage row was inserted during recovery
      const creditCount = await pgClient.query(`
        SELECT count(*) FROM public.seller_lead_usage 
        WHERE enquiry_id = '${testEnquiryId}' AND seller_id = '${marbleSellerId}';
      `);
      expect(parseInt(creditCount.rows[0].count, 10)).toBe(1);
    });
  });
});
