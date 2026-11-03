import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

// ---------------------------------------------------------------------------
// Helper: create a simple enquiry as a buyer towards sellerA/productA.
// Runs as service-role (admin) to bypass RLS — use for test setup only.
// ---------------------------------------------------------------------------
const createEnquiryAdmin = async (buyerId: string, sellerId: string, productId: string, reqId?: string) =>
  (
    await w.env.admin<{ id: string }>(
      `insert into public.enquiries
         (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit, currency, client_request_id)
       values ($1, $2, $3, 'Bulk order enquiry', 'Please provide pricing for a large order.', 100, 'sq_ft', 'INR', $4)
       returning id`,
      [buyerId, sellerId, productId, reqId ?? null],
    )
  )[0]!.id;

// ---------------------------------------------------------------------------
// Helper: create a quotation draft (service role).
// ---------------------------------------------------------------------------
const createQuotationAdmin = async (enquiryId: string, sellerId: string, buyerId: string) =>
  (
    await w.env.admin<{ id: string }>(
      `insert into public.quotations
         (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency)
       values ($1, $2, $3, 1000.00, 180.00, 100.00, 0.00, 1280.00, 'INR')
       returning id`,
      [enquiryId, sellerId, buyerId],
    )
  )[0]!.id;

// ---------------------------------------------------------------------------
// Helper: add a quotation item (service role).
// ---------------------------------------------------------------------------
const addItemAdmin = async (quotationId: string, productId: string | null) =>
  w.env.admin(
    `insert into public.quotation_items
       (quotation_id, product_id, description, quantity, unit, unit_price, total_price)
     values ($1, $2, 'White Marble Slab', 100, 'sq_ft', 10.00, 1000.00)`,
    [quotationId, productId],
  );

