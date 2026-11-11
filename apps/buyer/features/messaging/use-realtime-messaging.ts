"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@stone/database/browser";
import type { Database } from "@stone/database";
import type { ChatAttachmentMime, MessageSenderRole, MessageType } from "@stone/types";
import type { ThreadMessageItem } from "./messaging-utils";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];

export type RealtimeConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline";

export interface UseRealtimeConversationThreadOptions {
  conversationId: string;
  viewerRole: MessageSenderRole;
  onIncomingMessage: (msg: ThreadMessageItem) => void;
  onCounterpartyReadUpdate: (lastReadAt: string | null) => void;
  onReconnectResync: () => void;
}

export function useRealtimeConversationThread({
  conversationId,
  viewerRole,
  onIncomingMessage,
  onCounterpartyReadUpdate,
  onReconnectResync,
}: UseRealtimeConversationThreadOptions): RealtimeConnectionStatus {
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");

  const incomingRef = useRef(onIncomingMessage);
  const readUpdateRef = useRef(onCounterpartyReadUpdate);
  const resyncRef = useRef(onReconnectResync);
  const hadConnectedOnceRef = useRef(false);

  useEffect(() => {
    incomingRef.current = onIncomingMessage;
    readUpdateRef.current = onCounterpartyReadUpdate;
    resyncRef.current = onReconnectResync;
  });

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setStatus("offline");
      return;
    }

    let cancelled = false;
    hadConnectedOnceRef.current = false;

    const channel = supabase
      .channel(`stone-thread-${conversationId}-${viewerRole}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (cancelled) return;
          const row = payload.new as MessageRow;
          if (!row?.id) return;

          let signedUrl: string | null = null;
          if (row.attachment_path) {
            try {
              const res = await fetch(
                `/api/messages/${conversationId}/attachments/signed-url?path=${encodeURIComponent(
                  row.attachment_path,
                )}`,
                { cache: "no-store" },
              );
              if (res.ok) {
                const body = (await res.json()) as { signedUrl?: string };
                signedUrl = body.signedUrl ?? null;
              }
            } catch {
              signedUrl = null;
            }
          }

          if (cancelled) return;

          incomingRef.current({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            senderRole: row.sender_role as MessageSenderRole,
            messageType: row.message_type as MessageType,
            body: row.body ?? "",
            attachmentPath: row.attachment_path ?? null,
            attachmentName: row.attachment_name ?? null,
            attachmentMime: (row.attachment_mime as ChatAttachmentMime | null) ?? null,
            attachmentSize: row.attachment_size ?? null,
            attachmentSignedUrl: signedUrl,
            clientMessageId: row.client_message_id ?? null,
            createdAt: row.created_at,
            deliveryState: "sent",
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as Partial<ConversationRow>;
          const nextReadAt =
            viewerRole === "buyer"
              ? (row.seller_last_read_at ?? null)
              : (row.buyer_last_read_at ?? null);
          readUpdateRef.current(nextReadAt);
        },
      )
      .subscribe((subStatus) => {
        if (cancelled) return;
        if (subStatus === "SUBSCRIBED") {
          setStatus("live");
          if (hadConnectedOnceRef.current) {
            resyncRef.current();
          }
          hadConnectedOnceRef.current = true;
        } else if (subStatus === "TIMED_OUT" || subStatus === "CHANNEL_ERROR") {
          setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting");
        } else if (subStatus === "CLOSED") {
          setStatus("reconnecting");
        }
      });

    const handleOnline = () => {
      setStatus("reconnecting");
      resyncRef.current();
    };

    const handleOffline = () => {
      setStatus("offline");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resyncRef.current();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, viewerRole]);

  return status;
}

export interface UseRealtimePortalBadgesOptions {
  userId?: string | null;
  viewerRole: MessageSenderRole;
  sellerId?: string | null;
  initialUnreadMessages: number;
  initialUnreadNotifications: number;
}

export function useRealtimePortalBadges({
  userId,
  viewerRole,
  sellerId,
  initialUnreadMessages,
  initialUnreadNotifications,
}: UseRealtimePortalBadgesOptions) {
  const router = useRouter();
  const [unreadMessages, setUnreadMessages] = useState(initialUnreadMessages);
  const [unreadNotifications, setUnreadNotifications] = useState(
    initialUnreadNotifications,
  );

  useEffect(() => {
    setUnreadMessages(initialUnreadMessages);
  }, [initialUnreadMessages]);

  useEffect(() => {
    setUnreadNotifications(initialUnreadNotifications);
  }, [initialUnreadNotifications]);

  useEffect(() => {
    if (!userId) return;
    if (viewerRole === "seller" && !sellerId) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        router.refresh();
      }, 450);
    };

    const convFilter =
      viewerRole === "buyer"
        ? `buyer_id=eq.${userId}`
        : `seller_id=eq.${sellerId}`;

    const channel = supabase
      .channel(`stone-portal-badges-${viewerRole}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadNotifications((prev) => prev + 1);
          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: convFilter,
        },
        () => {
          scheduleRefresh();
        },
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [userId, viewerRole, sellerId, router]);

  return {
    unreadMessages,
    unreadNotifications,
  };
}

