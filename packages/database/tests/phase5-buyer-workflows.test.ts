import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

describe("Phase 5 Buyer Portal & RFQ End-to-End Database & RLS Workflows", () => {
  it("allows buyers to read and update permitted profile fields while blocking privileged columns and cross-user tampering", async () => {
    // Buyer A updates permitted contact & location fields (including encoded B2B metadata in address)
    await w.env.as(
      user(w.buyerA),
      `update public.profiles
          set full_name = 'Vikramaditya Mehta',
              phone = '+919820144556',
              country = 'IN',
              state = 'Maharashtra',
              city = 'Mumbai',
              address = E'Nariman Point\\n\\n--- Buyer Profile Metadata ---\\nCompany: Mehta Projects\\nBuyer Type: architect'
        where id = $1`,
      [w.buyerA],
    );

    const ownProfile = await w.env.as<{
      full_name: string;
      city: string;
      account_status: string;
    }>(
      user(w.buyerA),
      "select full_name, city, account_status from public.profiles where id = $1",
      [w.buyerA],
    );
    expect(ownProfile[0]).toEqual({
      full_name: "Vikramaditya Mehta",
      city: "Mumbai",
      account_status: "active",
    });

    // Buyer A cannot read Buyer B's private profile
    expect(
      await w.env.as(
        user(w.buyerA),
        "select id from public.profiles where id = $1",
        [w.buyerB],
      ),
    ).toEqual([]);

    // Buyer A cannot modify privileged column `account_status` (column-level UPDATE grant)
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "update public.profiles set account_status = 'suspended' where id = $1",
          [w.buyerA],
        ),
      ),
    ).toMatch(/permission denied/);

    // Invalid 3-letter country code rejected by check constraint
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "update public.profiles set country = 'IND' where id = $1",
          [w.buyerA],
        ),
      ),
    ).toMatch(/23514|check/);

    // Buyer A cannot self-escalate role in user_roles
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "insert into public.user_roles (user_id, role) values ($1, 'admin')",
          [w.buyerA],
        ),
      ),
    ).toMatch(/permission denied/);
  });

  it("supports product-specific and general RFQs, enforces client_request_id idempotency, blocks cross-buyer reads, and verifies attachment access control", async () => {
    const reqIdProduct = randomUUID();
    const reqIdGeneral = randomUUID();

    // 1. Product-Specific RFQ (product_id = w.productA, seller_id = w.sellerA)
    const prodRfq = await w.env.as<{ id: string; status: string; product_id: string | null }>(
      user(w.buyerA),
      `insert into public.enquiries
         (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit, expected_budget, currency, delivery_location, required_delivery_date, client_request_id)
       values ($1, $2, $3, 'Makrana White Hotel Lobby RFQ', 'Bookmatched 20mm polished slabs', 3200, 'sq_ft', 960000, 'INR', 'Mumbai, Maharashtra, IN', '2026-12-20', $4)
       returning id, status, product_id`,
      [w.buyerA, w.sellerA, w.productA, reqIdProduct],
    );
    expect(prodRfq[0]?.status).toBe("submitted");
    expect(prodRfq[0]?.product_id).toBe(w.productA);
    const prodEnquiryId = prodRfq[0]!.id;

    // 2. Duplicate retry with identical (buyer_id, client_request_id) is blocked by unique index
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          `insert into public.enquiries
             (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit, client_request_id)
           values ($1, $2, $3, 'Duplicate Retry', 'Retry payload', 3200, 'sq_ft', $4)`,
          [w.buyerA, w.sellerA, w.productA, reqIdProduct],
        ),
      ),
    ).toMatch(/23505|duplicate key/);

    // 3. General Custom Stone RFQ (product_id IS NULL, directed to verified sellerB)
    const genRfq = await w.env.as<{ id: string; product_id: string | null }>(
      user(w.buyerA),
      `insert into public.enquiries
         (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit, currency, delivery_location, client_request_id)
       values ($1, $2, null, 'Custom Calibrated Kota Courtyard Paving', 'Honed 25mm calibrated pavers', 5000, 'sq_ft', 'INR', 'Pune, Maharashtra, IN', $3)
       returning id, product_id`,
      [w.buyerA, w.sellerB, reqIdGeneral],
    );
    expect(genRfq[0]?.product_id).toBeNull();
    const generalEnquiryId = genRfq[0]!.id;

    // 4. Reject mismatched (product_id, seller_id) spoofing attempt
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          `insert into public.enquiries
             (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
           values ($1, $2, $3, 'Mismatched Seller Spoof', 'Trying to send sellerA product to sellerB', 500, 'sq_ft')`,
          [w.buyerA, w.sellerB, w.productA],
        ),
      ),
    ).toMatch(/row-level security/);

    // 5. Cross-buyer & anonymous isolation
    expect(
      await w.env.as(
        user(w.buyerB),
        "select id from public.enquiries where id in ($1, $2)",
        [prodEnquiryId, generalEnquiryId],
      ),
    ).toEqual([]);
    expect(
      await failure(
        w.env.as(anon, "select id from public.enquiries where id = $1", [prodEnquiryId]),
      ),
    ).toMatch(/permission denied/);

    // 6. Private enquiry-attachments RLS gate (`public.can_access_enquiry`)
    const accessBuyerA = await w.env.as<{ ok: boolean }>(
      user(w.buyerA),
      "select public.can_access_enquiry($1) as ok",
      [prodEnquiryId],
    );
    const accessSellerA = await w.env.as<{ ok: boolean }>(
      user(w.sellerUserA),
      "select public.can_access_enquiry($1) as ok",
      [prodEnquiryId],
    );
    const accessBuyerB = await w.env.as<{ ok: boolean }>(
      user(w.buyerB),
      "select public.can_access_enquiry($1) as ok",
      [prodEnquiryId],
    );
    const accessSellerB = await w.env.as<{ ok: boolean }>(
      user(w.sellerUserB),
      "select public.can_access_enquiry($1) as ok",
      [prodEnquiryId],
    );
    expect(accessBuyerA[0]?.ok).toBe(true);
    expect(accessSellerA[0]?.ok).toBe(true);
    expect(accessBuyerB[0]?.ok).toBe(false);
    expect(accessSellerB[0]?.ok).toBe(false);

    // 7. Buyer cannot perform seller-only enquiry transition ('responding'), but can cancel own enquiry
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "select public.transition_enquiry_status($1, 'responding', null)",
          [generalEnquiryId],
        ),
      ),
    ).toMatch(/is not allowed/);

    await w.env.as(
      user(w.buyerA),
      "select public.transition_enquiry_status($1, 'cancelled', 'Requirement postponed')",
      [generalEnquiryId],
    );
    const cancelledRow = await w.env.as<{ status: string }>(
      user(w.buyerA),
      "select status from public.enquiries where id = $1",
      [generalEnquiryId],
    );
    expect(cancelledRow[0]?.status).toBe("cancelled");
  });

  it("enforces quotation draft hiding, buyer view/accept/reject transitions, parent enquiry sync, expiry protection, and price immutability", async () => {
    // Create two fresh enquiries for Buyer A -> Seller A
    const [enqAccept] = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.enquiries
         (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
       values ($1, $2, $3, 'Villa Staircase Makrana Slabs', '20mm polished', 1000, 'sq_ft')
       returning id`,
      [w.buyerA, w.sellerA, w.productA],
    );
    const [enqReject] = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.enquiries
         (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
       values ($1, $2, $3, 'Commercial Atrium Cladding', '18mm honed', 1500, 'sq_ft')
       returning id`,
      [w.buyerA, w.sellerA, w.productA],
    );

    // Seller A creates a DRAFT quotation on enqAccept
    const [draftQuote] = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      `insert into public.quotations
         (enquiry_id, seller_id, buyer_id, subtotal, discount_amount, tax_amount, shipping_charges, total_amount, currency, valid_until, terms)
       values ($1, $2, $3, 300000, 0, 54000, 10000, 364000, 'INR', now() + interval '15 days', '50% advance')
       returning id`,
      [enqAccept!.id, w.sellerA, w.buyerA],
    );
    await w.env.as(
      user(w.sellerUserA),
      `insert into public.quotation_items
         (quotation_id, product_id, description, quantity, unit, unit_price, total_price)
       values ($1, $2, 'Makrana White 20mm Slabs', 1000, 'sq_ft', 300, 300000)`,
      [draftQuote!.id, w.productA],
    );

    // Buyer A CANNOT read draft quotation before seller sends it
    expect(
      await w.env.as(
        user(w.buyerA),
        "select id from public.quotations where id = $1",
        [draftQuote!.id],
      ),
    ).toEqual([]);

    // Seller A sends quotation
    await w.env.as(
      user(w.sellerUserA),
      "update public.quotations set status = 'sent' where id = $1",
      [draftQuote!.id],
    );

    // Buyer A can now read quotation + line items; Buyer B cannot
    expect(
      await w.env.as(
        user(w.buyerA),
        "select id from public.quotations where id = $1",
        [draftQuote!.id],
      ),
    ).toHaveLength(1);
    expect(
      await w.env.as(
        user(w.buyerA),
        "select id from public.quotation_items where quotation_id = $1",
        [draftQuote!.id],
      ),
    ).toHaveLength(1);
    expect(
      await w.env.as(
        user(w.buyerB),
        "select id from public.quotations where id = $1",
        [draftQuote!.id],
      ),
    ).toEqual([]);

    // Buyer A CANNOT tamper with total_amount or terms
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "update public.quotations set total_amount = 100 where id = $1",
          [draftQuote!.id],
        ),
      ),
    ).toMatch(/buyers cannot edit quotation terms|permission denied/);

    // Buyer A marks quotation viewed -> accepted
    await w.env.as(
      user(w.buyerA),
      "update public.quotations set status = 'viewed' where id = $1",
      [draftQuote!.id],
    );
    await w.env.as(
      user(w.buyerA),
      "update public.quotations set status = 'accepted' where id = $1",
      [draftQuote!.id],
    );

    // Parent enquiry automatically transitioned to 'accepted' by quotations_after_change trigger
    const acceptedEnq = await w.env.as<{ status: string }>(
      user(w.buyerA),
      "select status from public.enquiries where id = $1",
      [enqAccept!.id],
    );
    expect(acceptedEnq[0]?.status).toBe("accepted");

    // Buyer A closes the concluded enquiry while preserving full quotation history
    await w.env.as(
      user(w.buyerA),
      "select public.transition_enquiry_status($1, 'closed', 'PO issued offline')",
      [enqAccept!.id],
    );
    const closedEnq = await w.env.as<{ status: string }>(
      user(w.buyerA),
      "select status from public.enquiries where id = $1",
      [enqAccept!.id],
    );
    expect(closedEnq[0]?.status).toBe("closed");

    // Second workflow: Rejection & Expired quotation guard
    const [quoteToReject] = await w.env.as<{ id: string }>(
      user(w.sellerUserA),
      `insert into public.quotations
         (enquiry_id, seller_id, buyer_id, subtotal, total_amount, currency, valid_until)
       values ($1, $2, $3, 450000, 450000, 'INR', now() + interval '10 days')
       returning id`,
      [enqReject!.id, w.sellerA, w.buyerA],
    );
    await w.env.as(
      user(w.sellerUserA),
      `insert into public.quotation_items
         (quotation_id, product_id, description, quantity, unit, unit_price, total_price)
       values ($1, $2, 'Atrium Cladding 18mm', 1500, 'sq_ft', 300, 450000)`,
      [quoteToReject!.id, w.productA],
    );
    await w.env.as(
      user(w.sellerUserA),
      "update public.quotations set status = 'sent' where id = $1",
      [quoteToReject!.id],
    );

    // Simulate expired valid_until and verify accepting raises 22023 ('quotation has expired')
    await w.env.admin(
      "update public.quotations set valid_until = now() - interval '2 days' where id = $1",
      [quoteToReject!.id],
    );
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "update public.quotations set status = 'accepted' where id = $1",
          [quoteToReject!.id],
        ),
      ),
    ).toMatch(/22023|expired/);

    // Rejecting an expired or overpriced quotation succeeds and moves parent enquiry to 'responding'
    await w.env.as(
      user(w.buyerA),
      "update public.quotations set status = 'rejected' where id = $1",
      [quoteToReject!.id],
    );
    const respondingEnq = await w.env.as<{ status: string }>(
      user(w.buyerA),
      "select status from public.enquiries where id = $1",
      [enqReject!.id],
    );
    expect(respondingEnq[0]?.status).toBe("responding");
  });

  it("enforces product_favourites uniqueness, published-product check, and cross-buyer isolation", async () => {
    // Buyer A saves approved productA
    const fav = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.product_favourites (buyer_id, product_id)
       values ($1, $2) returning id`,
      [w.buyerA, w.productA],
    );
    expect(fav).toHaveLength(1);

    // Duplicate (buyer_id, product_id) blocked
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          `insert into public.product_favourites (buyer_id, product_id)
           values ($1, $2)`,
          [w.buyerA, w.productA],
        ),
      ),
    ).toMatch(/23505|duplicate key/);

    // Saving unpublished draft product blocked by RLS (`is_product_public(product_id)`)
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          `insert into public.product_favourites (buyer_id, product_id)
           values ($1, $2)`,
          [w.buyerA, w.productADraft],
        ),
      ),
    ).toMatch(/row-level security/);

    // Buyer B cannot see or delete Buyer A's favourite
    expect(
      await w.env.as(
        user(w.buyerB),
        "select id from public.product_favourites where id = $1",
        [fav[0]!.id],
      ),
    ).toEqual([]);
    await w.env.as(
      user(w.buyerB),
      "delete from public.product_favourites where id = $1",
      [fav[0]!.id],
    );
    expect(
      await w.env.as(
        user(w.buyerA),
        "select id from public.product_favourites where id = $1",
        [fav[0]!.id],
      ),
    ).toHaveLength(1);

    // Buyer A removes own favourite cleanly
    await w.env.as(
      user(w.buyerA),
      "delete from public.product_favourites where id = $1",
      [fav[0]!.id],
    );
    expect(
      await w.env.as(
        user(w.buyerA),
        "select id from public.product_favourites where id = $1",
        [fav[0]!.id],
      ),
    ).toEqual([]);
  });

  it("enforces single default buyer address invariants, NULL safety, caller-ownership, and atomic rollback on errors via set_default_buyer_address()", async () => {
    // 1. Valid own address: Buyer A inserts address 1 and sets it default
    const addr1 = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.buyer_addresses
         (buyer_id, address_type, contact_name, phone, address_line1, city, state, pincode, country, is_default)
       values ($1, 'billing', 'Vikram Mehta', '+919820144556', 'Plot 101, RIICO Industrial Area', 'Kishangarh', 'Rajasthan', '305801', 'IN', false)
       returning id`,
      [w.buyerA],
    );
    expect(addr1).toHaveLength(1);
    const addr1Id = addr1[0]!.id;

    // Buyer A invokes set_default_buyer_address(addr1Id)
    const setRes1 = await w.env.as<{ set_default_buyer_address: string }>(
      user(w.buyerA),
      "select public.set_default_buyer_address($1::uuid) as set_default_buyer_address",
      [addr1Id],
    );
    expect(setRes1[0]?.set_default_buyer_address).toBe(addr1Id);

    const check1 = await w.env.as<{ is_default: boolean }>(
      user(w.buyerA),
      "select is_default from public.buyer_addresses where id = $1",
      [addr1Id],
    );
    expect(check1[0]?.is_default).toBe(true);

    // 2. Foreign buyer address: Buyer B creates address 2
    const addr2 = await w.env.as<{ id: string }>(
      user(w.buyerB),
      `insert into public.buyer_addresses
         (buyer_id, address_type, contact_name, phone, address_line1, city, state, pincode, country, is_default)
       values ($1, 'shipping', 'Karan Johar', '+919811122233', 'Warehouse 5, Kalamboli', 'Navi Mumbai', 'Maharashtra', '410218', 'IN', false)
       returning id`,
      [w.buyerB],
    );
    const addr2Id = addr2[0]!.id;

    // Buyer A attempts to set Buyer B's address as default -> rejected with 42501
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "select public.set_default_buyer_address($1::uuid)",
          [addr2Id],
        ),
      ),
    ).toMatch(/42501|Unauthorized to modify this address/);

    // 3. Nonexistent UUID: Buyer A passes random UUID -> rejected with P0002
    const nonExistentId = randomUUID();
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "select public.set_default_buyer_address($1::uuid)",
          [nonExistentId],
        ),
      ),
    ).toMatch(/P0002|Address not found/);

    // 4. NULL address ID: Buyer A passes NULL -> rejected explicitly with 22004
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          "select public.set_default_buyer_address(null::uuid)",
        ),
      ),
    ).toMatch(/22004|Address identifier is required/);

    // 5. Inactive buyer: Buyer C (suspended) cannot invoke operation
    const buyerC = await w.env.signup("buyer-inactive@test.dev", "buyer");
    await w.env.admin("update public.profiles set account_status = 'suspended' where id = $1", [buyerC]);
    expect(
      await failure(
        w.env.as(
          user(buyerC),
          "select public.set_default_buyer_address($1::uuid)",
          [addr1Id],
        ),
      ),
    ).toMatch(/42501|Account is inactive/);

    // 6. Existing default remains unchanged when requested ID is invalid
    const checkDefaultIntact = await w.env.as<{ is_default: boolean }>(
      user(w.buyerA),
      "select is_default from public.buyer_addresses where id = $1",
      [addr1Id],
    );
    expect(checkDefaultIntact[0]?.is_default).toBe(true);

    // 7. Successful change leaves exactly one default address: Buyer A inserts address 3
    const addr3 = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.buyer_addresses
         (buyer_id, address_type, contact_name, phone, address_line1, city, state, pincode, country, is_default)
       values ($1, 'billing', 'Vikram Mehta Office', '+919820144556', 'Nariman Point Tower', 'Mumbai', 'Maharashtra', '400021', 'IN', false)
       returning id`,
      [w.buyerA],
    );
    const addr3Id = addr3[0]!.id;

    // Buyer A promotes addr3 to default
    await w.env.as(
      user(w.buyerA),
      "select public.set_default_buyer_address($1::uuid)",
      [addr3Id],
    );

    const buyerADefaults = await w.env.as<{ id: string; is_default: boolean }>(
      user(w.buyerA),
      "select id, is_default from public.buyer_addresses where buyer_id = $1 and is_default = true",
      [w.buyerA],
    );
    expect(buyerADefaults).toHaveLength(1);
    expect(buyerADefaults[0]?.id).toBe(addr3Id);

    const oldAddr1 = await w.env.as<{ is_default: boolean }>(
      user(w.buyerA),
      "select is_default from public.buyer_addresses where id = $1",
      [addr1Id],
    );
    expect(oldAddr1[0]?.is_default).toBe(false);

    // 8. Database unique index still enforces the invariant (direct insert of 2nd default fails with 23505)
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          `insert into public.buyer_addresses
             (buyer_id, address_type, contact_name, phone, address_line1, city, state, pincode, country, is_default)
           values ($1, 'shipping', 'Duplicate Default', '+919820144556', 'Another Address', 'Mumbai', 'Maharashtra', '400021', 'IN', true)`,
          [w.buyerA],
        ),
      ),
    ).toMatch(/23505|buyer_addresses_single_default_idx/);
  });
});
