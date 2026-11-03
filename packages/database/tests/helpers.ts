import type { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { createMigratedDb } from "../tools/pglite";

export type Actor = { kind: "anon" } | { kind: "service" } | { kind: "user"; id: string };
export const anon: Actor = { kind: "anon" };
export const service: Actor = { kind: "service" };
export const user = (id: string): Actor => ({ kind: "user", id });

export interface TestEnv {
  db: PGlite;
  /** Run SQL as an actor (RLS/grants enforced for anon/user). Always resets role afterwards. */
  as<T = Record<string, unknown>>(actor: Actor, sql: string, params?: unknown[]): Promise<T[]>;
  /** Superuser access for fixtures that must bypass RLS. */
  admin<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  signup(email: string, accountType?: string): Promise<string>;
}

export async function createEnv(): Promise<TestEnv> {
  const db = await createMigratedDb();

  async function as<T>(actor: Actor, sql: string, params: unknown[] = []): Promise<T[]> {
    await db.exec("reset role");
    if (actor.kind === "service") {
      await db.exec("set role service_role");
    } else if (actor.kind === "anon") {
      await db.exec("set role anon");
    } else {
      await db.query("select set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({ sub: actor.id, role: "authenticated" }),
      ]);
      await db.exec("set role authenticated");
    }
    try {
      const res = await db.query<T>(sql, params);
      return res.rows;
    } finally {
      await db.exec("reset role");
      await db.exec("select set_config('request.jwt.claims', '', false)");
    }
  }

  async function admin<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    await db.exec("reset role");
    return (await db.query<T>(sql, params)).rows;
  }

  async function signup(email: string, accountType?: string): Promise<string> {
    const id = randomUUID();
    const meta: Record<string, string> = { full_name: `User ${email}` };
    if (accountType) meta.account_type = accountType;
    await admin("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
      id,
      email,
      JSON.stringify(meta),
    ]);
    return id;
  }

  return { db, as, admin, signup };
}

/** Message of a rejected promise (undefined if it resolved). */
export async function failure(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (e) {
    return (e as Error).message;
  }
}

