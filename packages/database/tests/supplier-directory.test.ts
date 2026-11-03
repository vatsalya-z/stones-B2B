import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;

beforeAll(async () => {
  w = await createWorld();
}, 120_000);

const insertDraftSellerSql = `insert into public.seller_profiles (
    user_id, business_name, slug, business_type, gst_number,
    business_email, phone, business_address, city, state, pincode
  ) values (
    $1, $2, $3, $4, $5, 'corp@test.dev', '9123456780', 'Industrial Area', $6, $7, '313001'
  ) returning id`;

describe("Supplier Directory (/suppliers) — Database Projection & Security Verification", () => {
  it("enforces that only verified sellers appear in public.public_seller_profiles view", async () => {
    // 1. Create a fresh seller profile in 'draft' status
    const draftUserId = await w.env.signup("draft-supplier@test.dev", "seller");
    const draftRows = await w.env.as<{ id: string }>(
      user(draftUserId),
      insertDraftSellerSql,
      [draftUserId, "Draft Stone Works", "draft-stone-works", "manufacturer", "29DDDDD1111D1Z5", "Udaipur", "Rajasthan"],
    );
    expect(draftRows).toHaveLength(1);

    // 2. Query public_seller_profiles as anonymous user
    const publicSellers = await w.env.as<{ slug: string }>(
      anon,
      "select slug from public.public_seller_profiles where slug = 'draft-stone-works'",
    );
    // Draft profile MUST NOT appear in the public view
    expect(publicSellers).toHaveLength(0);

    // 3. Verify that known verified sellers DO appear in the public view
    const verifiedRows = await w.env.as<{ id: string; business_name: string }>(
      anon,
      "select id, business_name from public.public_seller_profiles",
    );
    expect(verifiedRows.length).toBeGreaterThanOrEqual(2);
    expect(verifiedRows.map((r) => r.id)).toContain(w.sellerA);
    expect(verifiedRows.map((r) => r.id)).toContain(w.sellerB);
  });

  it("strictly excludes private credentials and sensitive PII from public_seller_profiles", async () => {
    const sensitiveColumns = [
      "gst_number",
      "business_email",
      "phone",
      "whatsapp_number",
      "business_address",
      "pincode",
      "user_id",
      "owner_name",
      "verification_reason",
    ];

    for (const col of sensitiveColumns) {
      const err = await failure(w.env.as(anon, `select ${col} from public.public_seller_profiles`));
      expect(err).toMatch(/does not exist/);
    }
  });

  it("supports case-insensitive business search on public_seller_profiles", async () => {
    const rows = await w.env.as<{ id: string; business_name: string }>(
      anon,
      "select id, business_name from public.public_seller_profiles where business_name ilike '%makrana%'",
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.id === w.sellerA)).toBe(true);
  });

  it("supports business_type and state filtering on public_seller_profiles", async () => {
    const typeRows = await w.env.as<{ business_type: string }>(
      anon,
      "select business_type from public.public_seller_profiles where business_type = 'manufacturer'",
    );
    for (const r of typeRows) {
      expect(r.business_type).toBe("manufacturer");
    }

    const stateRows = await w.env.as<{ state: string }>(
      anon,
      "select state from public.public_seller_profiles where state = 'Rajasthan'",
    );
    for (const r of stateRows) {
      expect(r.state).toBe("Rajasthan");
    }
  });

  it("denies anonymous access to base seller_profiles table via RLS", async () => {
    const err = await failure(w.env.as(anon, "select * from public.seller_profiles"));
    expect(err).toMatch(/permission denied/);
  });
});
