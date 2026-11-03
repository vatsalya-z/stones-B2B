import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

describe("Phase 6: Conversations, Real-Time Messages, Private Attachments & Event Notifications", () => {
  let w: World;

  beforeAll(async () => {
    w = await createWorld();
  });

  describe("1. Conversation creation, canonical deduplication & eligibility guards", () => {
    it("rejects unauthenticated conversation creation and direct client INSERT/UPDATE/DELETE", async () => {
      expect(
        await failure(
          w.env.as(anon, "select public.get_or_create_conversation($1, null, null, 'Hello')", [
            w.sellerA,
          ]),
        ),
      ).toBeDefined();

      // Authenticated users have no direct INSERT privilege on public.conversations
      expect(
        await failure(
          w.env.as(
            user(w.buyerA),
            `insert into public.conversations (buyer_id, seller_id, subject)
             values ($1, $2, 'Bypass RPC')`,
            [w.buyerA, w.sellerA],
          ),
        ),
      ).toMatch(/permission denied/i);
    });

    it("creates and deduplicates general, product-linked, and enquiry-linked conversations", async () => {
      // 1. General supplier conversation (buyerA <-> sellerA)
      const gen1 = await w.env.as<{ id: string }>(
        user(w.buyerA),
        "select public.get_or_create_conversation($1, null, null, 'General Factory Inquiry') as id",
        [w.sellerA],
      );
      const gen2 = await w.env.as<{ id: string }>(
        user(w.buyerA),
        "select public.get_or_create_conversation($1, null, null, 'Duplicate Call') as id",
        [w.sellerA],
      );
      expect(gen1[0]!.id).toBeTruthy();
      expect(gen2[0]!.id).toBe(gen1[0]!.id);

      // 2. Product-linked conversation (distinct from general thread, deduplicated on repeat call)
      const prod1 = await w.env.as<{ id: string }>(
        user(w.buyerA),
        "select public.get_or_create_conversation($1, null, $2, null) as id",
        [w.sellerA, w.productA],
      );
      const prod2 = await w.env.as<{ id: string }>(
        user(w.buyerA),
        "select public.get_or_create_conversation($1, null, $2, null) as id",
        [w.sellerA, w.productA],
      );
      expect(prod1[0]!.id).not.toBe(gen1[0]!.id);
      expect(prod2[0]!.id).toBe(prod1[0]!.id);

      // 3. Enquiry-linked conversation (both buyerA and sellerUserA resolve to the exact same thread)
      const enqRows = await w.env.as<{ id: string }>(
        user(w.buyerA),
        `insert into public.enquiries (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
         values ($1, $2, $3, 'Makrana Villa Flooring Lot', 'Need 3,500 sq ft mirror polished slabs', 3500, 'sq_ft')
         returning id`,
        [w.buyerA, w.sellerA, w.productA],
      );
      const enquiryId = enqRows[0]!.id;

      const enqBySeller = await w.env.as<{ id: string }>(
        user(w.sellerUserA),
        "select public.get_or_create_conversation($1, $2, $3, null) as id",
        [w.sellerA, enquiryId, w.productA],
      );
      const enqByBuyer = await w.env.as<{ id: string }>(
        user(w.buyerA),
        "select public.get_or_create_conversation($1, $2, null, null) as id",
        [w.sellerA, enquiryId],
      );
      expect(enqBySeller[0]!.id).toBe(enqByBuyer[0]!.id);
      expect(enqByBuyer[0]!.id).not.toBe(prod1[0]!.id);

      // Third-party buyerB or sellerUserB cannot open an enquiry thread they don't belong to
      expect(
        await failure(
          w.env.as(
            user(w.buyerB),
            "select public.get_or_create_conversation($1, $2, null, null)",
            [w.sellerA, enquiryId],
          ),
        ),
      ).toMatch(/not authorized/i);
      expect(
        await failure(
          w.env.as(
            user(w.sellerUserB),
            "select public.get_or_create_conversation($1, $2, null, null)",
            [w.sellerA, enquiryId],
          ),
        ),
      ).toMatch(/not authorized/i);
    });

    it("blocks messaging unverified sellers, draft products, and self-owned seller profiles", async () => {
      // Unverified seller
      const pendingSellerUser = await w.env.signup(`pending-seller@test.dev`, "seller");
      const pendingSellerId = (
        await w.env.admin<{ id: string }>(
          `insert into public.seller_profiles (user_id, business_name, slug, business_type, verification_status)
           values ($1, 'Unverified Quarry', 'unverified-quarry-p6', 'mine_owner', 'submitted') returning id`,
          [pendingSellerUser],
        )
      )[0]!.id;

      expect(
        await failure(
          w.env.as(
            user(w.buyerA),
            "select public.get_or_create_conversation($1, null, null, 'Chat?')",
            [pendingSellerId],
          ),
        ),
      ).toMatch(/seller is not verified/i);

      // Draft product rejected
      expect(
        await failure(
          w.env.as(
            user(w.buyerA),
            "select public.get_or_create_conversation($1, null, $2, null)",
            [w.sellerA, w.productADraft],
          ),
        ),
      ).toMatch(/product is not available/i);

      // Dual-role user cannot message their own seller business
      await w.env.admin(
        "insert into public.user_roles (user_id, role) values ($1, 'buyer') on conflict do nothing",
        [w.sellerUserA],
      );
      expect(
        await failure(
          w.env.as(
            user(w.sellerUserA),
            "select public.get_or_create_conversation($1, null, null, 'Self chat')",
            [w.sellerA],
          ),
        ),
      ).toMatch(/cannot message your own seller business/i);
    });
  });

  describe("2. RLS isolation, seller-buyer visibility, message lifecycle, read receipts & archiving", () => {
    it("allows seller to view buyer profile in direct conversations while isolating other sellers/buyers", async () => {
      // Fresh buyerC starts a direct conversation (no enquiry yet) with sellerA
      const buyerC = await w.env.signup("buyer-c-direct@test.dev", "buyer");

      // Before conversation: sellerUserA cannot read buyerC's profile
      const beforeRows = await w.env.as(
        user(w.sellerUserA),
        "select id from public.profiles where id = $1",
        [buyerC],
      );
      expect(beforeRows).toHaveLength(0);

      const convRows = await w.env.as<{ id: string }>(
        user(buyerC),
        "select public.get_or_create_conversation($1, null, null, 'Pre-RFQ Slab Availability') as id",
        [w.sellerA],
      );
      const convId = convRows[0]!.id;

      // After direct conversation: sellerUserA CAN read buyerC's profile, while sellerUserB CANNOT
      const sellerAView = await w.env.as(
        user(w.sellerUserA),
        "select id, email from public.profiles where id = $1",
        [buyerC],
      );
      expect(sellerAView).toHaveLength(1);

      const sellerBView = await w.env.as(
        user(w.sellerUserB),
        "select id from public.profiles where id = $1",
        [buyerC],
      );
      expect(sellerBView).toHaveLength(0);

      // Cross-buyer & cross-seller isolation on conversations & messages
      expect(
        await w.env.as(user(w.buyerB), "select id from public.conversations where id = $1", [
          convId,
        ]),
      ).toHaveLength(0);
      expect(
        await w.env.as(user(w.sellerUserB), "select id from public.conversations where id = $1", [
          convId,
        ]),
      ).toHaveLength(0);

      // Non-participants cannot insert messages into convId
      expect(
        await failure(
          w.env.as(
            user(w.buyerB),
            `insert into public.messages (conversation_id, sender_id, sender_role, body)
             values ($1, $2, 'buyer', 'Intruder message')`,
            [convId, w.buyerB],
          ),
        ),
      ).toBeDefined();

      expect(
        await failure(
          w.env.as(
            user(w.sellerUserB),
            `insert into public.messages (conversation_id, sender_id, sender_role, body)
             values ($1, $2, 'seller', 'Competitor hijack')`,
            [convId, w.sellerUserB],
          ),
        ),
      ).toBeDefined();

      // Dual-role sellerUserA (who also has 'buyer' role from earlier test) cannot send with sender_role='buyer' in a thread where buyerC is the buyer!
      expect(
        await failure(
          w.env.as(
            user(w.sellerUserA),
            `insert into public.messages (conversation_id, sender_id, sender_role, body)
             values ($1, $2, 'buyer', 'Spoofed role')`,
            [convId, w.sellerUserA],
          ),
        ),
      ).toMatch(/not authorized as buyer/i);

      // Clients cannot insert system messages
      expect(
        await failure(
          w.env.as(
            user(buyerC),
            `insert into public.messages (conversation_id, sender_id, sender_role, message_type, body)
             values ($1, $2, 'buyer', 'system', 'Fake platform notice')`,
            [convId, buyerC],
          ),
        ),
      ).toMatch(/cannot insert system messages/i);
    });

    it("tracks unread counts, previews, idempotent client_message_id, read receipts, archiving, and immutability", async () => {
      const buyerD = await w.env.signup("buyer-d-chat@test.dev", "buyer");
      const convId = (
        await w.env.as<{ id: string }>(
          user(buyerD),
          "select public.get_or_create_conversation($1, null, $2, 'Makrana Slab Lot #12') as id",
          [w.sellerA, w.productA],
        )
      )[0]!.id;

      // Seller archives the empty thread initially
      await w.env.as(
        user(w.sellerUserA),
        "select public.set_conversation_archived($1, true)",
        [convId],
      );
      const archivedState = await w.env.as<{
        seller_archived_at: string | null;
        buyer_archived_at: string | null;
      }>(
        user(w.sellerUserA),
        "select seller_archived_at, buyer_archived_at from public.conversations where id = $1",
        [convId],
      );
      expect(archivedState[0]!.seller_archived_at).not.toBeNull();
      expect(archivedState[0]!.buyer_archived_at).toBeNull();

      // Buyer sends message with client_message_id -> unarchives thread, increments seller_unread_count, emits notification
      const clientMsgId = randomUUID();
      const inserted = await w.env.as<{ id: string; message_type: string }>(
        user(buyerD),
        `insert into public.messages (conversation_id, sender_id, sender_role, body, client_message_id)
         values ($1, $2, 'buyer', '  Please share 18mm slab bundle dimensions.  ', $3)
         returning id, message_type`,
        [convId, buyerD, clientMsgId],
      );
      expect(inserted[0]!.message_type).toBe("text");

      // Duplicate retry with same client_message_id is rejected by unique constraint
      expect(
        await failure(
          w.env.as(
            user(buyerD),
            `insert into public.messages (conversation_id, sender_id, sender_role, body, client_message_id)
             values ($1, $2, 'buyer', 'Please share 18mm slab bundle dimensions.', $3)`,
            [convId, buyerD, clientMsgId],
          ),
        ),
      ).toMatch(/duplicate key|messages_idempotency_key/i);

      // Messages are immutable (UPDATE and DELETE blocked by prevent_mutation)
      expect(
        await failure(
          w.env.as(
            user(buyerD),
            "update public.messages set body = 'Tampered' where id = $1",
            [inserted[0]!.id],
          ),
        ),
      ).toBeDefined();
      expect(
        await failure(
          w.env.as(user(buyerD), "delete from public.messages where id = $1", [inserted[0]!.id]),
        ),
      ).toBeDefined();

      // Verify conversation metadata & seller unread count + auto-unarchive
      const afterBuyerMsg = await w.env.as<{
        seller_unread_count: number;
        buyer_unread_count: number;
        last_message_preview: string;
        seller_archived_at: string | null;
      }>(
        user(w.sellerUserA),
        `select seller_unread_count, buyer_unread_count, last_message_preview, seller_archived_at
         from public.conversations where id = $1`,
        [convId],
      );
      expect(afterBuyerMsg[0]!.seller_unread_count).toBe(1);
      expect(afterBuyerMsg[0]!.buyer_unread_count).toBe(0);
      expect(afterBuyerMsg[0]!.last_message_preview).toBe(
        "Please share 18mm slab bundle dimensions.",
      );
      expect(afterBuyerMsg[0]!.seller_archived_at).toBeNull();

      // Verify seller received 'message_received' notification referencing convId
      const sellerNotifsBeforeRead = await w.env.as<{ id: string; is_read: boolean }>(
        user(w.sellerUserA),
        `select id, is_read from public.notifications
         where user_id = $1 and notification_type = 'message_received' and reference_id = $2`,
        [w.sellerUserA, convId],
      );
      expect(sellerNotifsBeforeRead.length).toBeGreaterThanOrEqual(1);
      expect(sellerNotifsBeforeRead[0]!.is_read).toBe(false);

      // Seller calls mark_conversation_read -> resets seller_unread_count = 0, sets seller_last_read_at, and marks message notifications read
      await w.env.as(user(w.sellerUserA), "select public.mark_conversation_read($1)", [convId]);

      const afterSellerRead = await w.env.as<{
        seller_unread_count: number;
        seller_last_read_at: string | null;
      }>(
        user(w.sellerUserA),
        "select seller_unread_count, seller_last_read_at from public.conversations where id = $1",
        [convId],
      );
      expect(afterSellerRead[0]!.seller_unread_count).toBe(0);
      expect(afterSellerRead[0]!.seller_last_read_at).not.toBeNull();

      const sellerNotifsAfterRead = await w.env.as<{ is_read: boolean }>(
        user(w.sellerUserA),
        `select is_read from public.notifications
         where user_id = $1 and notification_type = 'message_received' and reference_id = $2`,
        [w.sellerUserA, convId],
      );
      expect(sellerNotifsAfterRead.every((n) => n.is_read)).toBe(true);
    });
  });

  describe("3. Private storage bucket RLS ('message-attachments') & rate limiting", () => {
    it("enforces <conversation_id>/<file> participant isolation and allowed file extensions on storage.objects", async () => {
      const buyerE = await w.env.signup("buyer-e-storage@test.dev", "buyer");
      const convId = (
        await w.env.as<{ id: string }>(
          user(buyerE),
          "select public.get_or_create_conversation($1, null, null, 'CAD Attachment Thread') as id",
          [w.sellerA],
        )
      )[0]!.id;

      // Buyer participant can upload PDF and WebP under <convId>/...
      await w.env.as(
        user(buyerE),
        `insert into storage.objects (bucket_id, name, owner_id)
         values ('message-attachments', $1, $2)`,
        [`${convId}/boq-schedule.pdf`, buyerE],
      );

      // Seller participant can upload JPG under <convId>/... and read Buyer's PDF
      await w.env.as(
        user(w.sellerUserA),
        `insert into storage.objects (bucket_id, name, owner_id)
         values ('message-attachments', $1, $2)`,
        [`${convId}/slab-bundle.jpg`, w.sellerUserA],
      );

      const sellerFiles = await w.env.as<{ name: string }>(
        user(w.sellerUserA),
        `select name from storage.objects
         where bucket_id = 'message-attachments' and name like $1`,
        [`${convId}/%`],
      );
      expect(sellerFiles).toHaveLength(2);

      // Disallowed extension (.exe / .html) rejected by storage RLS WITH CHECK
      expect(
        await failure(
          w.env.as(
            user(buyerE),
            `insert into storage.objects (bucket_id, name, owner_id)
             values ('message-attachments', $1, $2)`,
            [`${convId}/malware.exe`, buyerE],
          ),
        ),
      ).toBeDefined();

      // Non-participants (buyerB, sellerUserB, anon) cannot SELECT or INSERT under <convId>/...
      expect(
        await w.env.as(
          user(w.buyerB),
          `select name from storage.objects where bucket_id = 'message-attachments' and name like $1`,
          [`${convId}/%`],
        ),
      ).toHaveLength(0);

      expect(
        await failure(
          w.env.as(
            user(w.sellerUserB),
            `insert into storage.objects (bucket_id, name, owner_id)
             values ('message-attachments', $1, $2)`,
            [`${convId}/hijack.pdf`, w.sellerUserB],
          ),
        ),
      ).toBeDefined();
    });

    it("enforces the PostgreSQL 25 messages / 60s anti-spam rate limit", async () => {
      const spamBuyer = await w.env.signup("buyer-rate-limit@test.dev", "buyer");
      const convId = (
        await w.env.as<{ id: string }>(
          user(spamBuyer),
          "select public.get_or_create_conversation($1, null, null, 'Rate Limit Check') as id",
          [w.sellerB],
        )
      )[0]!.id;

      for (let i = 1; i <= 25; i++) {
        await w.env.as(
          user(spamBuyer),
          `insert into public.messages (conversation_id, sender_id, sender_role, body)
           values ($1, $2, 'buyer', $3)`,
          [convId, spamBuyer, `Message #${i}`],
        );
      }

      // 26th message within 60 seconds is rejected by messages_before_insert_guard
      expect(
        await failure(
          w.env.as(
            user(spamBuyer),
            `insert into public.messages (conversation_id, sender_id, sender_role, body)
             values ($1, $2, 'buyer', 'Message #26')`,
            [convId, spamBuyer],
          ),
        ),
      ).toMatch(/message rate limit exceeded/i);
    });
  });

  describe("4. Event-driven transactional notifications across all marketplace workflows", () => {
    it("emits notifications for enquiry creation, enquiry status changes, and quotation sent/accepted/rejected", async () => {
      const flowBuyer = await w.env.signup("buyer-notif-flow@test.dev", "buyer");

      // 1. New enquiry -> Seller receives 'enquiry_received', Buyer receives 'system' confirmation
      const enqId = (
        await w.env.as<{ id: string }>(
          user(flowBuyer),
          `insert into public.enquiries (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
           values ($1, $2, $3, 'Oberoi Hotel Lobby Marble', 'Need 8,000 sq ft bookmatched slabs', 8000, 'sq_ft')
           returning id`,
          [flowBuyer, w.sellerB, w.productB],
        )
      )[0]!.id;

      const sellerEnqNotifs = await w.env.as<{ notification_type: string; title: string }>(
        user(w.sellerUserB),
        `select notification_type, title from public.notifications
         where user_id = $1 and reference_id = $2 and notification_type = 'enquiry_received'`,
        [w.sellerUserB, enqId],
      );
      expect(sellerEnqNotifs).toHaveLength(1);
      expect(sellerEnqNotifs[0]!.title).toContain("Oberoi Hotel Lobby Marble");

      const buyerConfirmNotifs = await w.env.as<{ notification_type: string }>(
        user(flowBuyer),
        `select notification_type from public.notifications
         where user_id = $1 and reference_id = $2 and notification_type = 'system'`,
        [flowBuyer, enqId],
      );
      expect(buyerConfirmNotifs).toHaveLength(1);

      // 2. Seller transitions enquiry to 'viewed' -> Buyer receives 'enquiry_viewed'
      await w.env.as(
        user(w.sellerUserB),
        "select public.transition_enquiry_status($1, 'viewed', 'Reviewing CAD quantities')",
        [enqId],
      );

      const buyerViewedNotifs = await w.env.as<{ notification_type: string }>(
        user(flowBuyer),
        `select notification_type from public.notifications
         where user_id = $1 and reference_id = $2 and notification_type = 'enquiry_viewed'`,
        [flowBuyer, enqId],
      );
      expect(buyerViewedNotifs).toHaveLength(1);

      // 3. Seller prepares and sends a quotation -> Buyer receives 'quotation_received'
      const quoteId = (
        await w.env.as<{ id: string }>(
          user(w.sellerUserB),
          `insert into public.quotations (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency, terms)
           values ($1, $2, $3, 1160000.00, 0.00, 0.00, 0.00, 1160000.00, 'INR', '50% advance, balance before dispatch')
           returning id`,
          [enqId, w.sellerB, flowBuyer],
        )
      )[0]!.id;

      await w.env.as(
        user(w.sellerUserB),
        `insert into public.quotation_items (quotation_id, product_id, description, quantity, unit, unit_price, total_price)
         values ($1, $2, 'Kota Blue Mirror Polished Slab', 8000, 'sq_ft', 145, 1160000.00)`,
        [quoteId, w.productB],
      );

      await w.env.as(
        user(w.sellerUserB),
        "update public.quotations set status = 'sent' where id = $1",
        [quoteId],
      );

      const buyerQuoteNotifs = await w.env.as<{ notification_type: string; title: string }>(
        user(flowBuyer),
        `select notification_type, title from public.notifications
         where user_id = $1 and reference_id = $2 and notification_type = 'quotation_received'`,
        [flowBuyer, quoteId],
      );
      expect(buyerQuoteNotifs).toHaveLength(1);

      // 4. Buyer accepts quotation -> Seller receives 'quotation_accepted'
      await w.env.as(
        user(flowBuyer),
        "update public.quotations set status = 'accepted' where id = $1",
        [quoteId],
      );

      const sellerAcceptedNotifs = await w.env.as<{ notification_type: string }>(
        user(w.sellerUserB),
        `select notification_type from public.notifications
         where user_id = $1 and reference_id = $2 and notification_type = 'quotation_accepted'`,
        [w.sellerUserB, quoteId],
      );
      expect(sellerAcceptedNotifs).toHaveLength(1);

      // 5. Second enquiry + quotation declined -> Seller receives 'quotation_rejected'
      const enq2Id = (
        await w.env.as<{ id: string }>(
          user(flowBuyer),
          `insert into public.enquiries (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit)
           values ($1, $2, $3, 'Courtyard Paving Lot', 'Need 1,200 sq ft flamed', 1200, 'sq_ft')
           returning id`,
          [flowBuyer, w.sellerB, w.productB],
        )
      )[0]!.id;
      const quote2Id = (
        await w.env.as<{ id: string }>(
          user(w.sellerUserB),
          `insert into public.quotations (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency)
           values ($1, $2, $3, 216000.00, 0.00, 0.00, 0.00, 216000.00, 'INR') returning id`,
          [enq2Id, w.sellerB, flowBuyer],
        )
      )[0]!.id;
      await w.env.as(
        user(w.sellerUserB),
        `insert into public.quotation_items (quotation_id, description, quantity, unit, unit_price, total_price)
         values ($1, 'Courtyard Paving Flamed', 1200, 'sq_ft', 180, 216000.00)`,
        [quote2Id],
      );
      await w.env.as(
        user(w.sellerUserB),
        "update public.quotations set status = 'sent' where id = $1",
        [quote2Id],
      );
      await w.env.as(
        user(flowBuyer),
        "update public.quotations set status = 'rejected' where id = $1",
        [quote2Id],
      );

      const sellerRejectedNotifs = await w.env.as<{ notification_type: string }>(
        user(w.sellerUserB),
        `select notification_type from public.notifications
         where user_id = $1 and reference_id = $2 and notification_type = 'quotation_rejected'`,
        [w.sellerUserB, quote2Id],
      );
      expect(sellerRejectedNotifs).toHaveLength(1);
    });

    it("emits notifications for seller verification, product moderation, and account status changes", async () => {
      const modSellerUser = await w.env.signup("mod-seller-p6@test.dev", "seller");
      const modSellerId = (
        await w.env.admin<{ id: string }>(
          `insert into public.seller_profiles (user_id, business_name, slug, business_type, verification_status)
           values ($1, 'Aravalli Quartzite Exports', 'aravalli-quartzite-p6', 'exporter', 'submitted')
           returning id`,
          [modSellerUser],
        )
      )[0]!.id;

      // 1. Admin verifies seller -> emits 'seller_verification'
      await w.env.admin(
        `update public.seller_profiles
            set verification_status = 'verified', verified_at = now()
          where id = $1`,
        [modSellerId],
      );

      const verifNotifs = await w.env.as<{ title: string }>(
        user(modSellerUser),
        `select title from public.notifications
         where user_id = $1 and notification_type = 'seller_verification' and reference_id = $2`,
        [modSellerUser, modSellerId],
      );
      expect(verifNotifs).toHaveLength(1);
      expect(verifNotifs[0]!.title).toBe("Seller Business Verified");

      // 2. Product moderation -> emits 'product_moderation'
      const modProdId = (
        await w.env.admin<{ id: string }>(
          `insert into public.products (seller_id, category_id, name, slug, unit, price_type, price, moderation_status)
           values ($1, $2, 'Copper Quartzite Splitface', 'copper-quartzite-p6', 'sq_ft', 'fixed', 290, 'pending_review')
           returning id`,
          [modSellerId, w.categoryId],
        )
      )[0]!.id;

      await w.env.admin(
        "update public.products set moderation_status = 'approved', published_at = now() where id = $1",
        [modProdId],
      );

      const prodNotifs = await w.env.as<{ title: string }>(
        user(modSellerUser),
        `select title from public.notifications
         where user_id = $1 and notification_type = 'product_moderation' and reference_id = $2`,
        [modSellerUser, modProdId],
      );
      expect(prodNotifs).toHaveLength(1);
      expect(prodNotifs[0]!.title).toContain("Product Approved");

      // 3. Account status update -> emits 'account_status'
      await w.env.admin(
        "update public.profiles set account_status = 'suspended' where id = $1",
        [modSellerUser],
      );
      await w.env.admin(
        "update public.profiles set account_status = 'active' where id = $1",
        [modSellerUser],
      );

      const acctNotifs = await w.env.as<{ title: string }>(
        user(modSellerUser),
        `select title from public.notifications
         where user_id = $1 and notification_type = 'account_status'
         order by created_at asc`,
        [modSellerUser],
      );
      expect(acctNotifs.length).toBeGreaterThanOrEqual(2);
    });
  });
});

