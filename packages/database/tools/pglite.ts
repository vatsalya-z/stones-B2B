/**
 * Test/tooling harness: boots an in-process Postgres (PGlite), stubs the minimal
 * Supabase platform schemas (auth, storage, roles) and applies the REAL
 * migrations from supabase/migrations in order.
 *
 * Fidelity notes: this is genuine Postgres (RLS, column grants, SECURITY DEFINER,
 * triggers all behave as in production), but auth/storage are minimal stubs, not
 * the real Supabase services. Default privileges mimic Supabase's, so the
 * migrations' explicit REVOKEs are exercised for real.
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = join(here, "../../../supabase/migrations");

const PLATFORM_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  ), '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner_id text default auth.uid()::text,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
create function storage.extension(name text) returns text language plpgsql as $$
declare parts text[];
begin
  parts := string_to_array(name, '.');
  if array_length(parts, 1) < 2 then return ''; end if;
  return parts[array_length(parts, 1)];
end $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
-- Mirror Supabase default privileges so explicit REVOKEs in migrations are meaningful.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
`;

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function createMigratedDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(PLATFORM_STUB);
  for (const file of migrationFiles()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return db;
}

export function loadSeed(): string {
  return readFileSync(join(MIGRATIONS_DIR, "../seed.sql"), "utf8");
}

