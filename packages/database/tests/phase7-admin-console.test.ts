import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

const IST_TODAY = "(now() at time zone 'Asia/Kolkata')::date";

async function series(
  actor: Parameters<World["env"]["as"]>[0],
  metric: string,
  days: number,
): Promise<Array<{ d: string; t: number }>> {
  return w.env.as<{ d: string; t: number }>(
    actor,
    "select to_char(bucket_date, 'YYYY-MM-DD') as d, bucket_total::int as t from public.admin_time_series($1, $2)",
    [metric, days],
  );
}

async function istDate(offsetDays: number): Promise<string> {
  const rows = await w.env.admin<{ d: string }>(
    `select to_char(${IST_TODAY} + $1::int, 'YYYY-MM-DD') as d`,
    [offsetDays],
  );
  return rows[0]!.d;
}

// ===========================================================================
describe("Admin console: authorization of every new admin RPC", () => {
  const rpcs: Array<[string, string, unknown[]]> = [
    ["admin_dashboard_metrics", "select public.admin_dashboard_metrics()", []],
    ["admin_time_series", "select * from public.admin_time_series('users', 7)", []],
    ["admin_distribution", "select * from public.admin_distribution('seller_status')", []],
    ["admin_moderation_series", "select * from public.admin_moderation_series('product', 7)", []],
    ["admin_category_performance", "select * from public.admin_category_performance()", []],
  ];

  it("denies anon (no EXECUTE) on all admin RPCs", async () => {
    for (const [, sql] of rpcs) {
      expect(await failure(w.env.as(anon, sql))).toMatch(/permission denied/);
    }
    expect(
      await failure(w.env.as(anon, "select public.admin_set_platform_setting('seo', '{}'::jsonb)")),
    ).toMatch(/permission denied/);
    expect(
      await failure(w.env.as(anon, "select public.admin_restore_product(gen_random_uuid(), 'x')")),
    ).toMatch(/permission denied/);
  });

  it("denies buyers and sellers inside the function body", async () => {
    for (const actor of [w.buyerA, w.sellerUserA]) {
      for (const [, sql] of rpcs) {
        expect(await failure(w.env.as(user(actor), sql))).toMatch(/not authorized/);
      }
    }
  });

  it("allows admin and super_admin to read analytics", async () => {
    for (const actor of [w.adminUser, w.superUser]) {
      const rows = await w.env.as<{ m: Record<string, number> }>(
        user(actor),
        "select public.admin_dashboard_metrics() as m",
      );
      expect(rows[0]!.m.users).toBeGreaterThanOrEqual(6);
    }
  });

  it("a suspended admin immediately loses all admin power at the database", async () => {
    const tempAdmin = await w.env.signup("temp-admin-p7@test.dev", "buyer");
    await w.env.as(user(w.superUser), "select public.admin_grant_role($1, 'admin')", [tempAdmin]);
    // Works while active
    await w.env.as(user(tempAdmin), "select public.admin_dashboard_metrics()");
    await w.env.as(user(w.superUser), "select public.admin_set_account_status($1, 'suspended', 'test')", [
      tempAdmin,
    ]);
    expect(await failure(w.env.as(user(tempAdmin), "select public.admin_dashboard_metrics()"))).toMatch(
      /not authorized/,
    );
    expect(
      await w.env.as(user(tempAdmin), "select id from public.seller_profiles"),
    ).toHaveLength(0);
  });
});

