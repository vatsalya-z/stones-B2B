import { Pool } from "pg";
import { randomUUID } from "node:crypto";

/**
 * Dedicated Staging Concurrency & Multi-Connection Harness
 *
 * SAFETY GUARD:
 * This script will REFUSE to execute against the protected production database (`rgmasamasslqintssyrh`).
 * It requires an explicit STAGING_DATABASE_URL environment variable pointing to an authorized staging host.
 */

const PROTECTED_PROJECT_REF = "rgmasamasslqintssyrh";

async function runStagingConcurrencyHarness() {
  const stagingDbUrl = process.env.STAGING_DATABASE_URL;

  if (!stagingDbUrl) {
    console.error("❌ ERROR: STAGING_DATABASE_URL environment variable is not defined.");
    console.error("To prevent accidental load testing on production, an isolated staging URL is required.");
    process.exit(1);
  }

  if (stagingDbUrl.includes(PROTECTED_PROJECT_REF)) {
    console.error(`🛑 SAFETY ABORT: Target URL matches protected project (${PROTECTED_PROJECT_REF})!`);
    console.error("Multi-connection concurrency testing is strictly prohibited on production/unclassified databases.");
    process.exit(1);
  }

  console.log("🚀 Initializing PostgreSQL Staging Multi-Connection Pool (10 concurrent clients)...");
  const pool = new Pool({
    connectionString: stagingDbUrl,
    max: 10,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log("🔒 Setting up isolated staging test fixture...");
    const testBuyerId = randomUUID();
    const testEmail = `staging-concurrency-${randomUUID().slice(0, 8)}@stoneb2b-test.internal`;

    // 1. Create staging test user and profile
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES ($1, $2, '{"role": "buyer"}'::jsonb);
    `, [testBuyerId, testEmail]);

    await client.query(`
      INSERT INTO public.profiles (id, full_name, email, account_status)
      VALUES ($1, 'Staging Concurrency Tester', $2, 'active');
    `, [testBuyerId, testEmail]);

    await client.query(`
      INSERT INTO public.user_roles (user_id, role)
      VALUES ($1, 'buyer');
    `, [testBuyerId]);

    // 2. Create two addresses for test buyer
    const addr1Res = await client.query(`
      INSERT INTO public.buyer_addresses
        (buyer_id, address_type, contact_name, phone, address_line1, city, state, pincode, country, is_default)
      VALUES ($1, 'billing', 'Staging Tester 1', '+919999911111', 'Address Line 1', 'Jaipur', 'Rajasthan', '302001', 'IN', false)
      RETURNING id;
    `, [testBuyerId]);
    const addr1Id = addr1Res.rows[0].id;

    const addr2Res = await client.query(`
      INSERT INTO public.buyer_addresses
        (buyer_id, address_type, contact_name, phone, address_line1, city, state, pincode, country, is_default)
      VALUES ($1, 'shipping', 'Staging Tester 2', '+919999922222', 'Address Line 2', 'Jaipur', 'Rajasthan', '302001', 'IN', false)
      RETURNING id;
    `, [testBuyerId]);
    const addr2Id = addr2Res.rows[0].id;

    await client.query("COMMIT");
    client.release();

    console.log(`✅ Staging fixture prepared: Buyer ${testBuyerId}, Addr1: ${addr1Id}, Addr2: ${addr2Id}`);

    // 3. Fire simultaneous competing RPC calls over 10 independent database connections
    console.log("⚡ Executing 10 simultaneous concurrent requests across independent socket connections...");
    const concurrencyTasks = Array.from({ length: 10 }, async (_, index) => {
      const targetAddr = index % 2 === 0 ? addr1Id : addr2Id;
      const workerClient = await pool.connect();
      try {
        // Set session context for the worker connection to simulate authenticated buyer
        await workerClient.query("SET LOCAL search_path = ''");
        // Using set_config to set request.jwt.claim.sub
        await workerClient.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [testBuyerId]);
        const res = await workerClient.query("SELECT public.set_default_buyer_address($1::uuid)", [targetAddr]);
        return { success: true, targetAddr, returnedId: res.rows[0].set_default_buyer_address };
      } catch (err: unknown) {
        const error = err as { message?: string; code?: string };
        return { success: false, targetAddr, error: error.message, code: error.code };
      } finally {
        workerClient.release();
      }
    });

    const results = await Promise.all(concurrencyTasks);
    console.log("📊 Concurrency Execution Results Summary:");
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);
    console.log(`- Total Requests Dispatched: 10`);
    console.log(`- Successful RPC Completions: ${successes.length}`);
    console.log(`- Rejected / Serialization Failures: ${failures.length}`);

    // 4. Verify Database Invariant
    const verifyClient = await pool.connect();
    const defaultCheck = await verifyClient.query(`
      SELECT id, is_default FROM public.buyer_addresses
      WHERE buyer_id = $1 AND is_default = true;
    `, [testBuyerId]);

    console.log(`🔍 Invariant Check: Found ${defaultCheck.rows.length} default address(es) for buyer.`);
    if (defaultCheck.rows.length === 1) {
      console.log(`✅ INVARIANT PRESERVED: Exactly 1 default address active (${defaultCheck.rows[0].id}).`);
    } else {
      console.error(`❌ INVARIANT VIOLATED: Found ${defaultCheck.rows.length} defaults!`);
    }

    // 5. Clean up dedicated staging fixtures
    console.log("🧹 Cleaning up staging test fixtures...");
    await verifyClient.query("DELETE FROM public.buyer_addresses WHERE buyer_id = $1", [testBuyerId]);
    await verifyClient.query("DELETE FROM public.user_roles WHERE user_id = $1", [testBuyerId]);
    await verifyClient.query("DELETE FROM public.profiles WHERE id = $1", [testBuyerId]);
    await verifyClient.query("DELETE FROM auth.users WHERE id = $1", [testBuyerId]);
    verifyClient.release();
    console.log("✨ Staging cleanup complete. Zero leftover data.");
  } catch (err: unknown) {
    console.error("❌ Staging Concurrency Error:", err);
  } finally {
    await pool.end();
  }
}

runStagingConcurrencyHarness().catch(console.error);

