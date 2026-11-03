import { beforeAll, describe, expect, it } from "vitest";
import { anon, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

describe("Guest Enquiries & RFQs Persistence (Phase 1)", () => {
  it("persists a guest enquiry with nullable buyer_id and valid guest identity", async () => {
    const [inserted] = await w.env.admin<{
      id: string;
      guest_name: string;
      guest_email: string;
      guest_phone: string;
      guest_company: string;
      enquiry_type: string;
    }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone, guest_company, enquiry_type, specifications)
       values
         (null, $1, 'Guest Marble Sourcing', 'Need 500 sq ft Makrana white', 500, 'sq_ft', 'INR',
          'Vatsalya Sharma', 'vatsalya@example.com', '+919876543210', 'Sharma Interiors', 'direct', '{"finish": "polished"}'::jsonb)
       returning id, guest_name, guest_email, guest_phone, guest_company, enquiry_type`,
      [w.sellerA],
    );

    expect(inserted).toBeDefined();
    expect(inserted.guest_name).toBe("Vatsalya Sharma");
    expect(inserted.guest_email).toBe("vatsalya@example.com");
    expect(inserted.guest_phone).toBe("+919876543210");
    expect(inserted.guest_company).toBe("Sharma Interiors");
    expect(inserted.enquiry_type).toBe("direct");
  });

  it("persists a guest broadcast RFQ with nullable seller_id and JSONB specifications", async () => {
    const [inserted] = await w.env.admin<{
      id: string;
      seller_id: string | null;
      specifications: { thickness: string; finish: string };
    }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone, enquiry_type, specifications)
       values
         (null, null, 'Architectural Granite RFQ', 'Project require 20mm granite slabs', 200, 'sq_m', 'INR',
          'Architect Rohit', 'rohit@studio.com', '+919811122233', 'rfq', '{"thickness": "20mm", "finish": "flamed"}'::jsonb)
       returning id, seller_id, specifications`,
    );

    expect(inserted).toBeDefined();
    expect(inserted.seller_id).toBeNull();
    expect(inserted.specifications.thickness).toBe("20mm");
    expect(inserted.specifications.finish).toBe("flamed");
  });

  it("enforces identity check constraint when neither buyer_id nor guest contact info is provided", async () => {
    await expect(
      w.env.admin(
        `insert into public.enquiries
           (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency)
         values
           (null, $1, 'Anonymous Spam', 'No contact info', 100, 'sq_ft', 'INR')`,
        [w.sellerA],
      ),
    ).rejects.toThrow();
  });

  it("enforces identity check constraint: rejects whitespace-only guest identity", async () => {
    // Whitespace-only guest_name
    await expect(
      w.env.admin(
        `insert into public.enquiries
           (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
            guest_name, guest_email)
         values
           (null, $1, 'Whitespace Name', 'Details', 100, 'sq_ft', 'INR',
            '   ', 'guest@test.com')`,
        [w.sellerA],
      ),
    ).rejects.toThrow();

    // Whitespace-only guest_email and null guest_phone
    await expect(
      w.env.admin(
        `insert into public.enquiries
           (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
            guest_name, guest_email, guest_phone)
         values
           (null, $1, 'Whitespace Email', 'Details', 100, 'sq_ft', 'INR',
            'Valid Name', '   ', null)`,
        [w.sellerA],
      ),
    ).rejects.toThrow();
  });

  it("enforces guest idempotency on client_request_id to prevent duplicate submissions", async () => {
    const clientReqId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    await w.env.admin(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone, client_request_id)
       values
         (null, $1, 'First Submission', 'First attempt', 100, 'sq_ft', 'INR',
          'Builder Ankit', 'ankit@build.com', '+919999988888', $2)`,
      [w.sellerA, clientReqId],
    );

    // Duplicate submission with same client_request_id must fail unique constraint
    await expect(
      w.env.admin(
        `insert into public.enquiries
           (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
            guest_name, guest_email, guest_phone, client_request_id)
         values
           (null, $1, 'Second Duplicate Submission', 'Duplicate attempt', 100, 'sq_ft', 'INR',
            'Builder Ankit', 'ankit@build.com', '+919999988888', $2)`,
        [w.sellerA, clientReqId],
      ),
    ).rejects.toThrow();
  });

  it("RLS & Grants: anon cannot select guest enquiries (permission denied)", async () => {
    const [enq] = await w.env.admin<{ id: string }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone)
       values
         (null, $1, 'Confidential Lead', 'Details for seller only', 150, 'sq_ft', 'INR',
          'Private Buyer', 'private@lead.com', '+919777766666')
       returning id`,
      [w.sellerA],
    );

    await expect(
      w.env.as(
        anon,
        `select id, guest_name, guest_email from public.enquiries where id = $1`,
        [enq.id],
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("RLS: target seller can view the guest enquiry and contact details", async () => {
    const [enq] = await w.env.admin<{ id: string }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone)
       values
         (null, $1, 'Sourcing for Seller A', 'Looking for travertine', 300, 'sq_ft', 'INR',
          'Kapil Dev', 'kapil@dev.com', '+919555544444')
       returning id`,
      [w.sellerA],
    );

    const rows = await w.env.as<{ id: string; guest_name: string; guest_email: string }>(
      user(w.sellerUserA),
      `select id, guest_name, guest_email from public.enquiries where id = $1`,
      [enq.id],
    );
    expect(rows.length).toBe(1);
    expect(rows[0]!.guest_name).toBe("Kapil Dev");
    expect(rows[0]!.guest_email).toBe("kapil@dev.com");
  });

  it("RLS: other seller cannot view guest enquiries assigned to a different seller", async () => {
    const [enq] = await w.env.admin<{ id: string }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone)
       values
         (null, $1, 'Exclusive Lead Seller A', 'Details', 50, 'sq_ft', 'INR',
          'VIP Client', 'vip@client.com', '+919333322222')
       returning id`,
      [w.sellerA],
    );

    const rows = await w.env.as(
      user(w.sellerUserB),
      `select id from public.enquiries where id = $1`,
      [enq.id],
    );
    expect(rows).toEqual([]);
  });

  it("RLS: admin can view all guest and broadcast enquiries", async () => {
    const [enq] = await w.env.admin<{ id: string }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone, enquiry_type)
       values
         (null, null, 'General Stone Sourcing', 'Broadcast to admin', 1000, 'sq_ft', 'INR',
          'Large Developer', 'dev@megaproject.com', '+919111100000', 'rfq')
       returning id`,
    );

    const rows = await w.env.as<{ id: string; guest_name: string }>(
      user(w.adminUser),
      `select id, guest_name from public.enquiries where id = $1`,
      [enq.id],
    );
    expect(rows.length).toBe(1);
    expect(rows[0]!.guest_name).toBe("Large Developer");
  });

  it("trigger: emits notification with guest name to target seller", async () => {
    const [enq] = await w.env.admin<{ id: string }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone)
       values
         (null, $1, 'Premium Marble Request', 'Need pricing', 400, 'sq_ft', 'INR',
          'Sunil Gavaskar', 'sunil@cricket.com', '+919000011111')
       returning id`,
      [w.sellerA],
    );

    const notifs = await w.env.admin<{ title: string; message: string; notification_type: string }>(
      `select title, message, notification_type from public.notifications
       where reference_id = $1 and user_id = $2`,
      [enq.id, w.sellerUserA],
    );

    expect(notifs.length).toBe(1);
    expect(notifs[0]!.notification_type).toBe("enquiry_received");
    expect(notifs[0]!.message).toContain("Sunil Gavaskar requested 400 sq ft.");
  });

  it("authenticated buyer can insert into public.enquiries with enquiry_type and specifications", async () => {
    const clientReqId = "11111111-2222-4333-8444-555555555555";
    const [enq] = await w.env.as<{ id: string }>(
      user(w.buyerA),
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          enquiry_type, specifications, client_request_id)
       values
         ($1, $2, 'Buyer RFQ', 'Architectural specification requirement', 100, 'sq_ft', 'INR',
          'rfq', '{"thickness": "18mm"}'::jsonb, $3)
       returning id`,
      [w.buyerA, w.sellerA, clientReqId],
    );
    expect(enq).toBeDefined();
    expect(enq.id).toBeDefined();
  });

  it("clients cannot UPDATE public.enquiries directly (must use SECURITY DEFINER RPC)", async () => {
    await expect(
      w.env.as(
        user(w.buyerA),
        "update public.enquiries set description = 'hacked' where buyer_id = $1",
        [w.buyerA],
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("clients cannot DELETE from public.enquiries", async () => {
    await expect(
      w.env.as(
        user(w.buyerA),
        "delete from public.enquiries where buyer_id = $1",
        [w.buyerA],
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("broadcast RFQ with NULL seller_id does not notify any seller", async () => {
    const [enq] = await w.env.admin<{ id: string }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone, enquiry_type)
       values
         (null, null, 'Public Broadcast RFQ', 'All sellers', 5000, 'sq_ft', 'INR',
          'Mega Builder', 'builder@mega.com', '+919876543210', 'rfq')
       returning id`,
    );

    const notifs = await w.env.admin<{ id: string }>(
      `select id from public.notifications where reference_id = $1`,
      [enq.id],
    );
    // No notifications created for any seller since seller_id is null
    expect(notifs).toEqual([]);
  });

  it("transition_enquiry_status RPC works for authorized seller on guest enquiries", async () => {
    const [enq] = await w.env.admin<{ id: string }>(
      `insert into public.enquiries
         (buyer_id, seller_id, enquiry_title, description, quantity, unit, currency,
          guest_name, guest_email, guest_phone)
       values
         (null, $1, 'Travertine Requirement', 'Details', 250, 'sq_ft', 'INR',
          'Guest Lead', 'guest@lead.com', '+919888877777')
       returning id`,
      [w.sellerA],
    );

    // Seller moves status to 'viewed'
    await w.env.as(
      user(w.sellerUserA),
      `select public.transition_enquiry_status($1, 'viewed', 'Reviewed by sales team')`,
      [enq.id],
    );

    const [updated] = await w.env.admin<{ status: string }>(
      `select status from public.enquiries where id = $1`,
      [enq.id],
    );
    expect(updated?.status).toBe("viewed");
  });
});