// ===========================================================================
describe("Admin console: platform settings", () => {
  it("seeds the four whitelisted keys and exposes only public rows to anon", async () => {
    const rows = await w.env.as<{ key: string }>(anon, "select key from public.platform_settings order by key");
    expect(rows.map((r) => r.key)).toEqual(["contact", "homepage", "marketplace", "seo"]);
  });

  it("only a super_admin may change settings; admins, buyers and sellers cannot", async () => {
    const sql = "select public.admin_set_platform_setting('contact', $1::jsonb)";
    const payload = [JSON.stringify({ email: "support@stonesdekho.com" })];
    for (const actor of [w.adminUser, w.buyerA, w.sellerUserA]) {
      expect(await failure(w.env.as(user(actor), sql, payload))).toMatch(/only a super_admin/);
    }
    await w.env.as(user(w.superUser), sql, payload);
    const rows = await w.env.as<{ email: string }>(
      anon,
      "select value ->> 'email' as email from public.platform_settings where key = 'contact'",
    );
    expect(rows[0]!.email).toBe("support@stonesdekho.com");
  });

  it("records before/after values in the immutable audit log", async () => {
    await w.env.as(
      user(w.superUser),
      "select public.admin_set_platform_setting('seo', $1::jsonb, false)",
      [JSON.stringify({ default_title: "StonesDekho", default_description: "d", default_og_image: "" })],
    );
    const rows = await w.env.as<{ before: string | null; after: string; actor: string; vis: boolean }>(
      user(w.superUser),
      `select metadata -> 'before' ->> 'default_title' as before,
              metadata -> 'after'  ->> 'default_title' as after,
              admin_user_id::text as actor,
              (metadata ->> 'is_public')::boolean as vis
         from public.admin_audit_logs
        where action = 'settings.update' and metadata ->> 'key' = 'seo'
        order by created_at desc limit 1`,
    );
    expect(rows[0]!.before).toBe("");
    expect(rows[0]!.after).toBe("StonesDekho");
    expect(rows[0]!.actor).toBe(w.superUser);
    expect(rows[0]!.vis).toBe(false);
  });

  it("hides non-public settings from anon but keeps them visible to admins", async () => {
    const anonKeys = (await w.env.as<{ key: string }>(anon, "select key from public.platform_settings")).map(
      (r) => r.key,
    );
    expect(anonKeys).not.toContain("seo");
    const adminKeys = (
      await w.env.as<{ key: string }>(user(w.adminUser), "select key from public.platform_settings")
    ).map((r) => r.key);
    expect(adminKeys).toContain("seo");
    // buyers see only public rows
    const buyerKeys = (
      await w.env.as<{ key: string }>(user(w.buyerA), "select key from public.platform_settings")
    ).map((r) => r.key);
    expect(buyerKeys).not.toContain("seo");
  });

  it("validates key, shape and size", async () => {
    const call = (key: string, json: string) =>
      failure(
        w.env.as(user(w.superUser), "select public.admin_set_platform_setting($1, $2::jsonb)", [key, json]),
      );
    expect(await call("evil", "{}")).toMatch(/unknown setting key/);
    expect(await call("seo", "[1,2]")).toMatch(/JSON object/);
    expect(await call("seo", JSON.stringify({ blob: "x".repeat(17000) }))).toMatch(/too large|check/);
  });

  it("has no direct write path for any browser-facing role", async () => {
    // service_role is the trusted server key (never shipped to browsers) and is intentionally excluded.
    for (const actor of [user(w.superUser), user(w.adminUser), user(w.buyerA), anon]) {
      expect(
        await failure(w.env.as(actor, "update public.platform_settings set is_public = true where key = 'seo'")),
      ).toMatch(/permission denied/);
      expect(
        await failure(
          w.env.as(actor, "insert into public.platform_settings (key, value) values ('seo', '{}'::jsonb)"),
        ),
      ).toMatch(/permission denied/);
    }
    expect(
      await failure(
        w.env.as(user(w.superUser), "delete from public.platform_settings where key = 'seo'"),
      ),
    ).toMatch(/permission denied/);
  });
});

