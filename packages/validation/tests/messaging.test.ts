import { describe, expect, it } from "vitest";
import { MAX_CHAT_ATTACHMENT_BYTES } from "@stone/types";
import {
  conversationInboxFilterSchema,
  markConversationReadSchema,
  messageCursorQuerySchema,
  sanitizeAttachmentFilename,
  sendMessageSchema,
  startConversationSchema,
  toggleArchiveConversationSchema,
} from "../src/messaging";

const CONV_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CONV_ID = "22222222-2222-4222-8222-222222222222";
const SELLER_ID = "33333333-3333-4333-8333-333333333333";
const ENQUIRY_ID = "44444444-4444-4444-8444-444444444444";
const PRODUCT_ID = "55555555-5555-4555-8555-555555555555";
const CLIENT_MSG_ID = "66666666-6666-4666-8666-666666666666";

describe("Phase 6 Messaging & Conversation Validation Schemas", () => {
  describe("startConversationSchema", () => {
    it("accepts enquiry-linked, product-linked, and general conversation requests", () => {
      const parsed = startConversationSchema.parse({
        sellerId: SELLER_ID,
        enquiryId: ENQUIRY_ID,
        productId: "",
        subject: "  Makrana Gangsaw Lot\u0000 Inspection  ",
        initialMessage: "  Need 2,500 sq ft honed slabs.\nCan you share current lot photos?  ",
      });

      expect(parsed).toEqual({
        sellerId: SELLER_ID,
        enquiryId: ENQUIRY_ID,
        productId: null,
        subject: "Makrana Gangsaw Lot Inspection",
        initialMessage: "Need 2,500 sq ft honed slabs.\nCan you share current lot photos?",
      });
    });

    it("normalizes empty optional fields to null", () => {
      const parsed = startConversationSchema.parse({
        sellerId: SELLER_ID,
        productId: PRODUCT_ID,
      });

      expect(parsed.enquiryId).toBeNull();
      expect(parsed.productId).toBe(PRODUCT_ID);
      expect(parsed.subject).toBeNull();
      expect(parsed.initialMessage).toBeNull();
    });

    it("rejects non-UUID sellerId and oversized subject or initialMessage", () => {
      expect(startConversationSchema.safeParse({ sellerId: "seller-1" }).success).toBe(false);
      expect(
        startConversationSchema.safeParse({
          sellerId: SELLER_ID,
          subject: "S".repeat(201),
        }).success,
      ).toBe(false);
      expect(
        startConversationSchema.safeParse({
          sellerId: SELLER_ID,
          initialMessage: "M".repeat(4001),
        }).success,
      ).toBe(false);
    });
  });

  describe("sendMessageSchema", () => {
    it("accepts a plain text message and strips disallowed control characters", () => {
      const parsed = sendMessageSchema.parse({
        conversationId: CONV_ID,
        body: "  Confirming FOB Mundra\u0000\u0007 pricing\nLine 2\tOK  ",
        clientMessageId: CLIENT_MSG_ID,
      });

      expect(parsed.body).toBe("Confirming FOB Mundra pricing\nLine 2\tOK");
      expect(parsed.attachmentPath).toBeNull();
      expect(parsed.clientMessageId).toBe(CLIENT_MSG_ID);
    });

    it("accepts an attachment-only message for allowed MIME types", () => {
      for (const mime of [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ] as const) {
        const parsed = sendMessageSchema.parse({
          conversationId: CONV_ID,
          body: "   ",
          attachmentPath: `${CONV_ID}/1730000000-boq-drawing.pdf`,
          attachmentName: "BOQ Drawing Rev-2.pdf",
          attachmentMime: mime,
          attachmentSize: 512_000,
        });

        expect(parsed.body).toBe("");
        expect(parsed.attachmentMime).toBe(mime);
      }
    });

    it("accepts a combined text + attachment message", () => {
      const parsed = sendMessageSchema.parse({
        conversationId: CONV_ID,
        body: "Attached latest gangsaw slab inspection sheet.",
        attachmentPath: `${CONV_ID}/slab-lot-photo.webp`,
        attachmentName: "slab-lot-photo.webp",
        attachmentMime: "image/webp",
        attachmentSize: MAX_CHAT_ATTACHMENT_BYTES,
      });

      expect(parsed.body).toContain("gangsaw slab");
      expect(parsed.attachmentSize).toBe(MAX_CHAT_ATTACHMENT_BYTES);
    });

    it("rejects empty text when no attachment is provided", () => {
      const res = sendMessageSchema.safeParse({
        conversationId: CONV_ID,
        body: "   \n\t  ",
      });
      expect(res.success).toBe(false);
    });

    it("rejects messages exceeding 4,000 characters", () => {
      const res = sendMessageSchema.safeParse({
        conversationId: CONV_ID,
        body: "A".repeat(4001),
      });
      expect(res.success).toBe(false);
    });

    it("rejects incomplete attachment metadata", () => {
      const res = sendMessageSchema.safeParse({
        conversationId: CONV_ID,
        body: "Here is the file",
        attachmentPath: `${CONV_ID}/spec.pdf`,
        attachmentName: "spec.pdf",
        // Missing attachmentMime & attachmentSize
      });
      expect(res.success).toBe(false);
    });

    it("rejects unsupported MIME types and attachments over 10 MB", () => {
      expect(
        sendMessageSchema.safeParse({
          conversationId: CONV_ID,
          body: "",
          attachmentPath: `${CONV_ID}/payload.exe`,
          attachmentName: "payload.exe",
          attachmentMime: "application/x-msdownload",
          attachmentSize: 1024,
        }).success,
      ).toBe(false);

      expect(
        sendMessageSchema.safeParse({
          conversationId: CONV_ID,
          body: "",
          attachmentPath: `${CONV_ID}/huge.pdf`,
          attachmentName: "huge.pdf",
          attachmentMime: "application/pdf",
          attachmentSize: MAX_CHAT_ATTACHMENT_BYTES + 1,
        }).success,
      ).toBe(false);
    });

    it("rejects cross-conversation attachment paths and directory traversal", () => {
      expect(
        sendMessageSchema.safeParse({
          conversationId: CONV_ID,
          body: "Cross-conversation injection attempt",
          attachmentPath: `${OTHER_CONV_ID}/stolen.pdf`,
          attachmentName: "stolen.pdf",
          attachmentMime: "application/pdf",
          attachmentSize: 2048,
        }).success,
      ).toBe(false);

      expect(
        sendMessageSchema.safeParse({
          conversationId: CONV_ID,
          body: "Traversal attempt",
          attachmentPath: `${CONV_ID}/../${OTHER_CONV_ID}/stolen.pdf`,
          attachmentName: "stolen.pdf",
          attachmentMime: "application/pdf",
          attachmentSize: 2048,
        }).success,
      ).toBe(false);

      expect(
        sendMessageSchema.safeParse({
          conversationId: CONV_ID,
          body: "Backslash attempt",
          attachmentPath: `${CONV_ID}\\secret.pdf`,
          attachmentName: "secret.pdf",
          attachmentMime: "application/pdf",
          attachmentSize: 2048,
        }).success,
      ).toBe(false);
    });
  });

  describe("Inbox filter, cursor pagination & filename sanitization", () => {
    it("parses inbox filter defaults and clamps search input", () => {
      const defaults = conversationInboxFilterSchema.parse({});
      expect(defaults).toEqual({
        search: "",
        tab: "active",
        page: 1,
        pageSize: 25,
      });

      const custom = conversationInboxFilterSchema.parse({
        search: "  Makrana\u0000 Marble  ",
        tab: "unread",
        page: "2",
        pageSize: "20",
      });
      expect(custom).toEqual({
        search: "Makrana Marble",
        tab: "unread",
        page: 2,
        pageSize: 20,
      });
    });

    it("validates messageCursorQuerySchema, markConversationReadSchema & toggleArchiveConversationSchema", () => {
      const cursor = messageCursorQuerySchema.parse({
        conversationId: CONV_ID,
        beforeCreatedAt: "2026-10-30T15:30:00.000Z",
        beforeId: CLIENT_MSG_ID,
        limit: "25",
      });
      expect(cursor.limit).toBe(25);
      expect(cursor.beforeId).toBe(CLIENT_MSG_ID);

      expect(
        messageCursorQuerySchema.safeParse({
          conversationId: CONV_ID,
          beforeCreatedAt: "not-a-timestamp",
        }).success,
      ).toBe(false);

      expect(markConversationReadSchema.parse({ conversationId: CONV_ID }).conversationId).toBe(
        CONV_ID,
      );
      expect(
        toggleArchiveConversationSchema.parse({
          conversationId: CONV_ID,
          archived: true,
        }),
      ).toEqual({ conversationId: CONV_ID, archived: true });
    });

    it("sanitizes unsafe filenames against traversal and special characters", () => {
      expect(sanitizeAttachmentFilename("../../etc/passwd")).toBe("passwd");
      expect(sanitizeAttachmentFilename("C:\\Users\\Buyer\\BOQ #4 <script>.pdf")).toBe(
        "BOQ _4 _script_.pdf",
      );
      expect(sanitizeAttachmentFilename("   \u0000  ")).toBe("attachment");
    });
  });
});

