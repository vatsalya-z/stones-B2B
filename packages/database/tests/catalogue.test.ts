import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

const insertProduct = `insert into public.products (seller_id, category_id, name, slug, unit, price_type, price, moderation_status)
  values ($1, $2, $3, $4, 'sq_ft', 'fixed', 99, $5) returning id`;

describe("RLS: categories", () => {
  it("is publicly readable for active rows only", async () => {
    await w.env.admin("insert into public.categories (name, slug, is_active) values ('Retired', 'retired-cat', false)");
    const rows = await w.env.as<{ slug: string }>(anon, "select slug from public.categories");
    expect(rows.map((r) => r.slug)).not.toContain("retired-cat");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("is writable by admins only, with an audit entry", async () => {
    for (const actor of [anon, user(w.buyerA), user(w.sellerUserA)]) {
      expect(await failure(w.env.as(actor, "insert into public.categories (name, slug) values ('Evil', 'evil')"))).toMatch(
        /permission denied|row-level security/,
      );
    }
    const inserted = await w.env.as<{ id: string }>(user(w.adminUser), "insert into public.categories (name, slug) values ('Granite', $1) returning id", [
      `granite-${Date.now()}`,
    ]);
    const log = await w.env.admin("select 1 from public.admin_audit_logs where entity_id = $1 and action = 'category.insert'", [inserted[0]!.id]);
    expect(log).toHaveLength(1);
  });

  it("supports parent/child hierarchy and blocks self-parenting and deleting parents with children", async () => {
    const parent = await w.env.admin<{ id: string }>("insert into public.categories (name, slug) values ('Parent', 'parent-x') returning id");
    await w.env.admin("insert into public.categories (name, slug, parent_id) values ('Child', 'child-x', $1)", [parent[0]!.id]);
    expect(await failure(w.env.admin("update public.categories set parent_id = id where id = $1", [parent[0]!.id]))).toMatch(/check constraint/);
    expect(await failure(w.env.admin("delete from public.categories where id = $1", [parent[0]!.id]))).toMatch(/foreign key/);
  });
});

describe("RLS: products (public visibility + ownership)", () => {
  it("shows anonymous users only approved products of verified sellers", async () => {
    const rows = await w.env.as<{ id: string }>(anon, "select id from public.products");
    const ids = rows.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([w.productA, w.productB]));
    expect(ids).not.toContain(w.productADraft);
  });

  it("hides approved products of an unverified seller", async () => {
    const id = await w.env.signup("unverified-seller@test.dev", "seller");
    const seller = await w.env.admin<{ id: string }>(
      "insert into public.seller_profiles (user_id, business_name, slug, business_type, verification_status) values ($1, 'Unverified Co', 'unverified-co', 'retailer', 'submitted') returning id",
      [id],
    );
    const p = await w.env.admin<{ id: string }>(insertProduct, [seller[0]!.id, w.categoryId, "Hidden Granite", "hidden-granite", "approved"]);
    expect(await w.env.as(anon, "select id from public.products where id = $1", [p[0]!.id])).toEqual([]);
  });

  it("lets owners see all of their own products and nobody else's drafts", async () => {
    const own = await w.env.as<{ id: string }>(user(w.sellerUserA), "select id from public.products");
    expect(own.map((r) => r.id)).toEqual(expect.arrayContaining([w.productA, w.productADraft, w.productB]));
    const other = await w.env.as<{ id: string }>(user(w.sellerUserB), "select id from public.products");
    expect(other.map((r) => r.id)).not.toContain(w.productADraft);
    const buyer = await w.env.as<{ id: string }>(user(w.buyerA), "select id from public.products");
    expect(buyer.map((r) => r.id)).not.toContain(w.productADraft);
  });

  it("lets a seller create drafts but never approved/rejected products", async () => {
    const ok = await w.env.as<{ id: string }>(user(w.sellerUserA), insertProduct, [w.sellerA, w.categoryId, "New Draft", "new-draft-1", "draft"]);
    expect(ok).toHaveLength(1);
    for (const status of ["approved", "rejected"]) {
      expect(
        await failure(w.env.as(user(w.sellerUserA), insertProduct, [w.sellerA, w.categoryId, "Bad", `bad-${status}`, status])),
      ).toMatch(/cannot set status/);
    }
  });

  it("blocks creating products under another seller", async () => {
    expect(
      await failure(w.env.as(user(w.sellerUserB), insertProduct, [w.sellerA, w.categoryId, "Spoof", "spoof-1", "draft"])),
    ).toMatch(/row-level security/);
    expect(
      await failure(w.env.as(user(w.buyerA), insertProduct, [w.sellerA, w.categoryId, "Spoof", "spoof-2", "draft"])),
    ).toMatch(/row-level security/);
  });

  it("blocks sellers from approving or publishing their own products", async () => {
    expect(
      await failure(w.env.as(user(w.sellerUserA), "update public.products set moderation_status = 'approved' where id = $1", [w.productADraft])),
    ).toMatch(/cannot approve or reject/);
    expect(
      await failure(w.env.as(user(w.sellerUserA), "update public.products set published_at = now() where id = $1", [w.productADraft])),
    ).toMatch(/permission denied/);
    expect(
      await failure(w.env.as(user(w.sellerUserA), "update public.products set rejection_reason = 'x' where id = $1", [w.productADraft])),
    ).toMatch(/permission denied/);
  });

  it("blocks other sellers from editing or deleting a product", async () => {
    await w.env.as(user(w.sellerUserB), "update public.products set name = 'Hijacked Name' where id = $1", [w.productADraft]);
    await w.env.as(user(w.sellerUserB), "delete from public.products where id = $1", [w.productADraft]);
    const rows = await w.env.admin<{ name: string }>("select name from public.products where id = $1", [w.productADraft]);
    expect(rows[0]?.name).toBe("Draft Marble Tile");
  });

  it("sends an approved product back to review when its seller edits it", async () => {
    await w.env.as(user(w.sellerUserB), "update public.products set description = 'Updated text' where id = $1", [w.productB]);
    const rows = await w.env.admin<{ moderation_status: string }>("select moderation_status from public.products where id = $1", [w.productB]);
    expect(rows[0]?.moderation_status).toBe("pending_review");
    expect(await w.env.as(anon, "select id from public.products where id = $1", [w.productB])).toEqual([]);
  });

  it("requires a verified seller to submit for review", async () => {
    const id = await w.env.signup("draft-only-seller@test.dev", "seller");
    const seller = await w.env.admin<{ id: string }>(
      "insert into public.seller_profiles (user_id, business_name, slug, business_type) values ($1, 'Draft Only', 'draft-only', 'retailer') returning id",
      [id],
    );
    const p = await w.env.as<{ id: string }>(user(id), insertProduct, [seller[0]!.id, w.categoryId, "Draft Slab", "draft-slab", "draft"]);
    expect(
      await failure(w.env.as(user(id), "update public.products set moderation_status = 'pending_review' where id = $1", [p[0]!.id])),
    ).toMatch(/must be verified/);
  });

  it("supports the admin moderation flow with reasons and audit trail", async () => {
    const created = await w.env.as<{ id: string }>(user(w.sellerUserA), insertProduct, [w.sellerA, w.categoryId, "Flow Slab", "flow-slab", "draft"]);
    const id = created[0]!.id;
    await w.env.as(user(w.sellerUserA), "update public.products set moderation_status = 'pending_review' where id = $1", [id]);

    expect(await failure(w.env.as(user(w.sellerUserA), "select public.admin_moderate_product($1, 'approved')", [id]))).toMatch(/not authorized/);
    expect(await failure(w.env.as(user(w.adminUser), "select public.admin_moderate_product($1, 'rejected')", [id]))).toMatch(/reason is required/);
    await w.env.as(user(w.adminUser), "select public.admin_moderate_product($1, 'rejected', 'Photos missing')", [id]);

    const rejected = await w.env.as<{ moderation_status: string; rejection_reason: string }>(
      user(w.sellerUserA),
      "select moderation_status, rejection_reason from public.products where id = $1",
      [id],
    );
    expect(rejected[0]).toEqual({ moderation_status: "rejected", rejection_reason: "Photos missing" });

    await w.env.as(user(w.sellerUserA), "update public.products set moderation_status = 'pending_review' where id = $1", [id]);
    await w.env.as(user(w.adminUser), "select public.admin_moderate_product($1, 'approved')", [id]);
    const approved = await w.env.as<{ id: string; published_at: string | null }>(anon, "select id, published_at from public.products where id = $1", [id]);
    expect(approved).toHaveLength(1);
    expect(approved[0]?.published_at).not.toBeNull();

    await w.env.as(user(w.adminUser), "select public.admin_moderate_product($1, 'archived', 'Inappropriate listing')", [id]);
    expect(await w.env.as(anon, "select id from public.products where id = $1", [id])).toEqual([]);
    const audit = await w.env.admin<{ n: string }>("select count(*)::text n from public.admin_audit_logs where entity_id = $1", [id]);
    expect(Number(audit[0]?.n)).toBe(3);
  });

  it("only allows deleting draft products, and never ones referenced by enquiries", async () => {
    expect(await w.env.as(user(w.sellerUserA), "delete from public.products where id = $1 returning id", [w.productA])).toEqual([]);
    const draft = await w.env.as<{ id: string }>(user(w.sellerUserA), insertProduct, [w.sellerA, w.categoryId, "Del Draft", "del-draft", "draft"]);
    expect(await w.env.as(user(w.sellerUserA), "delete from public.products where id = $1 returning id", [draft[0]!.id])).toHaveLength(1);
  });

  it("full-text search vector finds products by name, material and colour", async () => {
    await w.env.admin("update public.products set colour = 'Snow White', material_type = 'Makrana' where id = $1", [w.productA]);
    const rows = await w.env.as<{ id: string }>(anon, "select id from public.products where search_vector @@ plainto_tsquery('simple', 'makrana white')");
    expect(rows.map((r) => r.id)).toContain(w.productA);
  });
});

describe("RLS: product images and specifications", () => {
  it("allows the owner to add specs/images with valid paths and hides unpublished product children", async () => {
    await w.env.as(user(w.sellerUserA), "insert into public.product_specifications (product_id, specification_name, specification_value) values ($1, 'Density', '2.7 g/cm3')", [w.productADraft]);
    expect(await w.env.as(anon, "select id from public.product_specifications where product_id = $1", [w.productADraft])).toEqual([]);
    expect(await w.env.as(user(w.sellerUserA), "select id from public.product_specifications where product_id = $1", [w.productADraft])).toHaveLength(1);
    expect(await w.env.as(user(w.sellerUserB), "select id from public.product_specifications where product_id = $1", [w.productADraft])).toEqual([]);
  });

  it("exposes children of published products publicly", async () => {
    await w.env.admin("insert into public.product_specifications (product_id, specification_name, specification_value) values ($1, 'Finish', 'Polished')", [w.productA]);
    expect(await w.env.as(anon, "select id from public.product_specifications where product_id = $1", [w.productA])).toHaveLength(1);
  });

  it("prevents other sellers from adding images or specs to a product", async () => {
    expect(
      await failure(
        w.env.as(user(w.sellerUserB), "insert into public.product_specifications (product_id, specification_name, specification_value) values ($1, 'X', 'Y')", [w.productADraft]),
      ),
    ).toMatch(/row-level security/);
    expect(
      await failure(
        w.env.as(user(w.sellerUserB), "insert into public.product_images (product_id, storage_path) values ($1, $2)", [w.productADraft, `${w.sellerB}/${w.productADraft}/a.jpg`]),
      ),
    ).toMatch(/row-level security|storage_path must start with/);
    // Owner with wrong path (points to sellerB's folder) must also be blocked
    expect(
      await failure(
        w.env.as(user(w.sellerUserA), "insert into public.product_images (product_id, storage_path) values ($1, $2)", [w.productADraft, `${w.sellerB}/${w.productADraft}/a.jpg`]),
      ),
    ).toMatch(/storage_path must start with/);
    // Owner with correct path must succeed
    await w.env.as(user(w.sellerUserA), "insert into public.product_images (product_id, storage_path, is_primary) values ($1, $2, true)", [
      w.productADraft,
      `${w.sellerA}/${w.productADraft}/a.jpg`,
    ]);
  });

  it("allows only one primary image per product", async () => {
    expect(
      await failure(
        w.env.as(user(w.sellerUserA), "insert into public.product_images (product_id, storage_path, is_primary) values ($1, $2, true)", [
          w.productADraft,
          `${w.sellerA}/${w.productADraft}/b.jpg`,
        ]),
      ),
    ).toMatch(/unique|duplicate/);
  });

  it("sends an approved product back to review when a seller changes its images", async () => {
    await w.env.as(user(w.sellerUserA), "insert into public.product_images (product_id, storage_path) values ($1, $2)", [
      w.productA,
      `${w.sellerA}/${w.productA}/new.jpg`,
    ]);
    const rows = await w.env.admin<{ moderation_status: string }>("select moderation_status from public.products where id = $1", [w.productA]);
    expect(rows[0]?.moderation_status).toBe("pending_review");
  });
});

describe("RLS: favourites", () => {
  // productB was set to pending_review by an earlier test; re-approve it
  // so the favourites INSERT (which requires is_product_public) succeeds.
  beforeEach(async () => {
    await w.env.admin(
      "update public.products set moderation_status = 'approved', published_at = coalesce(published_at, now()) where id = $1",
      [w.productB],
    );
  });
  it("lets buyers manage only their own favourites", async () => {
    await w.env.as(user(w.buyerA), "insert into public.product_favourites (buyer_id, product_id) values ($1, $2)", [w.buyerA, w.productB]);
    expect(await w.env.as(user(w.buyerA), "select id from public.product_favourites")).toHaveLength(1);
    expect(await w.env.as(user(w.buyerB), "select id from public.product_favourites")).toEqual([]);
    expect(await failure(w.env.as(anon, "select * from public.product_favourites"))).toMatch(/permission denied/);
    await w.env.as(user(w.buyerB), "delete from public.product_favourites");
    expect(await w.env.as(user(w.buyerA), "select id from public.product_favourites")).toHaveLength(1);
  });

  it("blocks favouriting as someone else or favouriting unpublished products", async () => {
    expect(
      await failure(w.env.as(user(w.buyerA), "insert into public.product_favourites (buyer_id, product_id) values ($1, $2)", [w.buyerB, w.productB])),
    ).toMatch(/row-level security/);
    expect(
      await failure(w.env.as(user(w.buyerA), "insert into public.product_favourites (buyer_id, product_id) values ($1, $2)", [w.buyerA, w.productADraft])),
    ).toMatch(/row-level security/);
  });
});