// ===========================================================================
describe("Admin console: seller document requests", () => {
  const makeSeller = async (status: string, label: string) => {
    const owner = await w.env.signup(`req-${label}@test.dev`, "seller");
    const id = (
      await w.env.admin<{ id: string }>(
        `insert into public.seller_profiles (user_id, business_name, slug, business_type, verification_status)
         values ($1, $2, $3, 'manufacturer', $4) returning id`,
        [owner, `Req ${label} Stones`, `req-${label}-stones-p7`, status],
      )
    )[0]!.id;
    return { owner, id };
  };

  it("lets an admin request documents: moves submitted -> under_review, stores message, audits and notifies", async () => {
    const s = await makeSeller("submitted", "a");
    await w.env.as(user(w.adminUser), "select public.admin_request_seller_documents($1, $2)", [
      s.id,
      "Please upload a clear GST certificate (PDF).",
    ]);
    const row = (
      await w.env.admin<{ verification_status: string; verification_reason: string }>(
        "select verification_status, verification_reason from public.seller_profiles where id = $1",
        [s.id],
      )
    )[0]!;
    expect(row.verification_status).toBe("under_review");
    expect(row.verification_reason).toContain("GST certificate");

    const audit = await w.env.admin<{ n: string }>(
      "select count(*)::text n from public.admin_audit_logs where action = 'seller.request_documents' and entity_id = $1",
      [s.id],
    );
    expect(Number(audit[0]!.n)).toBe(1);

    const notifs = await w.env.as<{ title: string }>(
      user(s.owner),
      "select title from public.notifications where user_id = $1 and title = 'Additional Verification Documents Requested'",
      [s.owner],
    );
    expect(notifs).toHaveLength(1);
  });

  it("can be repeated while under_review, but not for verified/draft/rejected sellers", async () => {
    const under = await makeSeller("under_review", "b");
    await w.env.as(user(w.adminUser), "select public.admin_request_seller_documents($1, 'Need PAN card too')", [
      under.id,
    ]);
    for (const [status, label] of [
      ["verified", "c"],
      ["draft", "d"],
      ["rejected", "e"],
    ] as const) {
      const s = await makeSeller(status, label);
      expect(
        await failure(
          w.env.as(user(w.adminUser), "select public.admin_request_seller_documents($1, 'Need docs')", [s.id]),
        ),
      ).toMatch(/in review/);
    }
  });

  it("requires a message and an admin caller", async () => {
    const s = await makeSeller("submitted", "f");
    expect(
      await failure(
        w.env.as(user(w.adminUser), "select public.admin_request_seller_documents($1, '   ')", [s.id]),
      ),
    ).toMatch(/message is required/);
    for (const actor of [s.owner, w.buyerA, w.sellerUserB]) {
      expect(
        await failure(
          w.env.as(user(actor), "select public.admin_request_seller_documents($1, 'hello')", [s.id]),
        ),
      ).toMatch(/not authorized/);
    }
  });
});

// ===========================================================================
describe("Admin console: product restore + moderation audit trail", () => {
  it("archive then restore returns the product to the review queue (never auto-approved)", async () => {
    await w.env.as(user(w.adminUser), "select public.admin_moderate_product($1, 'archived', 'Duplicate listing')", [
      w.productA,
    ]);
    await w.env.as(user(w.adminUser), "select public.admin_restore_product($1, 'Seller fixed duplicate')", [
      w.productA,
    ]);
    const row = (
      await w.env.admin<{ moderation_status: string; rejection_reason: string | null }>(
        "select moderation_status, rejection_reason from public.products where id = $1",
        [w.productA],
      )
    )[0]!;
    expect(row.moderation_status).toBe("pending_review");
    expect(row.rejection_reason).toBeNull();

    const audit = await w.env.admin<{ frm: string; to: string }>(
      `select metadata ->> 'from' frm, metadata ->> 'to' "to"
         from public.admin_audit_logs where action = 'product.restore' and entity_id = $1`,
      [w.productA],
    );
    expect(audit).toEqual([{ frm: "archived", to: "pending_review" }]);

    const notifs = await w.env.as<{ n: string }>(
      user(w.sellerUserA),
      "select count(*)::text n from public.notifications where user_id = $1 and title like 'Product Restored%'",
      [w.sellerUserA],
    );
    expect(Number(notifs[0]!.n)).toBe(1);
  });

  it("rejects restore of non-archived products, missing reasons and non-admin callers", async () => {
    expect(
      await failure(w.env.as(user(w.adminUser), "select public.admin_restore_product($1, 'x')", [w.productB])),
    ).toMatch(/only archived/);
    await w.env.as(user(w.adminUser), "select public.admin_moderate_product($1, 'archived', 'temp')", [w.productB]);
    expect(
      await failure(w.env.as(user(w.adminUser), "select public.admin_restore_product($1, '  ')", [w.productB])),
    ).toMatch(/reason is required/);
    for (const actor of [w.sellerUserB, w.buyerA]) {
      expect(
        await failure(w.env.as(user(actor), "select public.admin_restore_product($1, 'please')", [w.productB])),
      ).toMatch(/not authorized/);
    }
    // restore for later tests
    await w.env.as(user(w.adminUser), "select public.admin_restore_product($1, 'done')", [w.productB]);
  });
});

