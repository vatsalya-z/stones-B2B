import { beforeAll, describe, expect, it } from "vitest";
import { anon, createEnv, failure, service, user, type TestEnv } from "./helpers";

let env: TestEnv;
beforeAll(async () => {
  env = await createEnv();
}, 120_000);

describe("migrations + schema", () => {
  it("applies all migrations on a clean database", async () => {
    const rows = await env.admin<{ n: string }>(
      "select count(*)::text n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    );
    expect(Number(rows[0]?.n)).toBe(22);
  });

  it("enables RLS on every public table", async () => {
    const rows = await env.admin<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it("uses no floating point types for money/quantity columns", async () => {
    const rows = await env.admin<{ table_name: string; column_name: string }>(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public' and data_type in ('real', 'double precision')`,
    );
    expect(rows).toEqual([]);
  });

  it("every SECURITY DEFINER function pins search_path", async () => {
    const rows = await env.admin<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
    );
    expect(rows).toEqual([]);
  });

  it("anon cannot execute privileged functions", async () => {
    const msg = await failure(env.as(anon, "select public.is_admin()"));
    expect(msg).toMatch(/permission denied/);
    const msg2 = await failure(
      env.as(anon, "select public._write_audit_log('x','y',null,'{}'::jsonb)"),
    );
    expect(msg2).toMatch(/permission denied/);
  });

  it("authenticated cannot execute internal functions", async () => {
    const id = await env.signup("internal@test.dev");
    for (const sql of [
      "select public._write_audit_log('x','y',null,'{}'::jsonb)",
      "select public._set_enquiry_status(gen_random_uuid(),'closed',null,null)",
      "select public._emit_notification(gen_random_uuid(),'t','m','system',null,5)",
    ]) {
      expect(await failure(env.as(user(id), sql))).toMatch(/permission denied/);
    }
  });

  it("seed.sql loads and is idempotent", async () => {
    const { loadSeed } = await import("../tools/pglite");
    await env.admin(loadSeed());
    await env.admin(loadSeed());
    const rows = await env.as<{ n: string }>(anon, "select count(*)::text n from public.categories");
    expect(Number(rows[0]?.n)).toBe(14);
    expect(service.kind).toBe("service");
  });
});
