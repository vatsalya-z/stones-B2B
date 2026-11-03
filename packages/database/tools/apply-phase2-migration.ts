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

  // Path to Phase 2 migration
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261102140000_orders_and_order_items.sql",
  );
  const altPath = path.resolve(
    process.cwd(),
    "../../supabase/migrations/20261102140000_orders_and_order_items.sql",
  );

  const finalPath = fs.existsSync(migrationPath)
    ? migrationPath
    : fs.existsSync(altPath)
    ? altPath
    : null;

  if (!finalPath) {
    console.error("❌ Migration file 20261102140000_orders_and_order_items.sql not found!");
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(finalPath, "utf8");

  console.log("🚀 Connecting to live Supabase PostgreSQL database...");
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log("🔍 Checking if Phase 2 tables already exist...");
  const existingTablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('orders', 'order_items', 'order_status_history', 'buyer_addresses');
  `);

  if (existingTablesRes.rows.length === 4) {
    console.log("ℹ️ All Phase 2 tables already exist in database:", existingTablesRes.rows.map(r => r.table_name).join(", "));
  } else {
    console.log(`ℹ️ Existing Phase 2 tables (${existingTablesRes.rows.length}/4):`, existingTablesRes.rows.map(r => r.table_name).join(", ") || "none");
  }

  console.log("🔄 Executing Phase 2 Migration 20261102140000_orders_and_order_items.sql inside atomic transaction...");
  try {
    await client.query("BEGIN;");
    await client.query(sqlContent);
    await client.query("COMMIT;");
    console.log("✅ Migration 20261102140000_orders_and_order_items.sql executed and committed successfully!\n");

    console.log("🔍 Running Post-Migration Verification Queries on Live DB:");

    // 1. Verify Tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('orders', 'order_items', 'order_status_history', 'buyer_addresses')
      ORDER BY table_name;
    `);
    console.log("1. Tables created in public schema:");
    for (const r of tablesRes.rows) {
      console.log(`   ✅ ${r.table_name}`);
    }

    // 2. Verify Sequence
    const seqRes = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public' AND sequence_name = 'order_number_seq';
    `);
    console.log("\n2. Order number sequence:");
    console.log(`   ${seqRes.rows.length > 0 ? "✅" : "❌"} ${seqRes.rows[0]?.sequence_name || "NOT FOUND"}`);

    // 3. Verify Functions
    const funcRes = await client.query(`
      SELECT proname, prosecdef, proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' 
        AND proname IN ('accept_quotation_and_create_order', 'transition_order_status', 'sanitize_and_validate_order_address', 'orders_immutability_guard', 'order_items_insert_guard')
      ORDER BY proname;
    `);
    console.log("\n3. RPC & Guard Functions:");
    for (const r of funcRes.rows) {
      console.log(`   ✅ ${r.proname}() - SECURITY DEFINER: ${r.prosecdef}, CONFIG: ${JSON.stringify(r.proconfig)}`);
    }

    // 4. Verify Triggers
    const trgRes = await client.query(`
      SELECT tgname, relname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND tgname IN ('orders_immutability_guard_trg', 'order_items_insert_guard_trg', 'order_items_prevent_mutation', 'order_status_history_immutable', 'orders_set_updated_at', 'buyer_addresses_set_updated_at')
      ORDER BY relname, tgname;
    `);
    console.log("\n4. Triggers attached:");
    for (const r of trgRes.rows) {
      console.log(`   ✅ [${r.relname}] ${r.tgname}`);
    }

    // 5. Verify RLS
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' 
        AND tablename IN ('orders', 'order_items', 'order_status_history', 'buyer_addresses')
      ORDER BY tablename;
    `);
    console.log("\n5. Row Level Security:");
    for (const r of rlsRes.rows) {
      console.log(`   ✅ ${r.tablename} - RLS Enabled: ${r.rowsecurity}`);
    }

    // 6. Verify Policies
    const polRes = await client.query(`
      SELECT tablename, policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'public' 
        AND tablename IN ('orders', 'order_items', 'order_status_history', 'buyer_addresses')
      ORDER BY tablename, policyname;
    `);
    console.log(`\n6. Active Policies (${polRes.rows.length}):`);
    for (const r of polRes.rows) {
      console.log(`   - [${r.tablename}] ${r.policyname} (${r.cmd}) -> ${r.roles}`);
    }

    await client.end();
    console.log("\n✨ Live Database Schema Update Completed Successfully!");
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