// ===========================================================================
describe("Admin console: dashboard metrics, time series, distributions", () => {
  it("dashboard counters equal ground-truth SQL counts (no hardcoded data)", async () => {
    const m = (
      await w.env.as<{ m: Record<string, number> }>(
        user(w.adminUser),
        "select public.admin_dashboard_metrics() as m",
      )
    )[0]!.m;
    const truth = (
      await w.env.admin<Record<string, string>>(
        `select
           (select count(*) from public.profiles)::text users,
           (select count(distinct user_id) from public.user_roles where role = 'buyer')::text buyers,
           (select count(*) from public.seller_profiles)::text sellers,
           (select count(*) from public.seller_profiles where verification_status = 'verified')::text sellers_verified,
           (select count(*) from public.seller_profiles where verification_status in ('submitted','under_review'))::text sellers_pending,
           (select count(*) from public.seller_profiles where verification_status = 'rejected')::text sellers_rejected,
           (select count(*) from public.products)::text products,
           (select count(*) from public.products where moderation_status = 'pending_review')::text products_pending,
           (select count(*) from public.products where moderation_status = 'approved')::text products_approved,
           (select count(*) from public.products where moderation_status = 'rejected')::text products_rejected,
           (select count(*) from public.enquiries)::text enquiries,
           (select count(*) from public.quotations)::text quotations`,
      )
    )[0]!;
    for (const [k, v] of Object.entries(truth)) {
      expect(m[k], k).toBe(Number(v));
    }
  });

  it("classifies RFQs with the same predicate as the buyer portal", async () => {
    const marker = "x\n--- RFQ Technical & Delivery Specifications ---\nMaterial Type: Granite";
    const flags = (
      await w.env.admin<{ a: boolean; b: boolean; c: boolean; d: boolean }>(
        `select public.is_rfq_enquiry(null, 'plain') a,
                public.is_rfq_enquiry($1, 'plain') b,
                public.is_rfq_enquiry($1, $2) c,
                public.is_rfq_enquiry($1, null) d`,
        [w.productA, marker],
      )
    )[0]!;
    expect(flags).toEqual({ a: true, b: false, c: true, d: false });

    const before = (
      await w.env.as<{ m: { rfqs: number; enquiries: number } }>(
        user(w.adminUser),
        "select public.admin_dashboard_metrics() as m",
      )
    )[0]!.m;
    await w.env.admin(
      `insert into public.enquiries (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
       values ($1, $2, null, 'General RFQ', 'custom lot', 10, 'sq_ft'),
              ($1, $2, $3, 'Product enquiry', 'plain note', 10, 'sq_ft'),
              ($1, $2, $3, 'Product RFQ', $4, 10, 'sq_ft')`,
      [w.buyerA, w.sellerA, w.productA, marker],
    );
    const after = (
      await w.env.as<{ m: { rfqs: number; enquiries: number } }>(
        user(w.adminUser),
        "select public.admin_dashboard_metrics() as m",
      )
    )[0]!.m;
    expect(after.enquiries - before.enquiries).toBe(3);
    expect(after.rfqs - before.rfqs).toBe(2);
  });

  it("time series is zero-filled, inclusive of today, clamped, and validated", async () => {
    const s7 = await series(user(w.adminUser), "users", 7);
    expect(s7).toHaveLength(7);
    expect(s7[6]!.d).toBe(await istDate(0));
    expect(s7[0]!.d).toBe(await istDate(-6));

    expect(await series(user(w.adminUser), "users", 100000)).toHaveLength(366);
    expect(await series(user(w.adminUser), "users", 0)).toHaveLength(1);

    for (const metric of ["buyers", "sellers", "products", "enquiries", "rfqs", "quotations"]) {
      expect(await series(user(w.adminUser), metric, 14)).toHaveLength(14);
    }
    expect(await failure(series(user(w.adminUser), "passwords", 7))).toMatch(/unknown metric/);
  });

  it("buckets on Asia/Kolkata day boundaries (23:59:59 IST vs 00:00:00 IST)", async () => {
    const before = await series(user(w.adminUser), "users", 7);
    await w.env.admin(
      `update public.profiles
          set created_at = ((${IST_TODAY} - 3)::timestamp + interval '23 hours 59 minutes 59 seconds') at time zone 'Asia/Kolkata'
        where id = $1`,
      [w.buyerA],
    );
    await w.env.admin(
      `update public.profiles
          set created_at = ((${IST_TODAY} - 2)::timestamp) at time zone 'Asia/Kolkata'
        where id = $1`,
      [w.buyerB],
    );
    const after = await series(user(w.adminUser), "users", 7);
    const get = (rows: typeof before, d: string) => rows.find((r) => r.d === d)!.t;
    const dMinus3 = await istDate(-3);
    const dMinus2 = await istDate(-2);
    const today = await istDate(0);

    expect(get(after, dMinus3) - get(before, dMinus3)).toBe(1);
    expect(get(after, dMinus2) - get(before, dMinus2)).toBe(1);
    expect(get(before, today) - get(after, today)).toBe(2);
    // Total inside the window is conserved
    expect(after.reduce((a, r) => a + r.t, 0)).toBe(before.reduce((a, r) => a + r.t, 0));
  });

  it("distributions reflect real rows and reject unknown kinds", async () => {
    const seller = await w.env.as<{ label: string; total: number }>(
      user(w.adminUser),
      "select label, total::int total from public.admin_distribution('seller_status')",
    );
    expect(seller.find((r) => r.label === "verified")?.total).toBe(
      Number(
        (
          await w.env.admin<{ n: string }>(
            "select count(*)::text n from public.seller_profiles where verification_status = 'verified'",
          )
        )[0]!.n,
      ),
    );
    expect(seller.reduce((a, r) => a + r.total, 0)).toBe(
      Number((await w.env.admin<{ n: string }>("select count(*)::text n from public.seller_profiles"))[0]!.n),
    );

    const cats = await w.env.as<{ label: string }>(
      user(w.adminUser),
      "select label from public.admin_distribution('category')",
    );
    expect(cats.map((r) => r.label)).toContain("Marble");

    const roles = await w.env.as<{ label: string }>(
      user(w.adminUser),
      "select label from public.admin_distribution('user_role')",
    );
    expect(roles.map((r) => r.label)).toEqual(expect.arrayContaining(["buyer", "seller", "admin", "super_admin"]));

    expect(await failure(w.env.as(user(w.adminUser), "select * from public.admin_distribution('secrets')"))).toMatch(
      /unknown distribution/,
    );
  });

  it("moderation series reads decisions from the audit log", async () => {
    await w.env.as(user(w.adminUser), "select public.admin_moderate_product($1, 'approved')", [w.productA]);
    const rows = await w.env.as<{ d: string; outcome: string; n: number }>(
      user(w.adminUser),
      "select to_char(bucket_date,'YYYY-MM-DD') d, outcome, total::int n from public.admin_moderation_series('product', 7)",
    );
    const today = await istDate(0);
    expect(rows.find((r) => r.d === today && r.outcome === "approved")?.n).toBeGreaterThanOrEqual(1);
    expect(
      await failure(w.env.as(user(w.adminUser), "select * from public.admin_moderation_series('payments', 7)")),
    ).toMatch(/unknown moderation kind/);
  });

  it("category performance counts products and enquiries", async () => {
    const rows = await w.env.as<{ id: string; products: number; approved: number; enquiries: number }>(
      user(w.adminUser),
      `select category_id::text id, products::int products, approved_products::int approved, enquiries::int enquiries
         from public.admin_category_performance()`,
    );
    const marble = rows.find((r) => r.id === w.categoryId)!;
    const truth = (
      await w.env.admin<{ products: string; approved: string; enquiries: string }>(
        `select count(distinct p.id)::text products,
                (count(distinct p.id) filter (where p.moderation_status = 'approved'))::text approved,
                count(distinct e.id)::text enquiries
           from public.products p left join public.enquiries e on e.product_id = p.id
          where p.category_id = $1`,
        [w.categoryId],
      )
    )[0]!;
    expect(marble.products).toBe(3);
    expect(marble.products).toBe(Number(truth.products));
    expect(marble.approved).toBe(Number(truth.approved));
    expect(marble.enquiries).toBe(Number(truth.enquiries));
    expect(marble.enquiries).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
describe("Admin console: category deletion is super_admin-only", () => {
  it("admins can create and edit categories; buyers and sellers cannot", async () => {
    await w.env.as(user(w.adminUser), "insert into public.categories (name, slug) values ('Slate Test', 'slate-test-p7')");
    await w.env.as(user(w.adminUser), "update public.categories set description = 'x' where slug = 'slate-test-p7'");
    for (const actor of [w.buyerA, w.sellerUserA]) {
      expect(
        await failure(
          w.env.as(user(actor), "insert into public.categories (name, slug) values ('Hack', 'hack-p7')"),
        ),
      ).toMatch(/row-level security/);
    }
  });

  it("a plain admin cannot delete a category; a super_admin can (and it is audited)", async () => {
    expect(
      await failure(w.env.as(user(w.adminUser), "delete from public.categories where slug = 'slate-test-p7'")),
    ).toMatch(/only a super_admin/);
    await w.env.as(user(w.superUser), "delete from public.categories where slug = 'slate-test-p7'");
    const gone = await w.env.admin("select 1 from public.categories where slug = 'slate-test-p7'");
    expect(gone).toHaveLength(0);
    const audit = await w.env.admin<{ n: string }>(
      "select count(*)::text n from public.admin_audit_logs where action = 'category.delete' and metadata ->> 'name' = 'Slate Test'",
    );
    expect(Number(audit[0]!.n)).toBe(1);
  });

  it("deleting a category that still has products is blocked even for a super_admin", async () => {
    expect(
      await failure(w.env.as(user(w.superUser), "delete from public.categories where id = $1", [w.categoryId])),
    ).toMatch(/foreign key|violates/);
  });
});

// ===========================================================================
describe("Admin console: privilege escalation and audit-log integrity", () => {
  it("users cannot grant or edit admin roles through RPC or direct writes", async () => {
    expect(
      await failure(w.env.as(user(w.buyerA), "select public.admin_grant_role($1, 'super_admin')", [w.buyerA])),
    ).toMatch(/not authorized/);
    expect(
      await failure(w.env.as(user(w.sellerUserA), "select public.grant_self_role('admin')")),
    ).toMatch(/cannot be self-assigned/);
    for (const sql of [
      "insert into public.user_roles (user_id, role) values ($1, 'admin')",
      "update public.user_roles set role = 'super_admin' where user_id = $1",
      "delete from public.user_roles where user_id = $1",
    ]) {
      expect(await failure(w.env.as(user(w.buyerB), sql, [w.buyerB]))).toMatch(/permission denied/);
    }
  });

  it("an admin cannot grant/revoke admin roles or suspend an admin; a super_admin can", async () => {
    expect(
      await failure(w.env.as(user(w.adminUser), "select public.admin_grant_role($1, 'admin')", [w.buyerB])),
    ).toMatch(/only a super_admin/);
    expect(
      await failure(w.env.as(user(w.adminUser), "select public.admin_grant_role($1, 'super_admin')", [w.adminUser])),
    ).toMatch(/only a super_admin/);
    expect(
      await failure(
        w.env.as(user(w.adminUser), "select public.admin_set_account_status($1, 'suspended', 'no')", [w.superUser]),
      ),
    ).toMatch(/only a super_admin/);

    const promoted = await w.env.signup("promoted-p7@test.dev", "buyer");
    await w.env.as(user(w.superUser), "select public.admin_grant_role($1, 'admin')", [promoted]);
    expect(
      await failure(w.env.as(user(promoted), "select public.admin_grant_role($1, 'admin')", [w.buyerB])),
    ).toMatch(/only a super_admin/);
    await w.env.as(user(w.superUser), "select public.admin_revoke_role($1, 'admin')", [promoted]);
    expect(
      await failure(w.env.as(user(promoted), "select public.admin_dashboard_metrics()")),
    ).toMatch(/not authorized/);
  });

  it("nobody can revoke their own roles or change their own account status", async () => {
    expect(
      await failure(w.env.as(user(w.superUser), "select public.admin_revoke_role($1, 'super_admin')", [w.superUser])),
    ).toMatch(/your own roles/);
    expect(
      await failure(
        w.env.as(user(w.superUser), "select public.admin_set_account_status($1, 'suspended', 'self')", [w.superUser]),
      ),
    ).toMatch(/your own account status/);
  });

  it("audit logs are readable by admins only and are append-only for everyone", async () => {
    const adminRows = await w.env.as<{ n: string }>(
      user(w.adminUser),
      "select count(*)::text n from public.admin_audit_logs",
    );
    expect(Number(adminRows[0]!.n)).toBeGreaterThan(0);
    for (const actor of [w.buyerA, w.sellerUserA]) {
      const rows = await w.env.as<{ n: string }>(
        user(actor),
        "select count(*)::text n from public.admin_audit_logs",
      );
      expect(Number(rows[0]!.n)).toBe(0);
    }
    expect(await w.env.as(anon, "select 1 from public.admin_audit_logs").catch((e: Error) => e.message)).toMatch(
      /permission denied/,
    );

    for (const actor of [user(w.adminUser), user(w.superUser)]) {
      for (const sql of [
        "update public.admin_audit_logs set action = 'tampered'",
        "delete from public.admin_audit_logs",
        "insert into public.admin_audit_logs (admin_user_id, action, entity_type) values (auth.uid(), 'fake', 'x')",
      ]) {
        expect(await failure(w.env.as(actor, sql))).toMatch(/permission denied/);
      }
    }
    // Even a table owner / superuser path is blocked by the append-only trigger.
    expect(await failure(w.env.admin("update public.admin_audit_logs set action = 'tampered'"))).toMatch(
      /append-only/,
    );
    expect(await failure(w.env.admin("delete from public.admin_audit_logs"))).toMatch(/append-only/);
  });
});

// ===========================================================================
describe("Admin console: monitoring is read-only for commercial data (no impersonation)", () => {
  it("an admin cannot change quotations, enquiries or act as a buyer/seller", async () => {
    const enquiryId = (
      await w.env.admin<{ id: string }>(
        `insert into public.enquiries (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
         values ($1, $2, $3, 'Admin readonly check', 'note', 50, 'sq_ft') returning id`,
        [w.buyerA, w.sellerA, w.productA],
      )
    )[0]!.id;
    const quoteId = (
      await w.env.admin<{ id: string }>(
        `insert into public.quotations (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency)
         values ($1, $2, $3, 1000, 180, 100, 0, 1280, 'INR') returning id`,
        [enquiryId, w.sellerA, w.buyerA],
      )
    )[0]!.id;
    await w.env.admin("update public.quotations set status = 'sent' where id = $1", [quoteId]);

    // Admin can SEE it
    expect(
      await w.env.as(user(w.adminUser), "select id from public.quotations where id = $1", [quoteId]),
    ).toHaveLength(1);

    // ...but UPDATE affects zero rows (no admin update policy) and nothing changes
    const updated = await w.env.as(
      user(w.adminUser),
      "update public.quotations set total_amount = 1, subtotal = 1, tax_amount = 0, shipping_charges = 0, status = 'accepted' where id = $1 returning id",
      [quoteId],
    );
    expect(updated).toHaveLength(0);
    const row = (
      await w.env.admin<{ status: string; total_amount: string }>(
        "select status, total_amount::text from public.quotations where id = $1",
        [quoteId],
      )
    )[0]!;
    expect(row.status).toBe("sent");
    expect(Number(row.total_amount)).toBe(1280);

    // Items cannot be edited either
    expect(
      await w.env.as(user(w.adminUser), "update public.quotation_items set unit_price = 0 returning id"),
    ).toHaveLength(0);

    // Cannot create an enquiry on behalf of another buyer
    expect(
      await failure(
        w.env.as(
          user(w.adminUser),
          `insert into public.enquiries (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
           values ($1, $2, $3, 'Impersonated', 'x', 1, 'sq_ft')`,
          [w.buyerA, w.sellerA, w.productA],
        ),
      ),
    ).toMatch(/row-level security/);

    // Enquiry status workflow is untouched by read access: admin cannot make seller/buyer transitions
    expect(
      await failure(
        w.env.as(user(w.adminUser), "select public.transition_enquiry_status($1, 'viewed')", [enquiryId]),
      ),
    ).toMatch(/not allowed|invalid|transition/i);
  });

  it("an admin can read buyer/seller/enquiry/document data needed for review", async () => {
    expect((await w.env.as(user(w.adminUser), "select id from public.profiles")).length).toBeGreaterThanOrEqual(6);
    expect(await w.env.as(user(w.adminUser), "select id from public.seller_profiles")).toHaveLength(
      (await w.env.admin("select id from public.seller_profiles")).length,
    );
    expect((await w.env.as(user(w.adminUser), "select id from public.enquiries")).length).toBeGreaterThan(0);
  });
});
