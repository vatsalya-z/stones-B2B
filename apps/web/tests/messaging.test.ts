import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetCurrentUser = vi.fn();
const mockGetSupabaseServerClient = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: () => mockGetSupabaseServerClient(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}));

import {
  computeMessageReadStatus,
  failOrRollbackOptimisticMessage,
  formatAttachmentSize,
  isImageAttachmentMime,
  mergeMessageBatch,
  reconcileIncomingMessage,
  type ThreadMessageItem,
} from "../features/messaging/messaging-utils";
import { POST as uploadChatAttachmentHandler } from "../app/api/messages/[conversationId]/attachments/route";
import { GET as refreshChatSignedUrlHandler } from "../app/api/messages/[conversationId]/attachments/signed-url/route";
import { middleware } from "../middleware";

const CONV_UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_CONV_UUID = "22222222-2222-4222-8222-222222222222";
const BUYER_UUID = "33333333-3333-4333-8333-333333333333";
const SELLER_USER_UUID = "44444444-4444-4444-8444-444444444444";
const SELLER_PROFILE_UUID = "55555555-5555-4555-8555-555555555555";
const INTRUDER_UUID = "66666666-6666-4666-8666-666666666666";
const CLIENT_MSG_UUID = "77777777-7777-4777-8777-777777777777";

function makeMessage(overrides: Partial<ThreadMessageItem> = {}): ThreadMessageItem {
  return {
    id: overrides.id ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    conversationId: CONV_UUID,
    senderId: BUYER_UUID,
    senderRole: "buyer",
    messageType: "text",
    body: "Sample message",
    attachmentPath: null,
    attachmentName: null,
    attachmentMime: null,
    attachmentSize: null,
    attachmentSignedUrl: null,
    clientMessageId: null,
    createdAt: "2026-10-30T12:00:00.000Z",
    deliveryState: "sent",
    ...overrides,
  };
}

function buildMockSupabase({
  conversation,
  sellerProfileId = null,
  uploadError = null,
  signedUrl = "https://rgmasamasslqintssyrh.supabase.co/storage/v1/object/sign/message-attachments/signed-token",
}: {
  conversation: { id: string; buyer_id: string; seller_id: string } | null;
  sellerProfileId?: string | null;
  uploadError?: { message: string } | null;
  signedUrl?: string | null;
}) {
  const uploadMock = vi.fn().mockResolvedValue({ data: { path: "ok" }, error: uploadError });
  const createSignedUrlMock = vi.fn().mockResolvedValue({
    data: signedUrl ? { signedUrl } : null,
    error: signedUrl ? null : { message: "Object not found" },
  });

  return {
    uploadMock,
    createSignedUrlMock,
    client: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === "conversations") {
                return { data: conversation, error: null };
              }
              if (table === "seller_profiles") {
                return {
                  data: sellerProfileId ? { id: sellerProfileId } : null,
                  error: null,
                };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
      storage: {
        from: () => ({
          upload: uploadMock,
          createSignedUrl: createSignedUrlMock,
        }),
      },
    },
  };
}

