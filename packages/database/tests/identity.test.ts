import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

describe("profile creation (signup trigger)", () => {
  it("creates a profile and buyer role for a buyer signup", async () => {
    const id = await w.env.signup("new-buyer@test.dev", "buyer");
    const profile = await w.env.admin<{ email: string; account_status: string }>(
      "select email, account_status from public.profiles where id = $1",
      [id],
    );
    expect(profile[0]).toMatchObject({ email: "new-buyer@test.dev", account_status: "active" });
    const roles = await w.env.admin<{ role: string }>("select role from public.user_roles where user_id = $1", [id]);
    expect(roles.map((r) => r.role)).toEqual(["buyer"]);
  });

  it("creates the seller role for a seller signup", async () => {
    const id = await w.env.signup("new-seller@test.dev", "seller");
    const roles = await w.env.admin<{ role: string }>("select role from public.user_roles where user_id = $1", [id]);
    expect(roles.map((r) => r.role)).toEqual(["seller"]);
  });

  it.each(["admin", "super_admin", "", "root"])("never grants privileged role from signup metadata (%j)", async (type) => {
    const id = await w.env.signup(`esc-${type || "empty"}@test.dev`, type);
    const roles = await w.env.admin<{ role: string }>("select role from public.user_roles where user_id = $1", [id]);
    expect(roles.map((r) => r.role)).toEqual(["buyer"]);
  });

  it("is idempotent: ensure_profile does not duplicate or fail", async () => {
    const id = await w.env.signup("idem@test.dev", "buyer");
    await w.env.as(user(id), "select public.ensure_profile()");
    await w.env.as(user(id), "select public.ensure_profile()");
    const rows = await w.env.admin<{ n: string }>("select count(*)::text n from public.profiles where id = $1", [id]);
    expect(rows[0]?.n).toBe("1");
    const roles = await w.env.admin<{ n: string }>("select count(*)::text n from public.user_roles where user_id = $1", [id]);
    expect(roles[0]?.n).toBe("1");
  });

  it("ensure_profile repairs a missing profile", async () => {
    const id = await w.env.signup("repair@test.dev", "buyer");
    await w.env.admin("delete from public.user_roles where user_id = $1", [id]);
    await w.env.admin("delete from public.profiles where id = $1", [id]);
    await w.env.as(user(id), "select public.ensure_profile()");
    const rows = await w.env.admin<{ email: string }>("select email from public.profiles where id = $1", [id]);
    expect(rows[0]?.email).toBe("repair@test.dev");
  });

  it("ensure_profile rejects anonymous callers", async () => {
    expect(await failure(w.env.as(anon, "select public.ensure_profile()"))).toMatch(/permission denied/);
  });

  it("syncs profile email when the auth email changes", async () => {
    const id = await w.env.signup("old@test.dev", "buyer");
    await w.env.admin("update auth.users set email = 'changed@test.dev' where id = $1", [id]);
    const rows = await w.env.admin<{ email: string }>("select email from public.profiles where id = $1", [id]);
    expect(rows[0]?.email).toBe("changed@test.dev");
  });
});

