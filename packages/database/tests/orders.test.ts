import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

const validDomesticAddress = {
  contactName: "Rajesh Sharma",
  phone: "+91 98765 43210",
  companyName: "Sharma Stone Mart",
  gstin: "08ABCDE1234F1Z5",
  addressLine1: "Plot 14, RIICO Industrial Area",
  addressLine2: "Phase 2",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  country: "IN",
};

const validShippingAddress = {
  contactName: "Suresh Patel",
  phone: "+91 98111 22233",
  addressLine1: "Warehouse 4, Mundra Port Road",
  city: "Mundra",
  state: "Gujarat",
  pincode: "370421",
  country: "IN",
};

// Helper to create an active enquiry + quotation + item
async function setupTestQuotation(options: {
  buyerId?: string;
  sellerId?: string;
  productId?: string;
  validUntil?: string | null;
  quoteStatus?: string;
  enquiryStatus?: string;
  createdAt?: string;
} = {}) {
  const buyerId = options.buyerId ?? w.buyerA;
  const sellerId = options.sellerId ?? w.sellerA;
  const productId = options.productId ?? w.productA;
  const quoteStatus = options.quoteStatus ?? "sent";
  const enquiryStatus = options.enquiryStatus ?? "quoted";

  // 1. Create enquiry
  const enqRows = await w.env.admin<{ id: string }>(
    `insert into public.enquiries
       (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit, currency, status, delivery_location)
     values ($1, $2, $3, 'Order flow test enquiry', 'Need premium marble slabs.', 100, 'sq_ft', 'INR', $4, 'Mundra Port, Gujarat')
     returning id`,
    [buyerId, sellerId, productId, enquiryStatus],
  );
  const enquiryId = enqRows[0]!.id;

  // 2. Create quotation
  const createdAtClause = options.createdAt ? `, created_at` : "";
  const createdAtVal = options.createdAt ? `, '${options.createdAt}'::timestamptz` : "";
  const quoteRows = await w.env.admin<{ id: string }>(
    `insert into public.quotations
       (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency, status, valid_until${createdAtClause})
     values ($1, $2, $3, 1000.00, 180.00, 100.00, 0.00, 1280.00, 'INR', $4, $5${createdAtVal})
     returning id`,
    [enquiryId, sellerId, buyerId, quoteStatus, options.validUntil ?? null],
  );
  const quotationId = quoteRows[0]!.id;

  // 3. Add quotation item
  await w.env.admin(
    `insert into public.quotation_items
       (quotation_id, product_id, description, quantity, unit, unit_price, total_price)
     values ($1, $2, 'White Makrana Slab', 100, 'sq_ft', 10.00, 1000.00)`,
    [quotationId, productId],
  );

  return { enquiryId, quotationId };
}

