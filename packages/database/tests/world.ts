import { randomUUID } from "node:crypto";
import { createEnv, type TestEnv } from "./helpers";

export interface World {
  env: TestEnv;
  buyerA: string;
  buyerB: string;
  sellerUserA: string;
  sellerUserB: string;
  adminUser: string;
  superUser: string;
  sellerA: string; // seller_profiles.id (verified)
  sellerB: string; // seller_profiles.id (verified)
  categoryId: string;
  productA: string; // approved, owned by sellerA
  productADraft: string; // draft, owned by sellerA
  productB: string; // approved, owned by sellerB
}

const rid = () => randomUUID().slice(0, 8);

/** Builds a representative dataset with the superuser (RLS bypass), as a trusted server would. */
export async function createWorld(): Promise<World> {
  const env = await createEnv();
  const s = rid();
  const buyerA = await env.signup(`buyer-a-${s}@test.dev`, "buyer");
  const buyerB = await env.signup(`buyer-b-${s}@test.dev`, "buyer");
  const sellerUserA = await env.signup(`seller-a-${s}@test.dev`, "seller");
  const sellerUserB = await env.signup(`seller-b-${s}@test.dev`, "seller");
  const adminUser = await env.signup(`admin-${s}@test.dev`, "buyer");
  const superUser = await env.signup(`super-${s}@test.dev`, "buyer");
  await env.admin("insert into public.user_roles (user_id, role) values ($1, 'admin'), ($2, 'super_admin')", [
    adminUser,
    superUser,
  ]);

  const seller = async (userId: string, name: string, gst: string): Promise<string> => {
    const rows = await env.admin<{ id: string }>(
      `insert into public.seller_profiles (user_id, business_name, slug, business_type, gst_number, business_email,
         phone, business_address, city, state, pincode, verification_status, verified_at)
       values ($1, $2, $3, 'manufacturer', $4, 'biz@test.dev', '9999999999', '1 Stone Rd', 'Jaipur', 'Rajasthan',
         '302001', 'verified', now()) returning id`,
      [userId, name, `${name.toLowerCase().replace(/\s+/g, "-")}-${s}`, gst],
    );
    return rows[0]!.id;
  };
  const sellerA = await seller(sellerUserA, "Makrana Marble Co", "27ABCDE1234F1Z5");
  const sellerB = await seller(sellerUserB, "Kota Stone Works", "08PQRST5678G1Z9");

  const categoryId = (
    await env.admin<{ id: string }>(
      "insert into public.categories (name, slug) values ('Marble', $1) returning id",
      [`marble-${s}`],
    )
  )[0]!.id;

  const product = async (sellerId: string, name: string, status: string): Promise<string> =>
    (
      await env.admin<{ id: string }>(
        `insert into public.products (seller_id, category_id, name, slug, unit, price_type, price, moderation_status)
         values ($1, $2, $3, $4, 'sq_ft', 'fixed', 120.50, $5) returning id`,
        [sellerId, categoryId, name, `${name.toLowerCase().replace(/\s+/g, "-")}-${s}`, status],
      )
    )[0]!.id;
  const productA = await product(sellerA, "White Makrana Slab", "approved");
  const productADraft = await product(sellerA, "Draft Marble Tile", "draft");
  const productB = await product(sellerB, "Kota Blue Tile", "approved");

  return {
    env,
    buyerA,
    buyerB,
    sellerUserA,
    sellerUserB,
    adminUser,
    superUser,
    sellerA,
    sellerB,
    categoryId,
    productA,
    productADraft,
    productB,
  };
}