// ===========================================================================
// RLS: enquiries
// ===========================================================================
describe("RLS: enquiries", () => {
  it("lets a buyer insert an enquiry for a verified seller's public product", async () => {
    const rows = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.enquiries
         (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit, currency)
       values ($1, $2, $3, 'Test Enquiry', 'I need pricing.', 50, 'sq_ft', 'INR')
       returning id`,
      [w.buyerA, w.sellerA, w.productA],
    );
    expect(rows).toHaveLength(1);
  });

  it("blocks a buyer from enquiring their own seller profile side", async () => {
    // sellerUserA IS the seller; enquiring own sellerA must be blocked
    expect(
      await failure(
        w.env.as(
          user(w.sellerUserA),
          `insert into public.enquiries
             (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
           values ($1, $2, $3, 'Self Enquiry', 'Should fail.', 1, 'piece')`,
          [w.sellerUserA, w.sellerA, w.productA],
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it("blocks enquiring a product that belongs to a different seller", async () => {
    // productA belongs to sellerA, not sellerB
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          `insert into public.enquiries
             (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
           values ($1, $2, $3, 'Wrong seller', 'Should fail.', 1, 'sq_ft')`,
          [w.buyerA, w.sellerB, w.productA],
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it("enforces the idempotency key: duplicate (buyer_id, client_request_id) is rejected", async () => {
    const reqId = "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb";
    await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA, reqId);
    expect(await failure(createEnquiryAdmin(w.buyerA, w.sellerA, w.productA, reqId))).toMatch(/unique|duplicate/);
  });

  it("buyer sees only their own enquiries; other buyers see nothing of theirs", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const buyerARows = await w.env.as<{ id: string }>(user(w.buyerA), "select id from public.enquiries where id = $1", [eq]);
    expect(buyerARows).toHaveLength(1);
    const buyerBRows = await w.env.as<{ id: string }>(user(w.buyerB), "select id from public.enquiries where id = $1", [eq]);
    expect(buyerBRows).toEqual([]);
  });

  it("seller sees only enquiries directed at their own seller profile", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    // sellerUserA owns sellerA — must see the enquiry
    const sellerARows = await w.env.as<{ id: string }>(user(w.sellerUserA), "select id from public.enquiries where id = $1", [eq]);
    expect(sellerARows).toHaveLength(1);
    // sellerUserB owns sellerB — must not see sellerA's enquiry
    const sellerBRows = await w.env.as<{ id: string }>(user(w.sellerUserB), "select id from public.enquiries where id = $1", [eq]);
    expect(sellerBRows).toEqual([]);
  });

  it("admin sees all enquiries", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const rows = await w.env.as<{ id: string }>(user(w.adminUser), "select id from public.enquiries where id = $1", [eq]);
    expect(rows).toHaveLength(1);
  });

  it("anonymous users cannot access enquiries", async () => {
    expect(await failure(w.env.as(anon, "select * from public.enquiries"))).toMatch(/permission denied/);
  });

  it("clients cannot UPDATE enquiries directly; only via transition_enquiry_status()", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    // No UPDATE grant exists on enquiries, so this should fail with permission denied
    expect(
      await failure(w.env.as(user(w.sellerUserA), "update public.enquiries set status = 'viewed' where id = $1", [eq])),
    ).toMatch(/permission denied/);
  });
});

// ===========================================================================
// RLS: enquiry_status_history
// ===========================================================================
describe("RLS: enquiry_status_history", () => {
  it("records a history entry on creation and a participant can read it", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const hist = await w.env.as<{ new_status: string }>(
      user(w.buyerA),
      "select new_status from public.enquiry_status_history where enquiry_id = $1",
      [eq],
    );
    expect(hist[0]?.new_status).toBe("submitted");
  });

  it("history rows are immutable: UPDATE and DELETE are forbidden", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const hist = await w.env.admin<{ id: string }>(
      "select id from public.enquiry_status_history where enquiry_id = $1 limit 1",
      [eq],
    );
    expect(
      await failure(w.env.admin("update public.enquiry_status_history set notes = 'tampered' where id = $1", [hist[0]!.id])),
    ).toMatch(/append-only/);
    expect(
      await failure(w.env.admin("delete from public.enquiry_status_history where id = $1", [hist[0]!.id])),
    ).toMatch(/append-only/);
  });

  it("non-participants cannot read the history", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const rows = await w.env.as<{ id: string }>(
      user(w.buyerB),
      "select id from public.enquiry_status_history where enquiry_id = $1",
      [eq],
    );
    expect(rows).toEqual([]);
  });
});

// ===========================================================================
// Enquiry status transitions
// ===========================================================================
describe("Enquiry status transitions via transition_enquiry_status()", () => {
  it("seller can mark submitted as viewed", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    await w.env.as(user(w.sellerUserA), "select public.transition_enquiry_status($1, 'viewed')", [eq]);
    const rows = await w.env.admin<{ status: string }>("select status from public.enquiries where id = $1", [eq]);
    expect(rows[0]?.status).toBe("viewed");
  });

  it("seller can reject an enquiry", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    await w.env.as(user(w.sellerUserA), "select public.transition_enquiry_status($1, 'rejected')", [eq]);
    const rows = await w.env.admin<{ status: string }>("select status from public.enquiries where id = $1", [eq]);
    expect(rows[0]?.status).toBe("rejected");
  });

  it("buyer can cancel a submitted enquiry", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    await w.env.as(user(w.buyerA), "select public.transition_enquiry_status($1, 'cancelled')", [eq]);
    const rows = await w.env.admin<{ status: string }>("select status from public.enquiries where id = $1", [eq]);
    expect(rows[0]?.status).toBe("cancelled");
  });

  it("buyer cannot perform a seller-only transition", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    expect(
      await failure(w.env.as(user(w.buyerA), "select public.transition_enquiry_status($1, 'viewed')", [eq])),
    ).toMatch(/not allowed|42501/);
  });

  it("non-participant cannot call transition at all", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    expect(
      await failure(w.env.as(user(w.buyerB), "select public.transition_enquiry_status($1, 'cancelled')", [eq])),
    ).toMatch(/not found|P0002/);
  });

  it("illegal transition from current status is rejected", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    // 'submitted' → 'accepted' is not a valid seller or buyer move
    expect(
      await failure(w.env.as(user(w.sellerUserA), "select public.transition_enquiry_status($1, 'accepted')", [eq])),
    ).toMatch(/not allowed|42501/);
  });
});

// ===========================================================================
// RLS: quotations
// ===========================================================================
describe("RLS: quotations", () => {
  it("seller can create a draft quotation for an active enquiry", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const rows = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      `insert into public.quotations
         (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency)
       values ($1, $2, $3, 500.00, 90.00, 0.00, 0.00, 590.00, 'INR')
       returning id`,
      [eq, w.sellerA, w.buyerA],
    );
    expect(rows).toHaveLength(1);
  });

  it("blocks seller from inserting a non-draft quotation directly", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    // The INSERT grant omits the 'status' column, so supplying status = 'sent'
    // is rejected at the column-privilege level before the trigger fires.
    expect(
      await failure(
        w.env.as(
          user(w.sellerUserA),
          `insert into public.quotations
             (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency, status)
           values ($1, $2, $3, 500.00, 90.00, 0.00, 0.00, 590.00, 'INR', 'sent')`,
          [eq, w.sellerA, w.buyerA],
        ),
      ),
    ).toMatch(/permission denied/);
  });

  it("blocks a wrong-seller from inserting a quotation", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    // sellerUserB tries to quote for sellerA's enquiry
    expect(
      await failure(
        w.env.as(
          user(w.sellerUserB),
          `insert into public.quotations
             (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency)
           values ($1, $2, $3, 500.00, 0.00, 0.00, 0.00, 500.00, 'INR')`,
          [eq, w.sellerA, w.buyerA],
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it("total_formula check constraint is enforced", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    expect(
      await failure(
        w.env.admin(
          `insert into public.quotations
             (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency)
           values ($1, $2, $3, 1000.00, 180.00, 100.00, 0.00, 999.00, 'INR')`,
          [eq, w.sellerA, w.buyerA],
        ),
      ),
    ).toMatch(/quotations_total_formula|check constraint|check_/i);
  });

  it("buyer cannot see draft quotations", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    const rows = await w.env.as<{ id: string }>(user(w.buyerA), "select id from public.quotations where id = $1", [qid]);
    expect(rows).toEqual([]);
  });

  it("buyer can see sent quotations", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    await addItemAdmin(qid, w.productA);
    // Seller sends the quotation
    await w.env.as(user(w.sellerUserA), "update public.quotations set status = 'sent' where id = $1", [qid]);
    const rows = await w.env.as<{ id: string }>(user(w.buyerA), "select id from public.quotations where id = $1", [qid]);
    expect(rows).toHaveLength(1);
  });

  it("other buyers cannot see another buyer's quotations", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    await addItemAdmin(qid, w.productA);
    await w.env.as(user(w.sellerUserA), "update public.quotations set status = 'sent' where id = $1", [qid]);
    const rows = await w.env.as<{ id: string }>(user(w.buyerB), "select id from public.quotations where id = $1", [qid]);
    expect(rows).toEqual([]);
  });

  it("seller cannot send a draft quotation with no items", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    expect(
      await failure(w.env.as(user(w.sellerUserA), "update public.quotations set status = 'sent' where id = $1", [qid])),
    ).toMatch(/items must exist/);
  });

  it("seller can send after items are added; enquiry status becomes 'quoted'", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    await addItemAdmin(qid, w.productA);
    await w.env.as(user(w.sellerUserA), "update public.quotations set status = 'sent' where id = $1", [qid]);
    const eq2 = await w.env.admin<{ status: string }>("select status from public.enquiries where id = $1", [eq]);
    expect(eq2[0]?.status).toBe("quoted");
  });

  it("buyer can accept a sent quotation; enquiry status becomes 'accepted'", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    await addItemAdmin(qid, w.productA);
    await w.env.as(user(w.sellerUserA), "update public.quotations set status = 'sent' where id = $1", [qid]);
    await w.env.as(user(w.buyerA), "update public.quotations set status = 'viewed' where id = $1", [qid]);
    await w.env.as(user(w.buyerA), "update public.quotations set status = 'accepted' where id = $1", [qid]);
    const eq2 = await w.env.admin<{ status: string }>("select status from public.enquiries where id = $1", [eq]);
    expect(eq2[0]?.status).toBe("accepted");
  });

  it("buyer cannot edit quotation terms", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    await addItemAdmin(qid, w.productA);
    await w.env.as(user(w.sellerUserA), "update public.quotations set status = 'sent' where id = $1", [qid]);
    expect(
      await failure(w.env.as(user(w.buyerA), "update public.quotations set total_amount = 1 where id = $1", [qid])),
    ).toMatch(/buyers cannot edit|42501/);
  });

  it("admin can view all quotations", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    const rows = await w.env.as<{ id: string }>(user(w.adminUser), "select id from public.quotations where id = $1", [qid]);
    expect(rows).toHaveLength(1);
  });

  it("anonymous users cannot access quotations", async () => {
    expect(await failure(w.env.as(anon, "select * from public.quotations"))).toMatch(/permission denied/);
  });
});

// ===========================================================================
// RLS: quotation_items
// ===========================================================================
describe("RLS: quotation_items", () => {
  it("seller can insert/update/delete items on a draft quotation; cannot on a sent one", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    // Insert
    const rows = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      `insert into public.quotation_items (quotation_id, description, quantity, unit, unit_price, total_price)
       values ($1, 'Polished Marble', 100, 'sq_ft', 10.00, 1000.00)
       returning id`,
      [qid],
    );
    expect(rows).toHaveLength(1);
    // Update
    await w.env.as(user(w.sellerUserA), "update public.quotation_items set unit_price = 11.00, total_price = 1100.00 where id = $1", [rows[0]!.id]);
    // Delete
    await w.env.as(user(w.sellerUserA), "delete from public.quotation_items where id = $1", [rows[0]!.id]);

    // Re-add item (subtotal 1000, item total 1000) and send quotation
    await addItemAdmin(qid, w.productA);
    await w.env.as(user(w.sellerUserA), "update public.quotations set status = 'sent' where id = $1", [qid]);

    // Get the item id after sending
    const item2 = await w.env.admin<{ id: string }>(
      "select id from public.quotation_items where quotation_id = $1 limit 1",
      [qid],
    );
    expect(item2).toHaveLength(1);

    // INSERT on sent quotation: quotation_items_insert policy uses is_draft_quotation_owner → false → RLS denied
    expect(
      await failure(
        w.env.as(
          user(w.sellerUserA),
          "insert into public.quotation_items (quotation_id, description, quantity, unit, unit_price, total_price) values ($1, 'Extra', 1, 'piece', 5.00, 5.00)",
          [qid],
        ),
      ),
    ).toMatch(/row-level security/);

    // DELETE on sent quotation: RLS silently filters (0 rows deleted). Confirm item still exists.
    await w.env.as(user(w.sellerUserA), "delete from public.quotation_items where id = $1", [item2[0]!.id]);
    const stillThere = await w.env.admin<{ id: string }>(
      "select id from public.quotation_items where id = $1",
      [item2[0]!.id],
    );
    expect(stillThere).toHaveLength(1); // RLS silently blocked deletion — item is still there
  });

  it("buyer cannot modify quotation items", async () => {
    const eq = await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    const qid = await createQuotationAdmin(eq, w.sellerA, w.buyerA);
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "insert into public.quotation_items (quotation_id, description, quantity, unit, unit_price, total_price) values ($1, 'Hack', 1, 'piece', 1.00, 1.00)",
          [qid],
        ),
      ),
    ).toMatch(/row-level security/);
  });
});

// ===========================================================================
// seller_can_see_buyer: profile visibility via enquiry relationship
// ===========================================================================
describe("seller_can_see_buyer: buyer profile visibility", () => {
  it("seller can see profile of buyers who enquired; others are hidden", async () => {
    await createEnquiryAdmin(w.buyerA, w.sellerA, w.productA);
    // sellerUserA should see buyerA's profile
    const visible = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      "select id from public.profiles where id = $1",
      [w.buyerA],
    );
    expect(visible).toHaveLength(1);
    // sellerUserB has no enquiries from buyerA → cannot see buyerA
    const hidden = await w.env.as<{ id: string }>(
      user(w.sellerUserB),
      "select id from public.profiles where id = $1",
      [w.buyerA],
    );
    expect(hidden).toEqual([]);
  });
});