describe("Phase 2: Quotation Acceptance & Order Initiation", () => {
  it("allows designated buyer to accept quotation and create order (happy path)", async () => {
    const { quotationId } = await setupTestQuotation();

    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, $3::jsonb, false, 'Urgent site delivery')`,
      [quotationId, JSON.stringify(validDomesticAddress), JSON.stringify(validShippingAddress)],
    );

    const orderId = rows[0]?.accept_quotation_and_create_order;
    expect(orderId).toBeDefined();

    // Verify order record in public.orders
    const orderRows = await w.env.admin<{
      order_number: string;
      status: string;
      payment_status: string;
      subtotal: string;
      tax_amount: string;
      shipping_charges: string;
      total_amount: string;
      delivery_location: string;
      buyer_snapshot: Record<string, unknown>;
      seller_snapshot: Record<string, unknown>;
      billing_address: Record<string, unknown>;
      shipping_address: Record<string, unknown>;
    }>(`select * from public.orders where id = $1`, [orderId]);

    expect(orderRows).toHaveLength(1);
    const ord = orderRows[0]!;
    expect(ord.order_number).toMatch(/^ORD-\d{8}-\d{5}$/);
    expect(ord.status).toBe("pending_payment");
    expect(ord.payment_status).toBe("pending");
    expect(Number(ord.subtotal)).toBe(1000.0);
    expect(Number(ord.tax_amount)).toBe(180.0);
    expect(Number(ord.shipping_charges)).toBe(100.0);
    expect(Number(ord.total_amount)).toBe(1280.0);
    expect(ord.delivery_location).toBe("Mundra Port, Gujarat");

    // Address verification
    expect(ord.billing_address.contact_name).toBe("Rajesh Sharma");
    expect(ord.billing_address.gstin).toBe("08ABCDE1234F1Z5");
    expect(ord.shipping_address.contact_name).toBe("Suresh Patel");
    expect(ord.shipping_address.city).toBe("Mundra");

    // Snapshots verification
    expect(ord.buyer_snapshot.email).toBeDefined();
    expect(ord.seller_snapshot.business_name).toBe("Makrana Marble Co");

    // Order items verification
    const itemRows = await w.env.admin<{
      description: string;
      quantity: string;
      unit_price: string;
      total_price: string;
      specifications: Record<string, unknown>;
    }>(`select * from public.order_items where order_id = $1`, [orderId]);

    expect(itemRows).toHaveLength(1);
    expect(itemRows[0]?.description).toBe("White Makrana Slab");
    expect(Number(itemRows[0]?.quantity)).toBe(100);
    expect(Number(itemRows[0]?.total_price)).toBe(1000.0);
    expect(itemRows[0]?.specifications?.tax_rate_bps).toBe(1800); // 18% tax

    // Order status history verification
    const histRows = await w.env.admin<{
      previous_status: string | null;
      new_status: string;
      changed_by: string;
    }>(`select * from public.order_status_history where order_id = $1`, [orderId]);

    expect(histRows).toHaveLength(1);
    expect(histRows[0]?.previous_status).toBeNull();
    expect(histRows[0]?.new_status).toBe("pending_payment");
    expect(histRows[0]?.changed_by).toBe(w.buyerA);

    // Quotation status updated to accepted
    const quoteCheck = await w.env.admin<{ status: string }>(
      `select status from public.quotations where id = $1`,
      [quotationId],
    );
    expect(quoteCheck[0]?.status).toBe("accepted");
  });

  it("handles same_as_billing = true without requiring separate shippingAddress", async () => {
    const { quotationId } = await setupTestQuotation();

    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );

    const orderId = rows[0]?.accept_quotation_and_create_order;
    const orderRows = await w.env.admin<{
      billing_address: Record<string, unknown>;
      shipping_address: Record<string, unknown>;
    }>(`select billing_address, shipping_address from public.orders where id = $1`, [orderId]);

    expect(orderRows[0]?.shipping_address).toEqual(orderRows[0]?.billing_address);
  });

  it("rejects when same_as_billing is false and shipping address is missing", async () => {
    const { quotationId } = await setupTestQuotation();

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `select public.accept_quotation_and_create_order($1, $2::jsonb, null, false)`,
        [quotationId, JSON.stringify(validDomesticAddress)],
      ),
    );
    expect(err).toMatch(/Shipping address is required when same_as_billing is false/);
  });

  it("idempotently returns existing order_id when re-accepted by same buyer", async () => {
    const { quotationId } = await setupTestQuotation();

    // First acceptance
    const rows1 = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId1 = rows1[0]?.accept_quotation_and_create_order;

    // Second acceptance with same buyer
    const rows2 = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId2 = rows2[0]?.accept_quotation_and_create_order;

    expect(orderId2).toBe(orderId1);

    // Verify order wasn't duplicated
    const countRows = await w.env.admin<{ c: string }>(
      `select count(*)::text c from public.orders where quotation_id = $1`,
      [quotationId],
    );
    expect(Number(countRows[0]?.c)).toBe(1);
  });
});

describe("Address Sanitization & Validation", () => {
  it("rejects non-object address JSON", async () => {
    const { quotationId } = await setupTestQuotation();

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `select public.accept_quotation_and_create_order($1, '"not an object"'::jsonb, null, true)`,
        [quotationId],
      ),
    );
    expect(err).toMatch(/Billing address must be a valid JSON object/);
  });

  it("rejects phone numbers with fewer than 10 digits", async () => {
    const { quotationId } = await setupTestQuotation();
    const badAddress = { ...validDomesticAddress, phone: "+91 12345" };

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
        [quotationId, JSON.stringify(badAddress)],
      ),
    );
    expect(err).toMatch(/phone must contain between 10 and 15 digits/);
  });

  it("rejects invalid Indian PIN codes", async () => {
    const { quotationId } = await setupTestQuotation();
    const badAddress = { ...validDomesticAddress, pincode: "012345" };

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
        [quotationId, JSON.stringify(badAddress)],
      ),
    );
    expect(err).toMatch(/delivery PIN code must be exactly 6 digits starting with 1-9/);
  });

  it("accepts valid international postal codes when country != 'IN'", async () => {
    const { quotationId } = await setupTestQuotation();
    const intlAddress = {
      contactName: "Robert Smith",
      phone: "+1 415 555 2671",
      addressLine1: "123 Market Street, Suite 500",
      city: "San Francisco",
      state: "CA",
      pincode: "94105",
      country: "US",
    };

    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(intlAddress)],
    );
    expect(rows[0]?.accept_quotation_and_create_order).toBeDefined();
  });

  it("rejects invalid GSTIN format for domestic address", async () => {
    const { quotationId } = await setupTestQuotation();
    const badAddress = { ...validDomesticAddress, gstin: "INVALID_GSTIN_123" };

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
        [quotationId, JSON.stringify(badAddress)],
      ),
    );
    expect(err).toMatch(/Invalid GSTIN format/);
  });
});

describe("Quotation Expiry Enforcement", () => {
  it("rejects past valid_until quotation", async () => {
    const pastDate = new Date(Date.now() - 3600_000).toISOString();
    const { quotationId } = await setupTestQuotation({ validUntil: pastDate });

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
        [quotationId, JSON.stringify(validDomesticAddress)],
      ),
    );
    expect(err).toMatch(/Quotation has expired/);
  });

  it("accepts future valid_until quotation", async () => {
    const futureDate = new Date(Date.now() + 7 * 86400_000).toISOString();
    const { quotationId } = await setupTestQuotation({ validUntil: futureDate });

    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    expect(rows[0]?.accept_quotation_and_create_order).toBeDefined();
  });

  it("rejects NULL valid_until if created more than 30 days ago", async () => {
    const oldCreatedDate = new Date(Date.now() - 35 * 86400_000).toISOString();
    const { quotationId } = await setupTestQuotation({
      validUntil: null,
      createdAt: oldCreatedDate,
    });

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
        [quotationId, JSON.stringify(validDomesticAddress)],
      ),
    );
    expect(err).toMatch(/Quotation has expired/);
  });

  it("accepts NULL valid_until if created within 30 days", async () => {
    const recentCreatedDate = new Date(Date.now() - 5 * 86400_000).toISOString();
    const { quotationId } = await setupTestQuotation({
      validUntil: null,
      createdAt: recentCreatedDate,
    });

    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    expect(rows[0]?.accept_quotation_and_create_order).toBeDefined();
  });
});

describe("Authorization & Security Guards", () => {
  it("blocks non-designated buyer from accepting someone else's quotation", async () => {
    const { quotationId } = await setupTestQuotation({ buyerId: w.buyerA });

    const err = await failure(
      w.env.as(
        user(w.buyerB),
        `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
        [quotationId, JSON.stringify(validDomesticAddress)],
      ),
    );
    expect(err).toMatch(/Only the designated recipient buyer can accept this quotation/);
  });

  it("blocks unauthenticated / anon user from accepting quotation", async () => {
    const { quotationId } = await setupTestQuotation();

    const err = await failure(
      w.env.as(
        anon,
        `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
        [quotationId, JSON.stringify(validDomesticAddress)],
      ),
    );
    expect(err).toMatch(/permission denied/);
  });

  it("blocks direct client insert into order_items outside trusted RPC", async () => {
    const { quotationId } = await setupTestQuotation();
    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId = rows[0]!.accept_quotation_and_create_order;

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `insert into public.order_items (order_id, description, quantity, unit, unit_price, total_price)
         values ($1, 'Forged Item', 10, 'piece', 50.00, 500.00)`,
        [orderId],
      ),
    );
    expect(err).toMatch(/permission denied|Order items can only be created via the trusted order creation RPC/);
  });

  it("blocks direct mutation or deletion of order_items", async () => {
    const { quotationId } = await setupTestQuotation();
    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId = rows[0]!.accept_quotation_and_create_order;

    // Try to update an order item as buyer
    const errUpdate = await failure(
      w.env.as(
        user(w.buyerA),
        `update public.order_items set total_price = 1.00 where order_id = $1`,
        [orderId],
      ),
    );
    expect(errUpdate).toMatch(/permission denied|append-only/);

    // Try as admin / superuser
    const errAdminUpdate = await failure(
      w.env.admin(`update public.order_items set total_price = 1.00 where order_id = $1`, [orderId]),
    );
    expect(errAdminUpdate).toMatch(/append-only/);
  });

  it("blocks direct client update of orders table", async () => {
    const { quotationId } = await setupTestQuotation();
    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId = rows[0]!.accept_quotation_and_create_order;

    const err = await failure(
      w.env.as(
        user(w.buyerA),
        `update public.orders set total_amount = 0.00 where id = $1`,
        [orderId],
      ),
    );
    expect(err).toMatch(/permission denied/);
  });

  it("blocks modification of immutable order financial fields even in privileged updates", async () => {
    const { quotationId } = await setupTestQuotation();
    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId = rows[0]!.accept_quotation_and_create_order;

    const err = await failure(
      w.env.admin(
        `update public.orders set total_amount = 1.00 where id = $1`,
        [orderId],
      ),
    );
    expect(err).toMatch(/Order commercial terms, pricing, snapshots, and participant identifiers are strictly immutable/);
  });
});

describe("Order Status State Machine (transition_order_status)", () => {
  it("allows buyer to cancel a pending_payment order", async () => {
    const { quotationId } = await setupTestQuotation();
    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId = rows[0]!.accept_quotation_and_create_order;

    await w.env.as(
      user(w.buyerA),
      `select public.transition_order_status($1, 'cancelled', 'Budget constraints changed')`,
      [orderId],
    );

    const ord = (await w.env.admin<{ status: string }>(`select status from public.orders where id = $1`, [orderId]))[0];
    expect(ord?.status).toBe("cancelled");

    // History record added
    const hist = await w.env.admin<{ new_status: string; notes: string }>(
      `select new_status, notes from public.order_status_history where order_id = $1 order by created_at desc limit 1`,
      [orderId],
    );
    expect(hist[0]?.new_status).toBe("cancelled");
    expect(hist[0]?.notes).toBe("Budget constraints changed");
  });

  it("blocks buyer from marking order confirmed or processing", async () => {
    const { quotationId } = await setupTestQuotation();
    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId = rows[0]!.accept_quotation_and_create_order;

    const err = await failure(
      w.env.as(user(w.buyerA), `select public.transition_order_status($1, 'confirmed')`, [orderId]),
    );
    expect(err).toMatch(/Order transition from "pending_payment" to "confirmed" is not authorized for your role/);
  });

  it("allows seller to advance order through confirmed -> processing -> dispatched", async () => {
    const { quotationId } = await setupTestQuotation();
    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId = rows[0]!.accept_quotation_and_create_order;

    // 1. Seller confirms order
    await w.env.as(
      user(w.sellerUserA),
      `select public.transition_order_status($1, 'confirmed', 'Pro-forma verified')`,
      [orderId],
    );
    let ord = (await w.env.admin<{ status: string }>(`select status from public.orders where id = $1`, [orderId]))[0];
    expect(ord?.status).toBe("confirmed");

    // 2. Seller puts into processing (cutting & finishing)
    await w.env.as(
      user(w.sellerUserA),
      `select public.transition_order_status($1, 'processing', 'Slabs cut and polished')`,
      [orderId],
    );
    ord = (await w.env.admin<{ status: string }>(`select status from public.orders where id = $1`, [orderId]))[0];
    expect(ord?.status).toBe("processing");

    // 3. Seller dispatches consignment
    await w.env.as(
      user(w.sellerUserA),
      `select public.transition_order_status($1, 'dispatched', 'Dispatched via VRL Logistics')`,
      [orderId],
    );
    ord = (await w.env.admin<{ status: string }>(`select status from public.orders where id = $1`, [orderId]))[0];
    expect(ord?.status).toBe("dispatched");

    // 4. Buyer confirms delivery
    await w.env.as(
      user(w.buyerA),
      `select public.transition_order_status($1, 'delivered', 'Material received in excellent condition')`,
      [orderId],
    );
    ord = (await w.env.admin<{ status: string }>(`select status from public.orders where id = $1`, [orderId]))[0];
    expect(ord?.status).toBe("delivered");

    // 5. Admin marks completed
    await w.env.as(
      user(w.adminUser),
      `select public.transition_order_status($1, 'completed', 'Order fulfilled successfully')`,
      [orderId],
    );
    ord = (await w.env.admin<{ status: string }>(`select status from public.orders where id = $1`, [orderId]))[0];
    expect(ord?.status).toBe("completed");
  });

  it("blocks seller from cancelling an order directly", async () => {
    const { quotationId } = await setupTestQuotation();
    const rows = await w.env.as<{ accept_quotation_and_create_order: string }>(
      user(w.buyerA),
      `select public.accept_quotation_and_create_order($1, $2::jsonb, null, true)`,
      [quotationId, JSON.stringify(validDomesticAddress)],
    );
    const orderId = rows[0]!.accept_quotation_and_create_order;

    const err = await failure(
      w.env.as(user(w.sellerUserA), `select public.transition_order_status($1, 'cancelled')`, [orderId]),
    );
    expect(err).toMatch(/Order transition from "pending_payment" to "cancelled" is not authorized for your role/);
  });
});

describe("Buyer Saved Addresses (buyer_addresses)", () => {
  it("allows buyer to save and retrieve an address", async () => {
    const rows = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.buyer_addresses
         (buyer_id, address_type, contact_name, phone, company_name, gstin, address_line1, city, state, pincode, country, is_default)
       values
         ($1, 'both', 'Rajesh Sharma', '+91 98765 43210', 'Sharma Stone Works', '08ABCDE1234F1Z5', 'Plot 14, RIICO', 'Jaipur', 'Rajasthan', '302001', 'IN', true)
       returning id`,
      [w.buyerA],
    );
    expect(rows).toHaveLength(1);
    const addressId = rows[0]!.id;

    // Buyer A can query their saved address
    const selectRows = await w.env.as<{ contact_name: string }>(
      user(w.buyerA),
      `select contact_name from public.buyer_addresses where id = $1`,
      [addressId],
    );
    expect(selectRows[0]?.contact_name).toBe("Rajesh Sharma");

    // Buyer B CANNOT see Buyer A's saved address (RLS isolation)
    const buyerBRows = await w.env.as(
      user(w.buyerB),
      `select * from public.buyer_addresses where id = $1`,
      [addressId],
    );
    expect(buyerBRows).toEqual([]);
  });
});
