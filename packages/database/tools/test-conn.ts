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
    console.error("❌ .env.local file not found in searched paths:", candidatePaths);
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

  console.log("🔄 Connecting to Supabase database (Read-only Verification)...");

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query("SELECT version(), current_database(), current_user;");
    console.log("✅ Successfully connected to Supabase Database!");
    console.log("Database:", res.rows[0].current_database);
    console.log("Connected Role:", res.rows[0].current_user);
    console.log("PostgreSQL Version:", res.rows[0].version.split(",")[0]);

    // 1. Guest Identity Constraint
    const constraintsRes = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'enquiries' AND conname = 'enquiries_requester_identity_check';
    `);
    console.log("\n1. Guest Identity Check Constraint:");
    if (constraintsRes.rows.length > 0) {
      console.log(`   [${constraintsRes.rows[0].conname}] ${constraintsRes.rows[0].definition}`);
    } else {
      console.log("   ❌ Constraint 'enquiries_requester_identity_check' NOT FOUND");
    }

    // 2. Guest Idempotency Index
    const indexesRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'enquiries' AND indexname = 'enquiries_guest_idempotency_idx';
    `);
    console.log("\n2. Guest Partial Unique Idempotency Index:");
    if (indexesRes.rows.length > 0) {
      console.log(`   [${indexesRes.rows[0].indexname}] ${indexesRes.rows[0].indexdef}`);
    } else {
      console.log("   ❌ Index 'enquiries_guest_idempotency_idx' NOT FOUND");
    }

    // 3. Authenticated INSERT Column Grants
    const colGrantsRes = await client.query(`
      SELECT column_name, privilege_type 
      FROM information_schema.column_privileges 
      WHERE table_name = 'enquiries' 
        AND grantee = 'authenticated' 
      ORDER BY privilege_type, column_name;
    `);
    console.log("\n3. Authenticated Column Grants on 'public.enquiries':");
    const insertCols = colGrantsRes.rows
      .filter((r: { privilege_type: string }) => r.privilege_type === "INSERT")
      .map((r: { column_name: string }) => r.column_name);
    console.log(`   INSERT columns (${insertCols.length}):`, insertCols.join(", "));
    console.log("   - enquiry_type granted:", insertCols.includes("enquiry_type") ? "✅ YES" : "❌ NO");
    console.log("   - specifications granted:", insertCols.includes("specifications") ? "✅ YES" : "❌ NO");

    // 4. Seller Capabilities Columns
    const sellerCols = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'seller_profiles' 
        AND column_name IN ('capabilities', 'monthly_capacity');
    `);
    console.log("\n4. Seller Profiles Additive Columns:");
    for (const r of sellerCols.rows) {
      console.log(`   - ${r.column_name}: ${r.data_type} (default: ${r.column_default})`);
    }

    // 5. RLS Policies on public.enquiries
    const rlsClassRes = await client.query(`
      SELECT relrowsecurity, relforcerowsecurity 
      FROM pg_class 
      WHERE relname = 'enquiries';
    `);
    console.log("\n5. Row Level Security on 'public.enquiries':");
    console.log(`   RLS Enabled: ${rlsClassRes.rows[0]?.relrowsecurity ? "✅ YES" : "❌ NO"}`);
    const policiesRes = await client.query(`
      SELECT 
        polname, 
        polcmd, 
        polroles::regrole[] as roles,
        pg_get_expr(polqual, polrelid) as using_expr
      FROM pg_policy 
      WHERE polrelid = 'public.enquiries'::regclass
      ORDER BY polname;
    `);
    for (const p of policiesRes.rows) {
      console.log(`   - [${p.polname}] CMD: ${p.polcmd}, ROLES: ${p.roles} | USING: ${p.using_expr}`);
    }

    // 6. SECURITY DEFINER Functions & search_path
    const funcRes = await client.query(`
      SELECT proname, prosecdef, proconfig 
      FROM pg_proc 
      WHERE proname IN ('can_access_enquiry', 'notify_on_enquiry_created', 'transition_enquiry_status');
    `);
    console.log("\n6. Functions Security Configuration:");
    for (const f of funcRes.rows) {
      console.log(`   - ${f.proname}(): SECURITY DEFINER = ${f.prosecdef ? "✅ YES" : "❌ NO"}, CONFIG = ${JSON.stringify(f.proconfig)}`);
    }

    // 7. Notification Trigger Attachment
    const trgRes = await client.query(`
      SELECT tgname, tgenabled, pg_get_triggerdef(t.oid) as trigger_def
      FROM pg_trigger t
      JOIN pg_class cl ON cl.oid = t.tgrelid
      WHERE cl.relname = 'enquiries' AND tgname = 'enquiries_notify_insert_trg';
    `);
    console.log("\n7. Notification Trigger Attachment:");
    if (trgRes.rows.length > 0) {
      console.log(`   [${trgRes.rows[0].tgname}] ${trgRes.rows[0].trigger_def}`);
    } else {
      console.log("   ❌ Trigger 'enquiries_notify_insert_trg' NOT FOUND");
    }

    await client.end();
    process.exit(0);
  } catch (err: unknown) {
    console.error("❌ Database connection error:");
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    await client.end().catch(() => {});
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