describe("database constraints", () => {
  it("rejects invalid account_status", async () => {
    expect(
      await failure(w.env.admin("update public.profiles set account_status = 'banned' where id = $1", [w.buyerA])),
    ).toMatch(/check constraint/);
  });

  it("rejects duplicate role assignment", async () => {
    expect(
      await failure(w.env.admin("insert into public.user_roles (user_id, role) values ($1, 'buyer')", [w.buyerA])),
    ).toMatch(/unique|duplicate/);
  });

  it("rejects unknown role values", async () => {
    expect(
      await failure(w.env.admin("insert into public.user_roles (user_id, role) values ($1, 'owner')", [w.buyerA])),
    ).toMatch(/check constraint/);
  });

  it("enforces foreign keys (profile must reference auth.users)", async () => {
    expect(
      await failure(w.env.admin("insert into public.profiles (id) values (gen_random_uuid())")),
    ).toMatch(/foreign key/);
  });

  it("enforces foreign keys on enquiries", async () => {
    expect(
      await failure(
        w.env.admin(
          `insert into public.enquiries (buyer_id, seller_id, enquiry_title, description, quantity, unit)
           values ($1, gen_random_uuid(), 'Title', 'Desc', 1, 'slab')`,
          [w.buyerA],
        ),
      ),
    ).toMatch(/foreign key/);
  });

  it("rejects invalid enquiry status and non-positive quantity", async () => {
    const base = `insert into public.enquiries (buyer_id, seller_id, enquiry_title, description, quantity, unit, status)`;
    expect(await failure(w.env.admin(`${base} values ($1, $2, 'Title', 'Desc', 1, 'slab', 'weird')`, [w.buyerA, w.sellerA]))).toMatch(/check constraint/);
    expect(await failure(w.env.admin(`${base} values ($1, $2, 'Title', 'Desc', 0, 'slab', 'submitted')`, [w.buyerA, w.sellerA]))).toMatch(/check constraint/);
  });

  it("enforces unique seller slug / GST and one seller profile per user", async () => {
    const dup = await failure(
      w.env.admin(
        `insert into public.seller_profiles (user_id, business_name, slug, business_type)
         values ($1, 'Another', 'another-slug', 'exporter')`,
        [w.sellerUserA],
      ),
    );
    expect(dup).toMatch(/unique|duplicate/);
    const gst = await failure(
      w.env.admin(`update public.seller_profiles set gst_number = '08PQRST5678G1Z9' where id = $1`, [w.sellerA]),
    );
    expect(gst).toMatch(/unique|duplicate/);
  });

  it("rejects malformed GST numbers and slugs", async () => {
    expect(await failure(w.env.admin(`update public.seller_profiles set gst_number = 'BAD' where id = $1`, [w.sellerA]))).toMatch(/check constraint/);
    expect(await failure(w.env.admin(`update public.categories set slug = 'Bad Slug' where id = $1`, [w.categoryId]))).toMatch(/check constraint/);
  });

  it("enforces product price rule and money precision", async () => {
    expect(
      await failure(w.env.admin(`update public.products set price_type = 'on_request' where id = $1`, [w.productA])),
    ).toMatch(/products_price_rule/);
    expect(
      await failure(w.env.admin(`update public.products set price = -1 where id = $1`, [w.productA])),
    ).toMatch(/check constraint/);
  });

  it("rejects duplicate favourites", async () => {
    await w.env.as(user(w.buyerA), "insert into public.product_favourites (buyer_id, product_id) values ($1, $2)", [w.buyerA, w.productA]);
    expect(
      await failure(
        w.env.as(user(w.buyerA), "insert into public.product_favourites (buyer_id, product_id) values ($1, $2)", [w.buyerA, w.productA]),
      ),
    ).toMatch(/unique|duplicate/);
  });

  it("makes audit logs append-only, even for the service role", async () => {
    await w.env.as(user(w.adminUser), "select public.admin_grant_role($1, 'seller')", [w.buyerB]);
    expect(await failure(w.env.admin("delete from public.admin_audit_logs"))).toMatch(/append-only/);
    expect(await failure(w.env.admin("update public.admin_audit_logs set action = 'x'"))).toMatch(/append-only/);
  });

  it("does not cascade-delete commercial records when a parent is removed", async () => {
    expect(await failure(w.env.admin("delete from public.seller_profiles where id = $1", [w.sellerA]))).toMatch(/foreign key|violates/);
  });
});