describe("Phase 6 Real-Time Messaging State, Attachment Security & Route Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Optimistic UI reconciliation, Realtime race deduplication & read receipts", () => {
    it("replaces an optimistic message seamlessly via clientMessageId and prevents Server Action + Realtime duplicates", () => {
      const optimistic = makeMessage({
        id: `optimistic-${CLIENT_MSG_UUID}`,
        clientMessageId: CLIENT_MSG_UUID,
        body: "Need 20mm calibrated Makrana slabs",
        attachmentPath: `${CONV_UUID}/spec.pdf`,
        attachmentName: "spec.pdf",
        attachmentMime: "application/pdf",
        attachmentSize: 40_960,
        attachmentSignedUrl: "https://signed.example/local-upload-url",
        deliveryState: "sending",
        createdAt: "2026-10-30T12:01:00.000Z",
      });

      // Raw Realtime INSERT arrives first (without signed URL)
      const realtimePayload = makeMessage({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        clientMessageId: CLIENT_MSG_UUID,
        body: "Need 20mm calibrated Makrana slabs",
        attachmentPath: `${CONV_UUID}/spec.pdf`,
        attachmentName: "spec.pdf",
        attachmentMime: "application/pdf",
        attachmentSize: 40_960,
        attachmentSignedUrl: null,
        createdAt: "2026-10-30T12:01:00.250Z",
      });

      const afterRealtime = reconcileIncomingMessage([optimistic], realtimePayload);
      expect(afterRealtime).toHaveLength(1);
      expect(afterRealtime[0]!.id).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
      expect(afterRealtime[0]!.deliveryState).toBe("sent");
      // Preserves optimistic attachmentSignedUrl!
      expect(afterRealtime[0]!.attachmentSignedUrl).toBe(
        "https://signed.example/local-upload-url",
      );

      // Server Action response arrives second -> still 1 item, zero duplicate rendering
      const serverActionConfirmed = makeMessage({
        ...realtimePayload,
        attachmentSignedUrl: "https://signed.example/server-action-url",
      });
      const afterAction = reconcileIncomingMessage(afterRealtime, serverActionConfirmed);
      expect(afterAction).toHaveLength(1);
      expect(afterAction[0]!.attachmentSignedUrl).toBe(
        "https://signed.example/server-action-url",
      );
    });

    it("merges older cursor pages and reconnect deltas in strict chronological order without duplicates", () => {
      const m2 = makeMessage({
        id: "22222222-0000-4000-8000-000000000002",
        body: "Second",
        createdAt: "2026-10-30T12:02:00.000Z",
      });
      const m3 = makeMessage({
        id: "33333333-0000-4000-8000-000000000003",
        body: "Third",
        createdAt: "2026-10-30T12:03:00.000Z",
      });
      const m1Older = makeMessage({
        id: "11111111-0000-4000-8000-000000000001",
        body: "First (older page)",
        createdAt: "2026-10-30T12:01:00.000Z",
      });

      const merged = mergeMessageBatch([m2, m3], [m1Older, m2]);
      expect(merged.map((m) => m.body)).toEqual(["First (older page)", "Second", "Third"]);
    });

    it("marks failed optimistic messages for retry and supports clean rollback discard", () => {
      const optimistic = makeMessage({
        id: `opt-${CLIENT_MSG_UUID}`,
        clientMessageId: CLIENT_MSG_UUID,
        deliveryState: "sending",
      });

      const failed = failOrRollbackOptimisticMessage([optimistic], CLIENT_MSG_UUID, {
        errorMessage: "Network timeout",
      });
      expect(failed[0]!.deliveryState).toBe("failed");
      expect(failed[0]!.errorMessage).toBe("Network timeout");

      const rolledBack = failOrRollbackOptimisticMessage(failed, CLIENT_MSG_UUID, {
        remove: true,
      });
      expect(rolledBack).toHaveLength(0);
    });

    it("computes accurate read receipt statuses and formatting helpers", () => {
      const outgoing = makeMessage({
        senderRole: "buyer",
        createdAt: "2026-10-30T12:05:00.000Z",
      });
      const incomingFromSeller = makeMessage({
        senderRole: "seller",
        createdAt: "2026-10-30T12:06:00.000Z",
      });

      // Counterparty messages don't show outgoing read ticks
      expect(computeMessageReadStatus(incomingFromSeller, "buyer", null)).toBeNull();
      // Outgoing unread
      expect(computeMessageReadStatus(outgoing, "buyer", null)).toBe("sent");
      expect(
        computeMessageReadStatus(outgoing, "buyer", "2026-10-30T12:04:59.000Z"),
      ).toBe("sent");
      // Outgoing read once counterparty_last_read_at >= message.created_at
      expect(
        computeMessageReadStatus(outgoing, "buyer", "2026-10-30T12:05:00.000Z"),
      ).toBe("read");

      expect(isImageAttachmentMime("image/webp")).toBe(true);
      expect(isImageAttachmentMime("application/pdf")).toBe(false);
      expect(formatAttachmentSize(512)).toBe("512 B");
      expect(formatAttachmentSize(153_600)).toBe("150.0 KB");
      expect(formatAttachmentSize(2 * 1024 * 1024)).toBe("2.00 MB");
    });
  });

  describe("2. Private Chat Attachment Upload & Signed URL Route Handlers", () => {
    it("rejects invalid UUIDs, unauthenticated users, and non-participants on upload", async () => {
      // 400 Invalid UUID
      const badReq = new NextRequest("http://localhost:3001/api/messages/not-a-uuid/attachments", {
        method: "POST",
      });
      const badRes = await uploadChatAttachmentHandler(badReq, {
        params: Promise.resolve({ conversationId: "not-a-uuid" }),
      });
      expect(badRes.status).toBe(400);

      // 401 Unauthenticated
      mockGetCurrentUser.mockResolvedValueOnce(null);
      const unauthReq = new NextRequest(
        `http://localhost:3001/api/messages/${CONV_UUID}/attachments`,
        { method: "POST" },
      );
      const unauthRes = await uploadChatAttachmentHandler(unauthReq, {
        params: Promise.resolve({ conversationId: CONV_UUID }),
      });
      expect(unauthRes.status).toBe(401);

      // 403 Non-participant
      mockGetCurrentUser.mockResolvedValueOnce({ id: INTRUDER_UUID });
      const mockSb = buildMockSupabase({
        conversation: {
          id: CONV_UUID,
          buyer_id: BUYER_UUID,
          seller_id: SELLER_PROFILE_UUID,
        },
        sellerProfileId: null,
      });
      mockGetSupabaseServerClient.mockResolvedValueOnce(mockSb.client);

      const formData = new FormData();
      formData.append(
        "file",
        new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "boq.pdf", {
          type: "application/pdf",
        }),
      );
      const forbiddenReq = new NextRequest(
        `http://localhost:3001/api/messages/${CONV_UUID}/attachments`,
        { method: "POST", body: formData },
      );
      const forbiddenRes = await uploadChatAttachmentHandler(forbiddenReq, {
        params: Promise.resolve({ conversationId: CONV_UUID }),
      });
      expect(forbiddenRes.status).toBe(403);
      expect(mockSb.uploadMock).not.toHaveBeenCalled();
    });

    it("rejects spoofed executable magic bytes disguised as a PDF attachment", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: BUYER_UUID });
      const mockSb = buildMockSupabase({
        conversation: {
          id: CONV_UUID,
          buyer_id: BUYER_UUID,
          seller_id: SELLER_PROFILE_UUID,
        },
      });
      mockGetSupabaseServerClient.mockResolvedValueOnce(mockSb.client);

      // Windows PE executable header 'MZ' disguised as application/pdf
      const spoofedBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const formData = new FormData();
      formData.append(
        "file",
        new File([spoofedBytes], "quotation-spec.pdf", { type: "application/pdf" }),
      );

      const req = new NextRequest(
        `http://localhost:3001/api/messages/${CONV_UUID}/attachments`,
        { method: "POST", body: formData },
      );
      const res = await uploadChatAttachmentHandler(req, {
        params: Promise.resolve({ conversationId: CONV_UUID }),
      });

      expect(res.status).toBe(400);
      expect(mockSb.uploadMock).not.toHaveBeenCalled();
    });

    it("uploads valid PDF and PNG files under <conversationId>/... with private Cache-Control for both Buyer and Seller", async () => {
      // Seller participant uploading a genuine PDF (%PDF-1.7)
      mockGetCurrentUser.mockResolvedValueOnce({ id: SELLER_USER_UUID });
      const mockSb = buildMockSupabase({
        conversation: {
          id: CONV_UUID,
          buyer_id: BUYER_UUID,
          seller_id: SELLER_PROFILE_UUID,
        },
        sellerProfileId: SELLER_PROFILE_UUID,
      });
      mockGetSupabaseServerClient.mockResolvedValueOnce(mockSb.client);

      const pdfBytes = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
      const formData = new FormData();
      formData.append(
        "file",
        new File([pdfBytes], "Slab Inspection Report.pdf", { type: "application/pdf" }),
      );

      const req = new NextRequest(
        `http://localhost:3001/api/messages/${CONV_UUID}/attachments`,
        { method: "POST", body: formData },
      );
      const res = await uploadChatAttachmentHandler(req, {
        params: Promise.resolve({ conversationId: CONV_UUID }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");

      const json = (await res.json()) as {
        attachmentPath: string;
        attachmentName: string;
        attachmentMime: string;
        attachmentSize: number;
        signedUrl: string;
      };
      expect(json.attachmentPath.startsWith(`${CONV_UUID}/`)).toBe(true);
      expect(json.attachmentPath.endsWith(".pdf")).toBe(true);
      expect(json.attachmentMime).toBe("application/pdf");
      expect(json.attachmentSize).toBe(pdfBytes.byteLength);
      expect(json.signedUrl).toContain("signed-token");
    });

    it("enforces path isolation and participant authorization on GET /signed-url refresh", async () => {
      // Cross-conversation path rejected with 400
      const crossReq = new NextRequest(
        `http://localhost:3001/api/messages/${CONV_UUID}/attachments/signed-url?path=${encodeURIComponent(`${OTHER_CONV_UUID}/secret.pdf`)}`,
      );
      const crossRes = await refreshChatSignedUrlHandler(crossReq, {
        params: Promise.resolve({ conversationId: CONV_UUID }),
      });
      expect(crossRes.status).toBe(400);

      // Traversal path rejected with 400
      const traversalReq = new NextRequest(
        `http://localhost:3001/api/messages/${CONV_UUID}/attachments/signed-url?path=${encodeURIComponent(`${CONV_UUID}/../secret.pdf`)}`,
      );
      const traversalRes = await refreshChatSignedUrlHandler(traversalReq, {
        params: Promise.resolve({ conversationId: CONV_UUID }),
      });
      expect(traversalRes.status).toBe(400);

      // Authorized buyer receives fresh 600s signed URL
      mockGetCurrentUser.mockResolvedValueOnce({ id: BUYER_UUID });
      const mockSb = buildMockSupabase({
        conversation: {
          id: CONV_UUID,
          buyer_id: BUYER_UUID,
          seller_id: SELLER_PROFILE_UUID,
        },
      });
      mockGetSupabaseServerClient.mockResolvedValueOnce(mockSb.client);

      const validReq = new NextRequest(
        `http://localhost:3001/api/messages/${CONV_UUID}/attachments/signed-url?path=${encodeURIComponent(`${CONV_UUID}/173000-boq.pdf`)}`,
      );
      const validRes = await refreshChatSignedUrlHandler(validReq, {
        params: Promise.resolve({ conversationId: CONV_UUID }),
      });
      expect(validRes.status).toBe(200);
      expect(validRes.headers.get("Cache-Control")).toBe("private, no-store");
      const body = (await validRes.json()) as { signedUrl: string; expiresInSeconds: number };
      expect(body.expiresInSeconds).toBe(600);
      expect(body.signedUrl).toContain("signed-token");
    });
  });

  describe("3. Middleware Route Protection for Buyer & Seller Messaging and Notifications", () => {
    it("redirects unauthenticated visitors from messaging and notification routes to /login?next=...", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://rgmasamasslqintssyrh.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";

      for (const protectedPath of [
        "/buyer/messages",
        `/buyer/messages/${CONV_UUID}`,
        "/seller/messages",
        `/seller/messages/${CONV_UUID}`,
        "/seller/notifications",
      ]) {
        const req = new NextRequest(`http://localhost:3001${protectedPath}`);
        const res = await middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location") ?? "";
        expect(location).toContain(`/login?next=${encodeURIComponent(protectedPath)}`);
      }
    });
  });
});

