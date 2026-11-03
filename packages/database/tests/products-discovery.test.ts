import { beforeAll, describe, expect, it } from "vitest";
import { anon } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;

beforeAll(async () => {
  w = await createWorld();
}, 120_000);

describe("Products Discovery & Query Filtering Integration", () => {
  it("allows anonymous buyers to filter products by material, finish, and price", async () => {
    // Verified seller A creates a diverse set of approved products via admin
    const p1 = await w.env.admin<{ id: string; price: number }>(
      `insert into public.products (
        seller_id, category_id, name, slug, material_type, finish, colour,
        thickness, stone_origin, unit, price_type, price, stock_status, moderation_status, published_at
      ) values (
        $1, $2, 'Makrana White Special', 'makrana-white-special', 'Marble', 'Polished', 'White',
        18, 'Makrana, Rajasthan', 'sq_ft', 'fixed', 650, 'in_stock', 'approved', now()
      ) returning id, price`,
      [w.sellerA, w.categoryId],
    );

    const p2 = await w.env.admin<{ id: string; price: number }>(
      `insert into public.products (
        seller_id, category_id, name, slug, material_type, finish, colour,
        thickness, stone_origin, unit, price_type, price, stock_status, moderation_status, published_at
      ) values (
        $1, $2, 'Black Galaxy Flamed', 'black-galaxy-flamed', 'Granite', 'Flamed', 'Black',
        20, 'Ongole, Andhra Pradesh', 'sq_ft', 'fixed', 450, 'in_stock', 'approved', now()
      ) returning id, price`,
      [w.sellerA, w.categoryId],
    );

    // Filter by material = 'Marble'
    const marbleRows = await w.env.as<{ id: string; material_type: string }>(
      anon,
      "select id, material_type from public.products where material_type = 'Marble' and moderation_status = 'approved'",
    );
    expect(marbleRows.map((r) => r.id)).toContain(p1[0]!.id);
    expect(marbleRows.map((r) => r.id)).not.toContain(p2[0]!.id);

    // Filter by finish = 'Flamed'
    const flamedRows = await w.env.as<{ id: string; finish: string }>(
      anon,
      "select id, finish from public.products where finish = 'Flamed' and moderation_status = 'approved'",
    );
    expect(flamedRows.map((r) => r.id)).toContain(p2[0]!.id);
    expect(flamedRows.map((r) => r.id)).not.toContain(p1[0]!.id);

    // Filter by price range: 400 to 500
    const priceRows = await w.env.as<{ id: string; price: number }>(
      anon,
      "select id, price from public.products where price >= 400 and price <= 500 and moderation_status = 'approved'",
    );
    expect(priceRows.map((r) => r.id)).toContain(p2[0]!.id);
    expect(priceRows.map((r) => r.id)).not.toContain(p1[0]!.id);

    // Filter by thickness = 18
    const thickRows = await w.env.as<{ id: string; thickness: number }>(
      anon,
      "select id, thickness from public.products where thickness = 18 and moderation_status = 'approved'",
    );
    expect(thickRows.map((r) => r.id)).toContain(p1[0]!.id);
    expect(thickRows.map((r) => r.id)).not.toContain(p2[0]!.id);
  });

  it("sorts products by price ascending and descending correctly", async () => {
    const ascRows = await w.env.as<{ id: string; price: number }>(
      anon,
      "select id, price from public.products where moderation_status = 'approved' and price is not null order by price asc limit 5",
    );
    for (let i = 0; i < ascRows.length - 1; i++) {
      expect(Number(ascRows[i]!.price)).toBeLessThanOrEqual(Number(ascRows[i + 1]!.price));
    }

    const descRows = await w.env.as<{ id: string; price: number }>(
      anon,
      "select id, price from public.products where moderation_status = 'approved' and price is not null order by price desc limit 5",
    );
    for (let i = 0; i < descRows.length - 1; i++) {
      expect(Number(descRows[i]!.price)).toBeGreaterThanOrEqual(Number(descRows[i + 1]!.price));
    }
  });

  it("supports server-side pagination with limit and offset without row duplication", async () => {
    const page1 = await w.env.as<{ id: string }>(
      anon,
      "select id from public.products where moderation_status = 'approved' order by id asc limit 2 offset 0",
    );
    const page2 = await w.env.as<{ id: string }>(
      anon,
      "select id from public.products where moderation_status = 'approved' order by id asc limit 2 offset 2",
    );

    const page1Ids = page1.map((p) => p.id);
    const page2Ids = page2.map((p) => p.id);

    // No overlap between page 1 and page 2
    for (const id of page2Ids) {
      expect(page1Ids).not.toContain(id);
    }
  });
});