describe("RLS: profiles", () => {
  it("lets a user read only their own profile", async () => {
    const rows = await w.env.as<{ id: string }>(user(w.buyerA), "select id from public.profiles");
    expect(rows.map((r) => r.id)).toEqual([w.buyerA]);
  });

  it("denies anonymous access", async () => {
    expect(await failure(w.env.as(anon, "select * from public.profiles"))).toMatch(/permission denied/);
  });

  it("lets a user update permitted fields", async () => {
    await w.env.as(user(w.buyerA), "update public.profiles set full_name = 'Renamed', city = 'Pune' where id = $1", [w.buyerA]);
    const rows = await w.env.admin<{ full_name: string }>("select full_name from public.profiles where id = $1", [w.buyerA]);
    expect(rows[0]?.full_name).toBe("Renamed");
  });

  it.each(["account_status = 'suspended'", "email = 'x@y.z'", "id = gen_random_uuid()"])(
    "blocks updating privileged column: %s",
    async (assignment) => {
      expect(
        await failure(w.env.as(user(w.buyerA), `update public.profiles set ${assignment} where id = $1`, [w.buyerA])),
      ).toMatch(/permission denied/);
    },
  );

  it("cannot update another user's profile (buyer-to-buyer isolation)", async () => {
    await w.env.as(user(w.buyerA), "update public.profiles set full_name = 'Hacked' where id = $1", [w.buyerB]);
    const rows = await w.env.admin<{ full_name: string }>("select full_name from public.profiles where id = $1", [w.buyerB]);
    expect(rows[0]?.full_name).not.toBe("Hacked");
  });

  it("lets an admin read all profiles", async () => {
    const rows = await w.env.as<{ n: string }>(user(w.adminUser), "select count(*)::text n from public.profiles");
    expect(Number(rows[0]?.n)).toBeGreaterThan(5);
  });

  it("blocks writes from a suspended user", async () => {
    const id = await w.env.signup("susp@test.dev", "buyer");
    await w.env.admin("update public.profiles set account_status = 'suspended' where id = $1", [id]);
    await w.env.as(user(id), "update public.profiles set full_name = 'Nope' where id = $1", [id]);
    const rows = await w.env.admin<{ full_name: string }>("select full_name from public.profiles where id = $1", [id]);
    expect(rows[0]?.full_name).not.toBe("Nope");
  });
});

