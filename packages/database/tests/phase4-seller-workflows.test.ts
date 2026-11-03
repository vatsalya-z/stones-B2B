import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

describe("Phase 4 Seller Portal End-to-End Database & RLS Workflows", () => {
  it("completes seller onboarding, document upload, rejection feedback, and verification re-submission", async () => {
    const sellerUser = await w.env.signup("phase4-onboard@test.dev", "seller");

    // 1. Save partial draft seller profile
    const created = await w.env.as<{ id: string; verification_status: string }>(
      user(sellerUser),
      `insert into public.seller_profiles
         (user_id, business_name, slug, business_type, country, description)
       values ($1, 'Mewar Marble Works', 'mewar-marble-works', 'manufacturer', 'IN', 'Draft description')
       returning id, verification_status`,
      [sellerUser],
    );
    const sellerId = created[0]!.id;
    expect(created[0]?.verification_status).toBe("draft");

    // Unverified seller is hidden from public_seller_profiles
    expect(
      await w.env.as(
        anon,
        "select id from public.public_seller_profiles where id = $1",
        [sellerId],
      ),
    ).toEqual([]);

    // 2. Complete required compliance fields
    await w.env.as(
      user(sellerUser),
      `update public.seller_profiles
          set business_email = 'compliance@mewarmarble.in',
              phone = '+919829099999',
              gst_number = '08AABCM1234R1Z5',
              business_address = 'NH-8 Sukher Industrial Area',
              city = 'Udaipur',
              state = 'Rajasthan',
              pincode = '313001'
        where id = $1`,
      [sellerId],
    );

    // 3. Upload private verification document & block cross-seller document reads
    const doc = await w.env.as<{ id: string }>(
      user(sellerUser),
      `insert into public.seller_verification_documents (seller_id, document_type, storage_path)
       values ($1, 'gst_certificate', $2) returning id`,
      [sellerId, `${sellerId}/gst_certificate-1.pdf`],
    );
    expect(
      await w.env.as(
        user(w.sellerUserA),
        "select id from public.seller_verification_documents where id = $1",
        [doc[0]!.id],
      ),
    ).toEqual([]);

    // 4. Submit verification -> Admin rejects with feedback -> Seller re-submits -> Admin approves
    await w.env.as(user(sellerUser), "select public.submit_seller_verification()");
    await w.env.as(
      user(w.adminUser),
      "select public.admin_review_seller($1, 'rejected', 'Upload clearer GST scan')",
      [sellerId],
    );

    const rejectedRow = await w.env.as<{
      verification_status: string;
      verification_reason: string;
    }>(
      user(sellerUser),
      "select verification_status, verification_reason from public.seller_profiles where id = $1",
      [sellerId],
    );
    expect(rejectedRow[0]).toEqual({
      verification_status: "rejected",
      verification_reason: "Upload clearer GST scan",
    });

    await w.env.as(user(sellerUser), "select public.submit_seller_verification()");
    await w.env.as(
      user(w.adminUser),
      "select public.admin_review_seller($1, 'verified', null)",
      [sellerId],
    );

    // Public storefront now visible WITHOUT private GST/email/phone/address columns
    const pubRows = await w.env.as<Record<string, unknown>>(
      anon,
      "select * from public.public_seller_profiles where id = $1",
      [sellerId],
    );
    expect(pubRows).toHaveLength(1);
    expect(pubRows[0]).not.toHaveProperty("gst_number");
    expect(pubRows[0]).not.toHaveProperty("business_email");
    expect(pubRows[0]).not.toHaveProperty("phone");
  });

  it("supports multi-image upload metadata, primary image swap, reordering, archiving, and restoration", async () => {
    const created = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      `insert into public.products
         (seller_id, category_id, name, slug, sku, unit, price_type, price, stock_status, lead_time, moderation_status)
       values ($1, $2, 'Dholpur Beige Honed Slab', 'dholpur-beige-p4', 'DHL-BG-01', 'sq_ft', 'starting', 145, 'in_stock', 7, 'draft')
       returning id`,
      [w.sellerA, w.categoryId],
    );
    const productId = created[0]!.id;

    // Insert 2 product images
    const img1 = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      `insert into public.product_images (product_id, storage_path, is_primary, display_order)
       values ($1, $2, true, 0) returning id`,
      [productId, `${w.sellerA}/${productId}/img-1.jpg`],
    );
    const img2 = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      `insert into public.product_images (product_id, storage_path, is_primary, display_order)
       values ($1, $2, false, 1) returning id`,
      [productId, `${w.sellerA}/${productId}/img-2.webp`],
    );

    // Swap primary image cleanly (clear existing primary -> set new primary)
    await w.env.as(
      user(w.sellerUserA),
      "update public.product_images set is_primary = false where product_id = $1 and is_primary = true",
      [productId],
    );
    await w.env.as(
      user(w.sellerUserA),
      "update public.product_images set is_primary = true, display_order = 0 where id = $1",
      [img2[0]!.id],
    );
    await w.env.as(
      user(w.sellerUserA),
      "update public.product_images set display_order = 1 where id = $1",
      [img1[0]!.id],
    );

    const imgs = await w.env.as<{ id: string; is_primary: boolean; display_order: number }>(
      user(w.sellerUserA),
      "select id, is_primary, display_order from public.product_images where product_id = $1 order by display_order asc",
      [productId],
    );
    expect(imgs[0]?.id).toBe(img2[0]!.id);
    expect(imgs[0]?.is_primary).toBe(true);

    // Submit -> Approve -> Archive -> Verify hidden publicly -> Restore to draft
    await w.env.as(
      user(w.sellerUserA),
      "update public.products set moderation_status = 'pending_review' where id = $1",
      [productId],
    );
    await w.env.as(
      user(w.adminUser),
      "select public.admin_moderate_product($1, 'approved')",
      [productId],
    );
    expect(
      await w.env.as(anon, "select id from public.products where id = $1", [productId]),
    ).toHaveLength(1);

    await w.env.as(
      user(w.sellerUserA),
      "update public.products set moderation_status = 'archived' where id = $1",
      [productId],
    );
    expect(
      await w.env.as(anon, "select id from public.products where id = $1", [productId]),
    ).toEqual([]);

    await w.env.as(
      user(w.sellerUserA),
      "update public.products set moderation_status = 'draft' where id = $1",
      [productId],
    );
  });

  it("executes full enquiry response, quotation creation, sending, revision, and cross-seller isolation", async () => {
    // Ensure w.productA is approved so buyerA can submit an enquiry
    await w.env.admin(
      "update public.products set moderation_status = 'approved', published_at = coalesce(published_at, now()) where id = $1",
      [w.productA],
    );

    const enq = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.enquiries
         (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit, delivery_location)
       values ($1, $2, $3, 'Hotel Lobby Makrana Flooring', 'Need 20mm bookmatched slabs', 2500, 'sq_ft', 'Mumbai')
       returning id`,
      [w.buyerA, w.sellerA, w.productA],
    );
    const enquiryId = enq[0]!.id;

    // Cross-seller isolation: sellerUserB cannot read or transition sellerA's enquiry or quote it
    expect(
      await w.env.as(
        user(w.sellerUserB),
        "select id from public.enquiries where id = $1",
        [enquiryId],
      ),
    ).toEqual([]);
    expect(
      await failure(
        w.env.as(
          user(w.sellerUserB),
          "select public.transition_enquiry_status($1, 'viewed', null)",
          [enquiryId],
        ),
      ),
    ).toMatch(/not found/);

    // SellerA marks viewed, then responds
    await w.env.as(
      user(w.sellerUserA),
      "select public.transition_enquiry_status($1, 'viewed', 'Opened in seller inbox')",
      [enquiryId],
    );
    await w.env.as(
      user(w.sellerUserA),
      "select public.transition_enquiry_status($1, 'responding', 'Block lot #14 reserved')",
      [enquiryId],
    );

    // SellerA creates draft quotation, inserts line item, and sends quotation
    const quote = await w.env.as<{ id: string; quote_number: string }>(
      user(w.sellerUserA),
      `insert into public.quotations
         (enquiry_id, seller_id, buyer_id, subtotal, discount_amount, tax_amount, shipping_charges, total_amount, currency, terms)
       values ($1, $2, $3, 750000, 25000, 130500, 20000, 875500, 'INR', '50% advance')
       returning id, quote_number`,
      [enquiryId, w.sellerA, w.buyerA],
    );
    const quoteId = quote[0]!.id;

    await w.env.as(
      user(w.sellerUserA),
      `insert into public.quotation_items
         (quotation_id, product_id, description, quantity, unit, unit_price, total_price)
       values ($1, $2, 'Makrana White 20mm Bookmatched Slabs', 2500, 'sq_ft', 300, 750000)`,
      [quoteId, w.productA],
    );

    await w.env.as(
      user(w.sellerUserA),
      "update public.quotations set status = 'sent' where id = $1",
      [quoteId],
    );

    // Parent enquiry automatically transitioned to 'quoted' and history recorded
    const updatedEnq = await w.env.as<{ status: string }>(
      user(w.sellerUserA),
      "select status from public.enquiries where id = $1",
      [enquiryId],
    );
    expect(updatedEnq[0]?.status).toBe("quoted");

    const history = await w.env.as<{ new_status: string }>(
      user(w.sellerUserA),
      "select new_status from public.enquiry_status_history where enquiry_id = $1 order by created_at asc",
      [enquiryId],
    );
    expect(history.map((h) => h.new_status)).toEqual([
      "submitted",
      "viewed",
      "responding",
      "quoted",
    ]);

    // SellerA marks sent quote as 'revised' to issue an updated revision while preserving history
    await w.env.as(
      user(w.sellerUserA),
      "update public.quotations set status = 'revised' where id = $1",
      [quoteId],
    );
    const revCheck = await w.env.as<{ status: string }>(
      user(w.sellerUserA),
      "select status from public.quotations where id = $1",
      [quoteId],
    );
    expect(revCheck[0]?.status).toBe("revised");
  });
});

