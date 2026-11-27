import { beforeAll, describe, expect, it } from "vitest";
import { anon, createEnv, failure, user, type TestEnv } from "./helpers";

let env: TestEnv;
beforeAll(async () => {
  env = await createEnv();
}, 120_000);

const EXPECTED_MAIN_CATEGORIES = [
  "sandstone",
  "marble",
  "granite",
  "onyx",
  "semi-precious-stone",
  "travertine",
  "slate",
  "limestone",
  "basalt",
  "pebbles-and-cobbles",
];

const EXPECTED_SANDSTONE_VARIETIES = [
  "agra-red",
  "dholpur-beige",
  "dholpur-pink",
  "chocolate",
  "bansi-pink",
  "mint",
  "mint-fossil",
  "lalitpur-yellow",
  "lalitpur-grey",
  "sagar-black",
  "kandla-grey",
  "autumn-brown",
  "raj-green",
  "slate-grey",
  "teak",
  "rainbow",
  "jodhpur-pink",
  "jaisalmer-yellow",
  "camel-dust",
  "ravina",
  "mandana-red",
  "red-multy",
];

const ARTICLES_ENABLED_SANDSTONE = [
  "agra-red",
  "dholpur-beige",
  "dholpur-pink",
  "bansi-pink",
  "mint",
  "teak",
  "rainbow",
  "jodhpur-pink",
  "jaisalmer-yellow",
];

const EXPECTED_MARBLE_VARIETIES = [
  "indian-white-marble",
  "indian-colored-marble",
  "englo-indian-marble",
  "imported-marble",
];

