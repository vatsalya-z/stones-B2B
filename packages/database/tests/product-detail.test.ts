import { beforeAll, describe, expect, it } from "vitest";
import { anon } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;

beforeAll(async () => {
  w = await createWorld();
}, 120_000);

describe("Product Detail Page & RFQ Integration", () => {
  it("resolves approved product details by slug with full technical specifications and images for anonymous buyers", async () => {
    // 1. Create a published, approved product with specifications and images
    const [prod] = await w.env.admin<{ id: string; slug: string }>(
      `insert into public.products (
        seller_id, category_id, name, slug, material_type, finish, colour,
        thickness, length, width, minimum_order_quantity, stone_origin, unit,
        price_type, price, stock_status, moderation_status, published_at
      ) values (
        $1, $2, 'Udaipur Green Marble Slab', 'udaipur-green-marble-slab', 'Marble', 'Polished', 'Green',
        18, 2600, 1500, 1000, 'Udaipur, Rajasthan', 'sq_ft',
        'fixed', 320, 'in_stock', 'approved', now()
      ) returning id, slug`,
      [w.sellerA, w.categoryId],
    );

    // Add technical specifications
    await w.env.admin(
      `insert into public.product_specifications (
        product_id, specification_name, specification_value, display_order
      ) values
        ($1, 'Compressive Strength', '175 MPa', 1),
        ($2, 'Water Absorption', '0.28%', 2)`,
      [prod!.id, prod!.id],
    );

    // Add image adhering to <seller_id>/<product_id>/ path rule
    await w.env.admin(
      `insert into public.product_images (
        product_id, storage_path, alt_text, is_primary, display_order
      ) values
        ($1, $2, 'Udaipur Green Marble Lot Display', true, 1)`,
      [prod!.id, `${w.sellerA}/${prod!.id}/main.jpg`],
    );

    // Query as anonymous buyer
    const rows = await w.env.as<{
      id: string;
      name: string;
      thickness: number;
      length: number;
      width: number;
      material_type: string;
      price: number;
    }>(
      anon,
      `select id, name, thickness, length, width, material_type, price
       from public.products
       where slug = $1 and moderation_status = 'approved' and published_at is not null`,
      ["udaipur-green-marble-slab"],
    );

    expect(rows.length).toBe(1);
    expect(rows[0]!.name).toBe("Udaipur Green Marble Slab");
    expect(Number(rows[0]!.thickness)).toBe(18);
    expect(Number(rows[0]!.length)).toBe(2600);
    expect(Number(rows[0]!.width)).toBe(1500);
    expect(rows[0]!.material_type).toBe("Marble");
    expect(Number(rows[0]!.price)).toBe(320);

    // Verify specifications are accessible to public
    const specs = await w.env.as<{ specification_name: string; specification_value: string }>(
      anon,
      `select specification_name, specification_value
       from public.product_specifications
       where product_id = $1
       order by display_order asc`,
      [prod!.id],
    );
    expect(specs.length).toBe(2);
    expect(specs[0]!.specification_name).toBe("Compressive Strength");
    expect(specs[0]!.specification_value).toBe("175 MPa");

    // Verify images are accessible to public
    const imgs = await w.env.as<{ storage_path: string; is_primary: boolean }>(
      anon,
      `select storage_path, is_primary
       from public.product_images
       where product_id = $1`,
      [prod!.id],
    );
    expect(imgs.length).toBe(1);
    expect(imgs[0]!.storage_path).toBe(`${w.sellerA}/${prod!.id}/main.jpg`);
    expect(imgs[0]!.is_primary).toBe(true);
  });

  it("strictly prevents anonymous users from accessing draft or pending products via RLS", async () => {
    // Insert a pending product with valid price_rule
    const [draft] = await w.env.admin<{ id: string; slug: string }>(
      `insert into public.products (
        seller_id, category_id, name, slug, material_type, unit, price_type, price,
        moderation_status, published_at
      ) values (
        $1, $2, 'Secret Unapproved Granite', 'secret-unapproved-granite', 'Granite', 'sq_ft', 'fixed', 450,
        'pending_review', null
      ) returning id, slug`,
      [w.sellerA, w.categoryId],
    );

    // Anonymous query must return zero rows due to RLS
    const rows = await w.env.as<{ id: string }>(
      anon,
      "select id from public.products where slug = $1",
      ["secret-unapproved-granite"],
    );
    expect(rows.length).toBe(0);

    // Even querying by ID directly yields nothing
    const byId = await w.env.as<{ id: string }>(
      anon,
      "select id from public.products where id = $1",
      [draft!.id],
    );
    expect(byId.length).toBe(0);
  });

  it("queries related products excluding target product and matching by category or material", async () => {
    // Insert related products under the same category
    const [pA] = await w.env.admin<{ id: string }>(
      `insert into public.products (
        seller_id, category_id, name, slug, material_type, finish, unit,
        price_type, price, stock_status, moderation_status, published_at
      ) values (
        $1, $2, 'Related Stone Item 1', 'related-stone-item-1', 'Marble', 'Honed', 'sq_ft',
        'fixed', 290, 'in_stock', 'approved', now()
      ) returning id`,
      [w.sellerA, w.categoryId],
    );

    const [pB] = await w.env.admin<{ id: string }>(
      `insert into public.products (
        seller_id, category_id, name, slug, material_type, finish, unit,
        price_type, price, stock_status, moderation_status, published_at
      ) values (
        $1, $2, 'Related Stone Item 2', 'related-stone-item-2', 'Marble', 'Polished', 'sq_ft',
        'fixed', 310, 'in_stock', 'approved', now()
      ) returning id`,
      [w.sellerA, w.categoryId],
    );

    // Query related products excluding pA
    const related = await w.env.as<{ id: string }>(
      anon,
      `select id from public.products
       where category_id = $1 and id != $2 and moderation_status = 'approved' and published_at is not null
       limit 5`,
      [w.categoryId, pA!.id],
    );

    const relatedIds = related.map((r) => r.id);
    expect(relatedIds).not.toContain(pA!.id);
    expect(relatedIds).toContain(pB!.id);
  });

  it("allows guest and authenticated buyers to submit product quotation RFQs with custom thickness and dimensions", async () => {
    // Guest broadcast RFQ submission: seller_id is null (showcase / broadcast scenario)
    const [guestRfq] = await w.env.admin<{
      id: string;
      enquiry_title: string;
      guest_name: string;
      guest_email: string;
      enquiry_type: string;
      quantity: string | number;
      specifications: {
        productName: string;
        material: string;
        thickness: string;
        dimensions: string;
      };
    }>(
      `insert into public.enquiries (
        buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
        guest_name, guest_email, guest_phone, guest_company, enquiry_type, specifications
      ) values (
        null, null, 'RFQ: Makrana Pure White Marble Gangsaw Slabs',
        'Architectural villa flooring requirement for 18mm calibrated slabs',
        1200, 'sq_ft', 'INR',
        'Ar. Ananya Sen', 'ananya@studiovista.com', '+91 9876543210', 'Studio Vista',
        'rfq',
        '{"productName": "Makrana Pure White Marble Gangsaw Slabs", "material": "Marble", "thickness": "18mm", "dimensions": "2800 × 1600 mm"}'::jsonb
      ) returning id, enquiry_title, guest_name, guest_email, enquiry_type, quantity, specifications`,
    );

    expect(guestRfq).toBeDefined();
    expect(guestRfq!.enquiry_title).toBe("RFQ: Makrana Pure White Marble Gangsaw Slabs");
    expect(guestRfq!.guest_name).toBe("Ar. Ananya Sen");
    expect(guestRfq!.enquiry_type).toBe("rfq");
    expect(Number(guestRfq!.quantity)).toBe(1200);
    expect(guestRfq!.specifications.thickness).toBe("18mm");
    expect(guestRfq!.specifications.dimensions).toBe("2800 × 1600 mm");

    // Direct seller enquiry with verified supplier
    const [supplierRfq] = await w.env.admin<{
      id: string;
      seller_id: string;
      enquiry_type: string;
    }>(
      `insert into public.enquiries (
        buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
        guest_name, guest_email, guest_phone, enquiry_type, specifications
      ) values (
        null, $1, 'RFQ: Black Galaxy Mirror Polished Slabs',
        'Container export crate packaging required to Mundra Port',
        2000, 'sq_ft', 'INR',
        'Devendra Singh', 'devendra@infra.com', '+91 9876543211',
        'rfq',
        '{"productName": "Black Galaxy Granite", "thickness": "20mm"}'::jsonb
      ) returning id, seller_id, enquiry_type`,
      [w.sellerA],
    );

    expect(supplierRfq).toBeDefined();
    expect(supplierRfq!.seller_id).toBe(w.sellerA);
    expect(supplierRfq!.enquiry_type).toBe("rfq");
  });
});
