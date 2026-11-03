import fs from "node:fs";
import path from "node:path";
import pg from "pg";

async function main() {
  const candidatePaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "../../.env.local"),
    path.resolve(process.cwd(), "apps/web/.env.local"),
  ];

  let envPath: string | null = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }

  if (!envPath) {
    console.error("❌ .env.local file not found");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  let databaseUrl: string | null = null;
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      databaseUrl = trimmed.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "").trim();
      break;
    }
  }

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set in .env.local");
    process.exit(1);
  }

  // Path to migration
  const migrationPath = path.resolve(
    process.cwd(),
    "../../supabase/migrations/20261031120000_guest_enquiries_and_rfqs.sql",
  );

  const finalPath = fs.existsSync(migrationPath)
    ? migrationPath
    : path.resolve(process.cwd(), "supabase/migrations/20261031120000_guest_enquiries_and_rfqs.sql");

  if (!fs.existsSync(finalPath)) {
    console.error("❌ Migration file not found at:", finalPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(finalPath, "utf8");

  console.log("🚀 Connecting to live Supabase PostgreSQL database...");
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log("🔄 Starting migration execution within an atomic transaction...");
  try {
    await client.query("BEGIN;");
    await client.query(sqlContent);
    await client.query("COMMIT;");
    console.log("✅ Migration 20261031120000_guest_enquiries_and_rfqs.sql executed and committed successfully!");

    console.log("\n🔍 Running Post-Migration Verification Queries on Live DB:");

    // 1. Check constraint
    const conRes = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def 
      FROM pg_constraint c 
      JOIN pg_class cl ON cl.oid = c.conrelid 
      WHERE cl.relname = 'enquiries' AND conname = 'enquiries_requester_identity_check';
    `);
    console.log("1. enquiries_requester_identity_check:");
    console.log("   ", conRes.rows[0]?.def);

    // 2. Check column privileges
    const privRes = await client.query(`
      SELECT column_name, privilege_type 
      FROM information_schema.column_privileges 
      WHERE table_name = 'enquiries' 
        AND grantee = 'authenticated' 
        AND column_name IN ('enquiry_type', 'specifications')
      ORDER BY column_name, privilege_type;
    `);
    console.log("2. Column privileges for authenticated role:");
    for (const r of privRes.rows) {
      console.log(`    - ${r.column_name}: ${r.privilege_type}`);
    }

    // 3. Check partial index
    const idxRes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'enquiries' AND indexname = 'enquiries_guest_idempotency_idx';
    `);
    console.log("3. Partial unique index:");
    console.log("   ", idxRes.rows[0]?.indexname, "=>", idxRes.rows[0]?.indexdef);

    // 4. Check seller_profiles columns
    const sellerRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'seller_profiles' 
        AND column_name IN ('capabilities', 'monthly_capacity');
    `);
    console.log("4. seller_profiles columns:");
    for (const r of sellerRes.rows) {
      console.log(`    - ${r.column_name} (${r.data_type})`);
    }

    await client.end();
    process.exit(0);
  } catch (err: unknown) {
    await client.query("ROLLBACK;").catch(() => {});
    await client.end().catch(() => {});
    console.error("❌ Migration failed, transaction rolled back!");
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