describe("stone taxonomy, product forms & security", () => {
  it("contains all 10 main stone categories with unique slugs", async () => {
    const rows = await env.as<{ slug: string; is_featured: boolean }>(
      anon,
      "select slug, is_featured from public.categories where parent_id is null and is_active = true order by display_order",
    );
    const slugs = rows.map((r) => r.slug);
    for (const expected of EXPECTED_MAIN_CATEGORIES) {
      expect(slugs).toContain(expected);
    }
    expect(rows.every((r) => r.is_featured)).toBe(true);
  });

  it("contains all 22 Sandstone varieties under Sandstone parent", async () => {
    const rows = await env.as<{ slug: string }>(
      anon,
      `select c.slug from public.categories c
       join public.categories p on p.id = c.parent_id
       where p.slug = 'sandstone' and c.is_active = true`,
    );
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toHaveLength(22);
    for (const expected of EXPECTED_SANDSTONE_VARIETIES) {
      expect(slugs).toContain(expected);
    }
  });

  it("contains all 4 client-approved Marble subcategories including Englo Indian Marble", async () => {
    const rows = await env.as<{ slug: string; name: string }>(
      anon,
      `select c.slug, c.name from public.categories c
       join public.categories p on p.id = c.parent_id
       where p.slug = 'marble' and c.is_active = true`,
    );
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toHaveLength(4);
    for (const expected of EXPECTED_MARBLE_VARIETIES) {
      expect(slugs).toContain(expected);
    }
    expect(rows.find((r) => r.slug === "englo-indian-marble")?.name).toBe(
      "Englo Indian Marble",
    );
  });

  it("enables Slabs, Tiles, Blocks for all 22 Sandstone & 4 Marble varieties, and Articles ONLY for the 9 specified Sandstone varieties", async () => {
    const sandstoneForms = await env.as<{ variety: string; form: string }>(
      anon,
      `select c.slug as variety, pf.slug as form
       from public.category_product_forms cpf
       join public.categories c on c.id = cpf.category_id
       join public.categories p on p.id = c.parent_id
       join public.product_forms pf on pf.id = cpf.form_id
       where p.slug = 'sandstone' and cpf.is_enabled = true`,
    );

    for (const variety of EXPECTED_SANDSTONE_VARIETIES) {
      const enabled = sandstoneForms
        .filter((r) => r.variety === variety)
        .map((r) => r.form);
      expect(enabled).toContain("slabs");
      expect(enabled).toContain("tiles");
      expect(enabled).toContain("blocks");
      if (ARTICLES_ENABLED_SANDSTONE.includes(variety)) {
        expect(enabled).toContain("articles");
      } else {
        expect(enabled).not.toContain("articles");
      }
    }

    const marbleForms = await env.as<{ variety: string; form: string }>(
      anon,
      `select c.slug as variety, pf.slug as form
       from public.category_product_forms cpf
       join public.categories c on c.id = cpf.category_id
       join public.categories p on p.id = c.parent_id
       join public.product_forms pf on pf.id = cpf.form_id
       where p.slug = 'marble' and cpf.is_enabled = true`,
    );

    for (const variety of EXPECTED_MARBLE_VARIETIES) {
      const enabled = marbleForms
        .filter((r) => r.variety === variety)
        .map((r) => r.form);
      expect(enabled).toEqual(expect.arrayContaining(["slabs", "tiles", "blocks"]));
      expect(enabled).not.toContain("articles");
    }
  });

  it("blocks non-admins from mutating product_forms, category_product_forms, or reassigning products", async () => {
    const sellerUser = await env.signup("seller-taxonomy@test.dev");
    expect(
      await failure(
        env.as(
          user(sellerUser),
          "insert into public.product_forms (slug, name) values ('custom', 'Custom')",
        ),
      ),
    ).toMatch(/row-level security|permission denied/);

    expect(
      await failure(
        env.as(
          user(sellerUser),
          "select public.admin_reassign_category_products(gen_random_uuid(), gen_random_uuid())",
        ),
      ),
    ).toMatch(/admin authorization required/);
  });

  it("allows admin to safely reassign products between categories and records audit log", async () => {
    const adminUser = await env.signup("admin-taxonomy-test@test.dev", "buyer");
    await env.admin("insert into public.user_roles (user_id, role) values ($1, 'admin')", [adminUser]);

    const catA = (
      await env.admin<{ id: string }>(
        "insert into public.categories (name, slug) values ('Source Stone', 'source-stone') returning id",
      )
    )[0]!.id;

    const catB = (
      await env.admin<{ id: string }>(
        "insert into public.categories (name, slug) values ('Target Stone', 'target-stone') returning id",
      )
    )[0]!.id;

    const sellerUser = await env.signup("seller-reassign@test.dev", "seller");
    const sellerId = (
      await env.admin<{ id: string }>(
        `insert into public.seller_profiles (user_id, business_name, slug, business_type, gst_number, business_email,
           phone, business_address, city, state, pincode, verification_status, verified_at)
         values ($1, 'Reassign Quarry', 'reassign-quarry', 'mine_owner', '08AAACP1234A1Z5', 'rq@test.dev',
           '9876543210', 'Industrial Area', 'Kishangarh', 'Rajasthan', '305801', 'verified', now()) returning id`,
        [sellerUser],
      )
    )[0]!.id;

    const prodId = (
      await env.admin<{ id: string }>(
        `insert into public.products (seller_id, category_id, name, slug, unit, price_type, price, moderation_status)
         values ($1, $2, 'Reassignable Slabs', 'reassignable-slabs', 'sq_ft', 'on_request', null, 'approved') returning id`,
        [sellerId, catA],
      )
    )[0]!.id;

    const moved = await env.as<{ admin_reassign_category_products: number }>(
      user(adminUser),
      "select public.admin_reassign_category_products($1, $2)",
      [catA, catB],
    );
    expect(moved[0]?.admin_reassign_category_products).toBe(1);

    const updated = await env.admin<{ category_id: string }>(
      "select category_id from public.products where id = $1",
      [prodId],
    );
    expect(updated[0]?.category_id).toBe(catB);

    const audit = await env.admin<{ action: string; entity_id: string }>(
      "select action, entity_id from public.admin_audit_logs where action = 'category.products_reassigned' order by created_at desc limit 1",
    );
    expect(audit[0]?.action).toBe("category.products_reassigned");
    expect(audit[0]?.entity_id).toBe(catA);
  });
});
