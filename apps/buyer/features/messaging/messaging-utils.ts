import type { ChatAttachmentMime, MessageSenderRole, MessageType } from "@stone/types";

export interface ThreadMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  messageType: MessageType;
  body: string;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentMime: ChatAttachmentMime | null;
  attachmentSize: number | null;
  attachmentSignedUrl: string | null;
  clientMessageId: string | null;
  createdAt: string;
  deliveryState?: "sending" | "sent" | "failed";
  errorMessage?: string;
}

/**
 * Reconciles an incoming message (from Server Action response, Realtime INSERT,
 * or reconnection delta sync) into the current chronological message list.
 *
 * Guarantees:
 * - Zero duplicate entries even if Server Action response and Realtime INSERT race.
 * - Seamless replacement of optimistic (`deliveryState === "sending"`) message
 *   matched by `clientMessageId`.
 * - Preserves existing `attachmentSignedUrl` when a raw Realtime payload lacks a signed URL.
 * - Maintains strict `(createdAt ASC, id ASC)` ordering.
 */
export function reconcileIncomingMessage(
  existing: ThreadMessageItem[],
  incoming: ThreadMessageItem,
): ThreadMessageItem[] {
  let matched = false;
  const next = existing.map((item) => {
    const sameId = item.id === incoming.id;
    const sameClientId =
      Boolean(incoming.clientMessageId) &&
      Boolean(item.clientMessageId) &&
      item.clientMessageId === incoming.clientMessageId;

    if (sameId || sameClientId) {
      matched = true;
      return {
        ...incoming,
        attachmentSignedUrl: incoming.attachmentSignedUrl ?? item.attachmentSignedUrl,
        deliveryState: incoming.deliveryState ?? "sent",
        errorMessage: undefined,
      };
    }
    return item;
  });

  if (!matched) {
    next.push({
      ...incoming,
      deliveryState: incoming.deliveryState ?? "sent",
    });
  }

  return sortMessagesChronologically(next);
}

/**
 * Merges a batch of messages (e.g. older cursor page or reconnect delta)
 * without duplicating any `id` or `clientMessageId`.
 */
export function mergeMessageBatch(
  existing: ThreadMessageItem[],
  batch: ThreadMessageItem[],
): ThreadMessageItem[] {
  let result = existing;
  for (const msg of batch) {
    result = reconcileIncomingMessage(result, msg);
  }
  return result;
}

/**
 * Marks an optimistic message as failed (for inline retry/discard) or removes it
 * when `remove = true`.
 */
export function failOrRollbackOptimisticMessage(
  existing: ThreadMessageItem[],
  clientMessageId: string,
  options: { remove?: boolean; errorMessage?: string } = {},
): ThreadMessageItem[] {
  if (options.remove) {
    return existing.filter((m) => m.clientMessageId !== clientMessageId);
  }
  return existing.map((m) =>
    m.clientMessageId === clientMessageId
      ? {
          ...m,
          deliveryState: "failed",
          errorMessage: options.errorMessage ?? "Failed to send message. Tap retry.",
        }
      : m,
  );
}

export function sortMessagesChronologically(
  items: ThreadMessageItem[],
): ThreadMessageItem[] {
  return [...items].sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

export function computeMessageReadStatus(
  msg: Pick<ThreadMessageItem, "senderRole" | "createdAt" | "deliveryState">,
  viewerRole: MessageSenderRole,
  counterpartyLastReadAt: string | null,
): "sending" | "failed" | "sent" | "read" | null {
  if (msg.senderRole !== viewerRole) return null;
  if (msg.deliveryState === "sending") return "sending";
  if (msg.deliveryState === "failed") return "failed";
  if (!counterpartyLastReadAt) return "sent";

  const msgTime = new Date(msg.createdAt).getTime();
  const readTime = new Date(counterpartyLastReadAt).getTime();
  if (Number.isFinite(msgTime) && Number.isFinite(readTime) && readTime >= msgTime) {
    return "read";
  }
  return "sent";
}

export function isImageAttachmentMime(mime: string | null | undefined): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

export function formatAttachmentSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

