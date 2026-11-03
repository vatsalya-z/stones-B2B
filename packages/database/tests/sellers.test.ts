import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

const newSellerSql = `insert into public.seller_profiles (user_id, business_name, slug, business_type, gst_number,
  business_email, phone, business_address, city, state, pincode)
  values ($1, 'Fresh Stone Traders', $2, 'exporter', $3, 'x@y.dev', '9000000000', 'Addr', 'Udaipur', 'Rajasthan', '313001')
  returning id`;

describe("RLS: seller profiles", () => {
  it("lets a seller-role user create their own draft profile", async () => {
    const id = await w.env.signup("fresh-seller@test.dev", "seller");
    const rows = await w.env.as<{ id: string }>(user(id), newSellerSql, [id, "fresh-stone-1", "29AAAAA0000A1Z5"]);
    expect(rows).toHaveLength(1);
    const status = await w.env.admin<{ verification_status: string }>(
      "select verification_status from public.seller_profiles where id = $1",
      [rows[0]!.id],
    );
    expect(status[0]?.verification_status).toBe("draft");
  });

  it("blocks creating a profile without the seller role", async () => {
    const msg = await failure(w.env.as(user(w.buyerA), newSellerSql, [w.buyerA, "buyer-biz", "29BBBBB0000B1Z5"]));
    expect(msg).toMatch(/row-level security/);
  });

  it("blocks creating a profile for someone else", async () => {
    const id = await w.env.signup("victim-seller@test.dev", "seller");
    const attacker = await w.env.signup("attacker-seller@test.dev", "seller");
    const msg = await failure(w.env.as(user(attacker), newSellerSql, [id, "stolen", "29CCCCC0000C1Z5"]));
    expect(msg).toMatch(/row-level security/);
  });

  it("blocks self-verification at insert and update", async () => {
    const id = await w.env.signup("selfverify@test.dev", "seller");
    expect(
      await failure(
        w.env.as(
          user(id),
          `insert into public.seller_profiles (user_id, business_name, slug, business_type, verification_status)
           values ($1, 'Sneaky', 'sneaky', 'exporter', 'verified')`,
          [id],
        ),
      ),
    ).toMatch(/permission denied/);
    expect(
      await failure(
        w.env.as(user(w.sellerUserA), "update public.seller_profiles set verification_status = 'verified' where id = $1", [w.sellerA]),
      ),
    ).toMatch(/permission denied/);
  });

  it("seller-to-seller isolation: sellers cannot read or modify each other's profile", async () => {
    const own = await w.env.as<{ id: string }>(user(w.sellerUserA), "select id from public.seller_profiles");
    expect(own.map((r) => r.id)).toEqual([w.sellerA]);
    await w.env.as(user(w.sellerUserB), "update public.seller_profiles set description = 'pwned' where id = $1", [w.sellerA]);
    const rows = await w.env.admin<{ description: string | null }>(
      "select description from public.seller_profiles where id = $1",
      [w.sellerA],
    );
    expect(rows[0]?.description).not.toBe("pwned");
  });

  it("denies anonymous and buyer access to the base table", async () => {
    expect(await failure(w.env.as(anon, "select * from public.seller_profiles"))).toMatch(/permission denied/);
    const rows = await w.env.as(user(w.buyerA), "select * from public.seller_profiles");
    expect(rows).toEqual([]);
  });

  it("exposes only verified sellers and only safe columns publicly", async () => {
    const id = await w.env.signup("hidden-seller@test.dev", "seller");
    await w.env.as(user(id), newSellerSql, [id, "hidden-draft", "29DDDDD0000D1Z5"]);
    const rows = await w.env.as<{ slug: string }>(anon, "select slug from public.public_seller_profiles");
    expect(rows.map((r) => r.slug)).not.toContain("hidden-draft");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const col of ["gst_number", "business_email", "phone", "business_address", "pincode", "user_id"]) {
      expect(await failure(w.env.as(anon, `select ${col} from public.public_seller_profiles`))).toMatch(/does not exist/);
    }
  });

  it("sends a verified seller back to review when GST or business name changes", async () => {
    await w.env.as(user(w.sellerUserB), "update public.seller_profiles set gst_number = '08PQRST5678G1Z8' where id = $1", [w.sellerB]);
    const rows = await w.env.admin<{ verification_status: string; verified_at: string | null }>(
      "select verification_status, verified_at from public.seller_profiles where id = $1",
      [w.sellerB],
    );
    expect(rows[0]).toEqual({ verification_status: "submitted", verified_at: null });
    await w.env.as(user(w.adminUser), "select public.admin_review_seller($1, 'verified')", [w.sellerB]);
  });
});