describe("RLS + functions: roles and privilege escalation", () => {
  it("denies direct inserts/updates/deletes on user_roles", async () => {
    const u = user(w.buyerA);
    expect(await failure(w.env.as(u, "insert into public.user_roles (user_id, role) values ($1, 'admin')", [w.buyerA]))).toMatch(/permission denied/);
    expect(await failure(w.env.as(u, "update public.user_roles set role = 'super_admin' where user_id = $1", [w.buyerA]))).toMatch(/permission denied/);
    expect(await failure(w.env.as(u, "delete from public.user_roles where user_id = $1", [w.buyerA]))).toMatch(/permission denied/);
  });

  it("lets users read only their own roles", async () => {
    const rows = await w.env.as<{ user_id: string }>(user(w.buyerA), "select user_id from public.user_roles");
    expect(new Set(rows.map((r) => r.user_id))).toEqual(new Set([w.buyerA]));
  });

  it("blocks self-assigning privileged roles via grant_self_role", async () => {
    for (const role of ["admin", "super_admin"]) {
      expect(await failure(w.env.as(user(w.buyerA), "select public.grant_self_role($1)", [role]))).toMatch(/cannot be self-assigned/);
    }
  });

  it("allows adding seller capability to a buyer (multi-role user)", async () => {
    await w.env.as(user(w.buyerB), "select public.grant_self_role('seller')");
    const rows = await w.env.admin<{ role: string }>("select role from public.user_roles where user_id = $1 order by role", [w.buyerB]);
    expect(rows.map((r) => r.role)).toEqual(expect.arrayContaining(["buyer", "seller"]));
  });

  it("rejects admin_grant_role from non-admins", async () => {
    expect(await failure(w.env.as(user(w.buyerA), "select public.admin_grant_role($1, 'admin')", [w.buyerA]))).toMatch(/not authorized/);
  });

  it("lets an admin grant seller but not admin/super_admin", async () => {
    const target = await w.env.signup("target1@test.dev", "buyer");
    await w.env.as(user(w.adminUser), "select public.admin_grant_role($1, 'seller')", [target]);
    expect(await failure(w.env.as(user(w.adminUser), "select public.admin_grant_role($1, 'admin')", [target]))).toMatch(/only a super_admin/);
    expect(await failure(w.env.as(user(w.adminUser), "select public.admin_grant_role($1, 'super_admin')", [target]))).toMatch(/only a super_admin/);
  });

  it("lets a super_admin grant admin, with an audit entry", async () => {
    const target = await w.env.signup("target2@test.dev", "buyer");
    await w.env.as(user(w.superUser), "select public.admin_grant_role($1, 'admin')", [target]);
    const log = await w.env.admin<{ admin_user_id: string }>(
      "select admin_user_id from public.admin_audit_logs where entity_id = $1 and action = 'role.grant'",
      [target],
    );
    expect(log[0]?.admin_user_id).toBe(w.superUser);
  });

  it("prevents admins from revoking their own role or suspending themselves", async () => {
    expect(await failure(w.env.as(user(w.superUser), "select public.admin_revoke_role($1, 'super_admin')", [w.superUser]))).toMatch(/own roles/);
    expect(await failure(w.env.as(user(w.adminUser), "select public.admin_set_account_status($1, 'suspended')", [w.adminUser]))).toMatch(/own account/);
  });

  it("only a super_admin can suspend an admin account", async () => {
    expect(await failure(w.env.as(user(w.adminUser), "select public.admin_set_account_status($1, 'suspended')", [w.superUser]))).toMatch(/only a super_admin/);
  });

  it("an admin can suspend and reactivate a buyer; suspended users lose capabilities", async () => {
    const id = await w.env.signup("tosuspend@test.dev", "buyer");
    await w.env.as(user(w.adminUser), "select public.admin_set_account_status($1, 'suspended', 'abuse')", [id]);
    const active = await w.env.as<{ a: boolean; b: boolean }>(user(id), "select public.current_account_active() a, public.has_role('buyer') b");
    expect(active[0]).toEqual({ a: false, b: false });
    await w.env.as(user(w.adminUser), "select public.admin_set_account_status($1, 'active')", [id]);
    const again = await w.env.as<{ b: boolean }>(user(id), "select public.has_role('buyer') b");
    expect(again[0]?.b).toBe(true);
  });

  it("an admin role granted by a deactivated admin no longer authorises", async () => {
    const id = await w.env.signup("ex-admin@test.dev", "buyer");
    await w.env.admin("insert into public.user_roles (user_id, role) values ($1, 'admin')", [id]);
    await w.env.admin("update public.profiles set account_status = 'suspended' where id = $1", [id]);
    const rows = await w.env.as<{ a: boolean }>(user(id), "select public.is_admin() a");
    expect(rows[0]?.a).toBe(false);
  });
});

describe("RLS: admin audit logs", () => {
  it("is readable by admins only", async () => {
    await w.env.as(user(w.adminUser), "select public.admin_grant_role($1, 'seller')", [w.buyerA]);
    const adminRows = await w.env.as<{ n: string }>(user(w.adminUser), "select count(*)::text n from public.admin_audit_logs");
    expect(Number(adminRows[0]?.n)).toBeGreaterThan(0);
    const buyerRows = await w.env.as<{ n: string }>(user(w.buyerA), "select count(*)::text n from public.admin_audit_logs");
    expect(buyerRows[0]?.n).toBe("0");
    expect(await failure(w.env.as(anon, "select * from public.admin_audit_logs"))).toMatch(/permission denied/);
  });

  it("cannot be written by normal users or admins directly", async () => {
    for (const u of [user(w.buyerA), user(w.adminUser)]) {
      expect(
        await failure(
          w.env.as(u, "insert into public.admin_audit_logs (admin_user_id, action, entity_type) values ($1, 'fake', 'x')", [w.buyerA]),
        ),
      ).toMatch(/permission denied/);
    }
  });
});

