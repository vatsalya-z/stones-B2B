"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, VerifiedBadge, cn } from "@stone/ui";
import { MAX_CHAT_ATTACHMENT_BYTES, type ChatAttachmentMime } from "@stone/types";
import { formatMoney } from "@stone/utils";
import {
  loadOlderMessagesAction,
  markConversationReadAction,
  sendMessageAction,
  syncMissedMessagesAction,
  toggleArchiveConversationAction,
} from "@/features/messaging/actions";
import {
  computeMessageReadStatus,
  failOrRollbackOptimisticMessage,
  formatAttachmentSize,
  mergeMessageBatch,
  reconcileIncomingMessage,
  type ThreadMessageItem,
} from "@/features/messaging/messaging-utils";
import type {
  ConversationThreadViewData,
  MessagePageCursor,
} from "@/features/messaging/queries";
import { useRealtimeConversationThread } from "@/features/messaging/use-realtime-messaging";
import { MessageAttachmentCard } from "./message-attachment-card";

interface StagedAttachment {
  attachmentPath: string;
  attachmentName: string;
  attachmentMime: ChatAttachmentMime;
  attachmentSize: number;
  signedUrl: string | null;
}

export interface ConversationThreadProps {
  initialData: ConversationThreadViewData;
}

function createClientUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const todayKey = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === todayKey) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationThread({ initialData }: ConversationThreadProps) {
  const router = useRouter();
  const { conversation, viewerRole, viewerUserId } = initialData;
  const basePath = viewerRole === "buyer" ? "/buyer/messages" : "/seller/messages";

  const [messages, setMessages] = useState<ThreadMessageItem[]>(initialData.messages);
  const [hasOlderMessages, setHasOlderMessages] = useState(initialData.hasOlderMessages);
  const [nextCursor, setNextCursor] = useState<MessagePageCursor | null>(
    initialData.nextCursor,
  );
  const [counterpartyLastReadAt, setCounterpartyLastReadAt] = useState<string | null>(
    conversation.counterpartyLastReadAt,
  );
  const [isArchived, setIsArchived] = useState(conversation.isArchived);

  const [composerText, setComposerText] = useState("");
  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isArchivePending, startArchiveTransition] = useTransition();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latestTimestampRef = useRef<string | null>(
    initialData.messages[initialData.messages.length - 1]?.createdAt ?? null,
  );

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.createdAt) {
      latestTimestampRef.current = last.createdAt;
    }
  }, [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomAnchorRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // Mark conversation read on open
  useEffect(() => {
    void markConversationReadAction(conversation.id, viewerRole);
    scrollToBottom("auto");
  }, [conversation.id, viewerRole, scrollToBottom]);

  const handleIncomingRealtimeMessage = useCallback(
    (incoming: ThreadMessageItem) => {
      setMessages((prev) => reconcileIncomingMessage(prev, incoming));

      if (incoming.senderRole !== viewerRole) {
        if (typeof document === "undefined" || document.visibilityState === "visible") {
          void markConversationReadAction(conversation.id, viewerRole);
        }
      }

      setTimeout(() => scrollToBottom("smooth"), 40);
    },
    [conversation.id, viewerRole, scrollToBottom],
  );

  const handleReconnectResync = useCallback(async () => {
    const res = await syncMissedMessagesAction(
      {
        conversationId: conversation.id,
        afterCreatedAt: latestTimestampRef.current,
      },
      viewerRole,
    );
    if (!res.ok) return;

    if (res.messages.length > 0) {
      setMessages((prev) => mergeMessageBatch(prev, res.messages));
      const hasCounterpartyNew = res.messages.some((m) => m.senderRole !== viewerRole);
      if (hasCounterpartyNew) {
        void markConversationReadAction(conversation.id, viewerRole);
      }
    }
    if (res.counterpartyLastReadAt) {
      setCounterpartyLastReadAt(res.counterpartyLastReadAt);
    }
  }, [conversation.id, viewerRole]);

  const connectionStatus = useRealtimeConversationThread({
    conversationId: conversation.id,
    viewerRole,
    onIncomingMessage: handleIncomingRealtimeMessage,
    onCounterpartyReadUpdate: (nextReadAt) => {
      if (nextReadAt) setCounterpartyLastReadAt(nextReadAt);
    },
    onReconnectResync: () => {
      void handleReconnectResync();
    },
  });

  const handleLoadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);

    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    try {
      const res = await loadOlderMessagesAction(
        {
          conversationId: conversation.id,
          beforeCreatedAt: nextCursor.beforeCreatedAt,
          beforeId: nextCursor.beforeId,
          limit: 30,
        },
        viewerRole,
      );

      if (res.ok) {
        setMessages((prev) => mergeMessageBatch(res.messages, prev));
        setHasOlderMessages(res.hasOlderMessages);
        setNextCursor(res.nextCursor);

        requestAnimationFrame(() => {
          if (container) {
            const diff = container.scrollHeight - prevScrollHeight;
            container.scrollTop = diff;
          }
        });
      }
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setComposerError(null);

    if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
      setComposerError("Attachment exceeds the 10 MB limit. Please choose a smaller PDF or image.");
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/messages/${conversation.id}/attachments`, {
        method: "POST",
        body: formData,
      });

      const body = (await res.json()) as {
        error?: string;
        attachmentPath?: string;
        attachmentName?: string;
        attachmentMime?: ChatAttachmentMime;
        attachmentSize?: number;
        signedUrl?: string | null;
      };

      if (!res.ok || !body.attachmentPath || !body.attachmentMime || !body.attachmentSize) {
        setComposerError(body.error ?? "Failed to upload attachment.");
        return;
      }

      setStagedAttachment({
        attachmentPath: body.attachmentPath,
        attachmentName: body.attachmentName ?? file.name,
        attachmentMime: body.attachmentMime,
        attachmentSize: body.attachmentSize,
        signedUrl: body.signedUrl ?? null,
      });
    } catch {
      setComposerError("Network error while uploading attachment. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  };

  const dispatchMessage = async (params: {
    text: string;
    attachment: StagedAttachment | null;
    clientMessageId: string;
  }) => {
    const optimisticMsg: ThreadMessageItem = {
      id: `optimistic-${params.clientMessageId}`,
      conversationId: conversation.id,
      senderId: viewerUserId,
      senderRole: viewerRole,
      messageType: params.attachment ? "attachment" : "text",
      body: params.text,
      attachmentPath: params.attachment?.attachmentPath ?? null,
      attachmentName: params.attachment?.attachmentName ?? null,
      attachmentMime: params.attachment?.attachmentMime ?? null,
      attachmentSize: params.attachment?.attachmentSize ?? null,
      attachmentSignedUrl: params.attachment?.signedUrl ?? null,
      clientMessageId: params.clientMessageId,
      createdAt: new Date().toISOString(),
      deliveryState: "sending",
    };

    setMessages((prev) => reconcileIncomingMessage(prev, optimisticMsg));
    setTimeout(() => scrollToBottom("smooth"), 20);

    try {
      const res = await sendMessageAction(
        {
          conversationId: conversation.id,
          body: params.text,
          attachmentPath: params.attachment?.attachmentPath ?? null,
          attachmentName: params.attachment?.attachmentName ?? null,
          attachmentMime: params.attachment?.attachmentMime ?? null,
          attachmentSize: params.attachment?.attachmentSize ?? null,
          clientMessageId: params.clientMessageId,
        },
        viewerRole,
      );

      if (!res.ok) {
        setMessages((prev) =>
          failOrRollbackOptimisticMessage(prev, params.clientMessageId, {
            errorMessage: res.error,
          }),
        );
        setComposerError(res.error);
        return;
      }

      setMessages((prev) => reconcileIncomingMessage(prev, res.message));
      setIsArchived(false);
    } catch {
      setMessages((prev) =>
        failOrRollbackOptimisticMessage(prev, params.clientMessageId, {
          errorMessage: "Connection lost while sending. Tap Retry to resend.",
        }),
      );
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (uploadingFile) return;

    const trimmed = composerText.trim();
    if (!trimmed && !stagedAttachment) return;

    setComposerError(null);
    const attachmentToSend = stagedAttachment;
    const clientMessageId = createClientUuid();

    setComposerText("");
    setStagedAttachment(null);

    await dispatchMessage({
      text: trimmed,
      attachment: attachmentToSend,
      clientMessageId,
    });
  };

  const handleRetryFailed = async (failedMsg: ThreadMessageItem) => {
    if (!failedMsg.clientMessageId) return;
    setComposerError(null);
    await dispatchMessage({
      text: failedMsg.body,
      attachment:
        failedMsg.attachmentPath &&
        failedMsg.attachmentMime &&
        failedMsg.attachmentSize
          ? {
              attachmentPath: failedMsg.attachmentPath,
              attachmentName: failedMsg.attachmentName ?? "Attachment",
              attachmentMime: failedMsg.attachmentMime,
              attachmentSize: failedMsg.attachmentSize,
              signedUrl: failedMsg.attachmentSignedUrl,
            }
          : null,
      clientMessageId: failedMsg.clientMessageId,
    });
  };

  const handleDiscardFailed = (clientMessageId: string | null) => {
    if (!clientMessageId) return;
    setMessages((prev) =>
      failOrRollbackOptimisticMessage(prev, clientMessageId, { remove: true }),
    );
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleToggleArchive = () => {
    startArchiveTransition(async () => {
      const next = !isArchived;
      const res = await toggleArchiveConversationAction(conversation.id, next, viewerRole);
      if (res.ok) {
        setIsArchived(next);
        router.refresh();
      }
    });
  };

  const counterpartyInitials = conversation.counterparty.displayName
    .charAt(0)
    .toUpperCase();

  return (
    <div className="space-y-4">
      {/* Top Thread Header */}
      <Card className="overflow-hidden">
        <div className="border-b border-stone-200 bg-white px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={basePath}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                aria-label="Back to messages inbox"
              >
                ←
              </Link>

              <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-sm font-bold text-stone-800">
                {conversation.counterparty.avatarUrl ? (
                  <Image
                    src={conversation.counterparty.avatarUrl}
                    alt={conversation.counterparty.displayName}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <span>{counterpartyInitials}</span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {conversation.counterparty.slug ? (
                    <Link
                      href={`/suppliers/${conversation.counterparty.slug}`}
                      className="truncate text-sm font-bold text-stone-950 hover:text-amber-700 hover:underline"
                    >
                      {conversation.counterparty.displayName}
                    </Link>
                  ) : (
                    <h1 className="truncate text-sm font-bold text-stone-950">
                      {conversation.counterparty.displayName}
                    </h1>
                  )}
                  {conversation.counterparty.isVerified && <VerifiedBadge />}
                </div>
                <p className="truncate text-xs text-stone-500">
                  {conversation.subject}
                  {conversation.counterparty.location
                    ? ` · ${conversation.counterparty.location}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              {/* Live Realtime Connection Pill */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  connectionStatus === "live" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-800",
                  connectionStatus === "connecting" &&
                    "border-stone-200 bg-stone-50 text-stone-600",
                  connectionStatus === "reconnecting" &&
                    "border-amber-200 bg-amber-50 text-amber-800",
                  connectionStatus === "offline" &&
                    "border-red-200 bg-red-50 text-red-700",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    connectionStatus === "live" && "bg-emerald-600",
                    connectionStatus === "connecting" && "bg-stone-400",
                    connectionStatus === "reconnecting" && "bg-amber-600 animate-pulse",
                    connectionStatus === "offline" && "bg-red-600",
                  )}
                />
                {connectionStatus === "live"
                  ? "Live"
                  : connectionStatus === "reconnecting"
                    ? "Reconnecting..."
                    : connectionStatus === "offline"
                      ? "Offline"
                      : "Connecting"}
              </span>

              <button
                type="button"
                onClick={handleToggleArchive}
                disabled={isArchivePending}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {isArchived ? "Unarchive" : "Archive"}
              </button>
            </div>
          </div>
        </div>

        {/* Linked Commercial Context Bar (Product / Enquiry / Quotation) */}
        {(conversation.product || conversation.enquiry) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/90 px-4 py-2.5 text-xs sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              {conversation.product && (
                <Link
                  href={`/products/${conversation.product.slug}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 font-medium text-stone-800 hover:border-amber-400"
                >
                  <span className="relative h-6 w-6 overflow-hidden rounded bg-stone-100">
                    <Image
                      src={conversation.product.thumbnailUrl}
                      alt={conversation.product.name}
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  </span>
                  <span className="max-w-[180px] truncate font-semibold">
                    {conversation.product.name}
                  </span>
                </Link>
              )}

              {conversation.enquiry && (
                <Link
                  href={
                    viewerRole === "buyer"
                      ? `/buyer/enquiries/${conversation.enquiry.id}`
                      : `/seller/enquiries/${conversation.enquiry.id}`
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-stone-800 hover:border-amber-400"
                >
                  <span className="font-semibold">
                    Enquiry: {conversation.enquiry.quantity.toLocaleString("en-IN")}{" "}
                    {conversation.enquiry.unit.replace(/_/g, " ")}
                  </span>
                  <Badge variant="secondary">{conversation.enquiry.status}</Badge>
                </Link>
              )}

              {conversation.enquiry?.latestQuotation && (
                <Link
                  href={
                    viewerRole === "buyer"
                      ? `/buyer/quotes/${conversation.enquiry.latestQuotation.id}`
                      : `/seller/quotes/${conversation.enquiry.latestQuotation.id}`
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-950 hover:bg-amber-100"
                >
                  <span className="font-bold">
                    {conversation.enquiry.latestQuotation.quoteNumber}
                  </span>
                  <span>
                    {formatMoney(
                      conversation.enquiry.latestQuotation.totalAmount,
                      conversation.enquiry.latestQuotation.currency,
                    )}
                  </span>
                  <Badge variant="default">
                    {conversation.enquiry.latestQuotation.status}
                  </Badge>
                </Link>
              )}
            </div>

            {viewerRole === "seller" &&
              conversation.enquiry &&
              ["submitted", "viewed", "responding", "quoted"].includes(
                conversation.enquiry.status,
              ) && (
                <Link
                  href={`/seller/quotes/new?enquiryId=${conversation.enquiry.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
                >
                  Send Quotation →
                </Link>
              )}
          </div>
        )}

        {/* Scrollable Message History */}
        <div
          ref={scrollContainerRef}
          className="h-[56vh] min-h-[380px] max-h-[620px] overflow-y-auto bg-stone-50/60 px-4 py-5 sm:px-6"
        >
          {hasOlderMessages && (
            <div className="mb-5 flex justify-center">
              <button
                type="button"
                onClick={handleLoadOlder}
                disabled={loadingOlder}
                className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 disabled:opacity-50"
              >
                {loadingOlder ? "Loading older messages..." : "Load older messages"}
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="max-w-sm space-y-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                <p className="text-sm font-bold text-stone-900">
                  Start your trade conversation
                </p>
                <p className="text-xs leading-relaxed text-stone-500">
                  Share slab dimensions, finish requirements, delivery city, BOQ PDFs, or
                  inspection photos. Messages and files are private to you and{" "}
                  {conversation.counterparty.displayName}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const dayLabel = formatDayLabel(msg.createdAt);
                const prevDayLabel = prevMsg ? formatDayLabel(prevMsg.createdAt) : null;
                const showDayDivider = dayLabel && dayLabel !== prevDayLabel;

                const isOwn = msg.senderRole === viewerRole;
                const readStatus = computeMessageReadStatus(
                  msg,
                  viewerRole,
                  counterpartyLastReadAt,
                );

                return (
                  <div key={msg.clientMessageId ?? msg.id} className="space-y-3">
                    {showDayDivider && (
                      <div className="flex items-center justify-center py-1">
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-0.5 text-[11px] font-medium text-stone-500">
                          {dayLabel}
                        </span>
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex flex-col",
                        isOwn ? "items-end" : "items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-3 shadow-xs space-y-2",
                          isOwn
                            ? "rounded-br-md bg-stone-900 text-white"
                            : "rounded-bl-md border border-stone-200 bg-white text-stone-900",
                          msg.deliveryState === "failed" &&
                            "ring-2 ring-red-500/70 bg-stone-900/90",
                        )}
                      >
                        {msg.attachmentPath && (
                          <MessageAttachmentCard
                            conversationId={conversation.id}
                            attachmentPath={msg.attachmentPath}
                            attachmentName={msg.attachmentName}
                            attachmentMime={msg.attachmentMime}
                            attachmentSize={msg.attachmentSize}
                            initialSignedUrl={msg.attachmentSignedUrl}
                            isOwnMessage={isOwn}
                          />
                        )}

                        {msg.body.trim().length > 0 && (
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {msg.body}
                          </p>
                        )}
                      </div>

                      {/* Timestamp & Read Receipt Row */}
                      <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-stone-400">
                        <span>{formatTimeShort(msg.createdAt)}</span>
                        {isOwn && readStatus === "sending" && (
                          <span className="text-stone-400">· Sending...</span>
                        )}
                        {isOwn && readStatus === "sent" && (
                          <span className="text-stone-500">· Sent ✓</span>
                        )}
                        {isOwn && readStatus === "read" && (
                          <span className="font-semibold text-amber-700">· Read ✓✓</span>
                        )}
                        {isOwn && readStatus === "failed" && (
                          <span className="flex items-center gap-2 font-semibold text-red-600">
                            <span>· Failed</span>
                            <button
                              type="button"
                              onClick={() => void handleRetryFailed(msg)}
                              className="underline hover:text-red-700"
                            >
                              Retry
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDiscardFailed(msg.clientMessageId)}
                              className="text-stone-500 underline hover:text-stone-700"
                            >
                              Discard
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div ref={bottomAnchorRef} />
        </div>

        {/* Composer Footer */}
        <div className="border-t border-stone-200 bg-white p-3.5 sm:p-4">
          {composerError && (
            <div
              role="alert"
              className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700"
            >
              <span>{composerError}</span>
              <button
                type="button"
                onClick={() => setComposerError(null)}
                className="font-bold text-red-800 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {stagedAttachment && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-900">
                  Attached: {stagedAttachment.attachmentName}
                </p>
                <p className="text-[11px] text-stone-500">
                  {stagedAttachment.attachmentMime === "application/pdf"
                    ? "PDF Document"
                    : "Image"}{" "}
                  · {formatAttachmentSize(stagedAttachment.attachmentSize)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStagedAttachment(null)}
                className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Remove
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-end gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-stone-50 text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
              title="Attach stone image or PDF specification (max 10 MB)"
              aria-label="Attach file"
            >
              {uploadingFile ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-stone-800" />
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.85}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                  />
                </svg>
              )}
            </button>

            <div className="flex-1">
              <textarea
                rows={2}
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                maxLength={4000}
                placeholder={
                  uploadingFile
                    ? "Uploading attachment securely..."
                    : "Write a message... (Enter to send, Shift+Enter for new line)"
                }
                aria-label="Message body"
                className="block w-full resize-none rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/15"
              />
            </div>

            <button
              type="submit"
              disabled={
                uploadingFile || (!composerText.trim() && !stagedAttachment)
              }
              className="inline-flex h-11 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Send</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>

          <p className="mt-1.5 text-[11px] text-stone-400">
            Supports JPG, PNG, WebP slab photos & PDF drawings/BOQs up to 10 MB · Private encrypted storage
          </p>
        </div>
      </Card>
    </div>
  );
}