describe("seller verification workflow", () => {
  it("requires a complete profile and a document before submitting", async () => {
    const id = await w.env.signup("workflow-seller@test.dev", "seller");
    const created = await w.env.as<{ id: string }>(user(id), newSellerSql, [id, "workflow-co", "29EEEEE0000E1Z5"]);
    const sellerId = created[0]!.id;
    expect(await failure(w.env.as(user(id), "select public.submit_seller_verification()"))).toMatch(/upload at least one/);
    await w.env.as(
      user(id),
      "insert into public.seller_verification_documents (seller_id, document_type, storage_path) values ($1, 'gst_certificate', $2)",
      [sellerId, `${sellerId}/gst.pdf`],
    );
    await w.env.as(user(id), "select public.submit_seller_verification()");
    const rows = await w.env.admin<{ verification_status: string }>(
      "select verification_status from public.seller_profiles where id = $1",
      [sellerId],
    );
    expect(rows[0]?.verification_status).toBe("submitted");
    expect(await failure(w.env.as(user(id), "select public.submit_seller_verification()"))).toMatch(/cannot be submitted/);

    // Admin review with reason, then re-submission is possible after rejection.
    expect(await failure(w.env.as(user(w.buyerA), "select public.admin_review_seller($1, 'verified')", [sellerId]))).toMatch(/not authorized/);
    expect(await failure(w.env.as(user(w.adminUser), "select public.admin_review_seller($1, 'rejected')", [sellerId]))).toMatch(/reason is required/);
    await w.env.as(user(w.adminUser), "select public.admin_review_seller($1, 'rejected', 'Blurry GST certificate')", [sellerId]);
    const rejected = await w.env.as<{ verification_status: string; verification_reason: string }>(
      user(id),
      "select verification_status, verification_reason from public.seller_profiles where id = $1",
      [sellerId],
    );
    expect(rejected[0]).toEqual({ verification_status: "rejected", verification_reason: "Blurry GST certificate" });
    await w.env.as(user(id), "select public.submit_seller_verification()");
    await w.env.as(user(w.adminUser), "select public.admin_review_seller($1, 'verified')", [sellerId]);
    const publicRows = await w.env.as<{ slug: string }>(anon, "select slug from public.public_seller_profiles where id = $1", [sellerId]);
    expect(publicRows).toHaveLength(1);
    const audit = await w.env.admin<{ n: string }>(
      "select count(*)::text n from public.admin_audit_logs where entity_id = $1 and action = 'seller.review'",
      [sellerId],
    );
    expect(Number(audit[0]?.n)).toBe(2);
  });

  it("rejects invalid status transitions", async () => {
    expect(
      await failure(w.env.as(user(w.adminUser), "select public.admin_review_seller($1, 'draft')", [w.sellerA])),
    ).toMatch(/invalid transition/);
  });

  it("verified sellers can be suspended and disappear from the public view and product listings", async () => {
    await w.env.as(user(w.adminUser), "select public.admin_review_seller($1, 'suspended', 'Policy violation')", [w.sellerB]);
    const sellers = await w.env.as<{ id: string }>(anon, "select id from public.public_seller_profiles where id = $1", [w.sellerB]);
    expect(sellers).toEqual([]);
    const products = await w.env.as(anon, "select id from public.products where id = $1", [w.productB]);
    expect(products).toEqual([]);
    // suspended seller can no longer edit their profile
    await w.env.as(user(w.sellerUserB), "update public.seller_profiles set description = 'x' where id = $1", [w.sellerB]);
    const rows = await w.env.admin<{ description: string | null }>("select description from public.seller_profiles where id = $1", [w.sellerB]);
    expect(rows[0]?.description).not.toBe("x");
    await w.env.as(user(w.adminUser), "select public.admin_review_seller($1, 'verified')", [w.sellerB]);
  });
});

describe("RLS: seller verification documents (private)", () => {
  let docId: string;
  beforeAll(async () => {
    const rows = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      "insert into public.seller_verification_documents (seller_id, document_type, storage_path) values ($1, 'pan_card', $2) returning id",
      [w.sellerA, `${w.sellerA}/pan.pdf`],
    );
    docId = rows[0]!.id;
  });

  it("is visible to the owner and admins only", async () => {
    expect(await w.env.as(user(w.sellerUserA), "select id from public.seller_verification_documents")).toHaveLength(1);
    expect(await w.env.as(user(w.adminUser), "select id from public.seller_verification_documents where id = $1", [docId])).toHaveLength(1);
    expect(await w.env.as(user(w.sellerUserB), "select id from public.seller_verification_documents")).toEqual([]);
    expect(await w.env.as(user(w.buyerA), "select id from public.seller_verification_documents")).toEqual([]);
    expect(await failure(w.env.as(anon, "select * from public.seller_verification_documents"))).toMatch(/permission denied/);
  });

  it("cannot be inserted against another seller", async () => {
    expect(
      await failure(
        w.env.as(
          user(w.sellerUserB),
          "insert into public.seller_verification_documents (seller_id, document_type, storage_path) values ($1, 'other', $2)",
          [w.sellerA, `${w.sellerA}/evil.pdf`],
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it("rejects storage paths outside the seller's folder", async () => {
    expect(
      await failure(
        w.env.as(
          user(w.sellerUserA),
          "insert into public.seller_verification_documents (seller_id, document_type, storage_path) values ($1, 'other', $2)",
          [w.sellerA, `${w.sellerB}/x.pdf`],
        ),
      ),
    ).toMatch(/seller_docs_path_owner|check constraint/);
  });

  it("sellers cannot approve their own documents; admins can via function (audited)", async () => {
    expect(
      await failure(w.env.as(user(w.sellerUserA), "update public.seller_verification_documents set verification_status = 'approved' where id = $1", [docId])),
    ).toMatch(/permission denied/);
    await w.env.as(user(w.adminUser), "select public.admin_review_document($1, 'approved')", [docId]);
    const rows = await w.env.admin<{ verification_status: string; reviewed_by: string }>(
      "select verification_status, reviewed_by from public.seller_verification_documents where id = $1",
      [docId],
    );
    expect(rows[0]).toEqual({ verification_status: "approved", reviewed_by: w.adminUser });
  });

  it("approved documents cannot be deleted by the seller", async () => {
    await w.env.as(user(w.sellerUserA), "delete from public.seller_verification_documents where id = $1", [docId]);
    const rows = await w.env.admin("select 1 from public.seller_verification_documents where id = $1", [docId]);
    expect(rows).toHaveLength(1);
  });
});
