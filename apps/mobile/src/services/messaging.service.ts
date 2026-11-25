import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import type { ChatAttachmentMime, MessageSenderRole, MessageType } from "@stone/types";
import type { Database } from "@stone/database";
import { sendMessageSchema, startConversationSchema } from "@stone/validation";
import { supabase } from "../lib/supabase";
import { uploadNativeAsset, type PickedFileInput } from "../lib/storage-upload";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export interface ConversationInboxItem {
  id: string;
  subject: string;
  enquiryId: string | null;
  productId: string | null;
  counterpartyName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
  archived: boolean;
}

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
  createdAt: string;
}

export async function fetchConversationsInbox(params: {
  userId: string;
  role: "buyer" | "seller";
  sellerId?: string | null;
}): Promise<ConversationInboxItem[]> {
  let query = supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(60);

  if (params.role === "buyer") {
    query = query.eq("buyer_id", params.userId);
  } else if (params.sellerId) {
    query = query.eq("seller_id", params.sellerId);
  } else {
    return [];
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  const list = rows ?? [];
  if (list.length === 0) return [];

  const sellerIds = [...new Set(list.map((c) => c.seller_id))];
  const buyerIds = [...new Set(list.map((c) => c.buyer_id))];

  const [{ data: sellers }, { data: buyers }] = await Promise.all([
    params.role === "buyer"
      ? supabase.from("public_seller_profiles").select("id, business_name").in("id", sellerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; business_name: string }> }),
    params.role === "seller"
      ? supabase.from("profiles").select("id, full_name, email").in("id", buyerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string }> }),
  ]);

  const sellerNames = new Map((sellers ?? []).map((s) => [s.id, s.business_name]));
  const buyerNames = new Map(
    (buyers ?? []).map((b) => [b.id, b.full_name || b.email || "Registered Buyer"]),
  );

  return list.map((c: ConversationRow) => ({
    id: c.id,
    subject: c.subject,
    enquiryId: c.enquiry_id,
    productId: c.product_id,
    counterpartyName:
      params.role === "buyer"
        ? sellerNames.get(c.seller_id) ?? "Verified Supplier"
        : buyerNames.get(c.buyer_id) ?? "Registered Buyer",
    lastMessagePreview: c.last_message_preview,
    lastMessageAt: c.last_message_at,
    unreadCount: params.role === "buyer" ? c.buyer_unread_count : c.seller_unread_count,
    archived: params.role === "buyer" ? Boolean(c.buyer_archived_at) : Boolean(c.seller_archived_at),
  }));
}

export async function startOrOpenConversation(input: {
  sellerId: string;
  enquiryId?: string | null;
  productId?: string | null;
  subject?: string | null;
  initialMessage?: string | null;
  callerRole: "buyer" | "seller";
  userId: string;
}): Promise<string> {
  const parsed = startConversationSchema.safeParse({
    sellerId: input.sellerId,
    enquiryId: input.enquiryId ?? undefined,
    productId: input.productId ?? undefined,
    subject: input.subject ?? undefined,
    initialMessage: input.initialMessage ?? undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid conversation details.");
  }

  const { data: convId, error } = await supabase.rpc("get_or_create_conversation", {
    _seller_id: parsed.data.sellerId,
    _enquiry_id: parsed.data.enquiryId,
    _product_id: parsed.data.productId,
    _subject: parsed.data.subject,
  });

  if (error || !convId) {
    throw new Error(error?.message || "Unable to start conversation.");
  }

  if (parsed.data.initialMessage) {
    await supabase.from("messages").insert({
      conversation_id: convId,
      sender_id: input.userId,
      sender_role: input.callerRole,
      message_type: "text",
      body: parsed.data.initialMessage,
      client_message_id: Crypto.randomUUID(),
    });
  }

  return convId;
}

export async function resolveAttachmentSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("message-attachments").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export async function fetchConversationThread(conversationId: string): Promise<{
  conversation: ConversationRow | null;
  messages: ThreadMessageItem[];
}> {
  const [{ data: conv }, { data: rows, error }] = await Promise.all([
    supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  if (error) throw new Error(error.message);

  const mapped: ThreadMessageItem[] = await Promise.all(
    (rows ?? []).map(async (m: MessageRow) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderRole: m.sender_role,
      messageType: m.message_type,
      body: m.body,
      attachmentPath: m.attachment_path,
      attachmentName: m.attachment_name,
      attachmentMime: m.attachment_mime,
      attachmentSize: m.attachment_size,
      attachmentSignedUrl: m.attachment_path
        ? await resolveAttachmentSignedUrl(m.attachment_path)
        : null,
      createdAt: m.created_at,
    })),
  );

  return { conversation: conv ?? null, messages: mapped };
}

export async function sendThreadMessage(params: {
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  body: string;
  attachment?: PickedFileInput | null;
}): Promise<ThreadMessageItem> {
  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;
  let attachmentMime: ChatAttachmentMime | null = null;
  let attachmentSize: number | null = null;

  if (params.attachment) {
    const uploaded = await uploadNativeAsset({
      bucket: "message-attachments",
      folderPrefix: params.conversationId,
      file: params.attachment,
      maxBytes: 10 * 1024 * 1024,
    });
    attachmentPath = uploaded.path;
    attachmentName = uploaded.fileName;
    attachmentMime = uploaded.mime as ChatAttachmentMime;
    attachmentSize = uploaded.size;
  }

  const parsed = sendMessageSchema.safeParse({
    conversationId: params.conversationId,
    body: params.body,
    attachmentPath,
    attachmentName,
    attachmentMime,
    attachmentSize,
    clientMessageId: Crypto.randomUUID(),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Message cannot be empty.");
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: params.senderId,
      sender_role: params.senderRole,
      message_type: attachmentPath ? "attachment" : "text",
      body: parsed.data.body,
      attachment_path: parsed.data.attachmentPath,
      attachment_name: parsed.data.attachmentName,
      attachment_mime: parsed.data.attachmentMime,
      attachment_size: parsed.data.attachmentSize,
      client_message_id: parsed.data.clientMessageId,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Failed to send message.");
  }

  return {
    id: inserted.id,
    conversationId: inserted.conversation_id,
    senderId: inserted.sender_id,
    senderRole: inserted.sender_role,
    messageType: inserted.message_type,
    body: inserted.body,
    attachmentPath: inserted.attachment_path,
    attachmentName: inserted.attachment_name,
    attachmentMime: inserted.attachment_mime,
    attachmentSize: inserted.attachment_size,
    attachmentSignedUrl: inserted.attachment_path
      ? await resolveAttachmentSignedUrl(inserted.attachment_path)
      : null,
    createdAt: inserted.created_at,
  };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await supabase.rpc("mark_conversation_read", { _conversation_id: conversationId });
}

export async function toggleConversationArchived(
  conversationId: string,
  archived: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("set_conversation_archived", {
    _conversation_id: conversationId,
    _archived: archived,
  });
  if (error) throw new Error(error.message);
}

export function useRealtimeThread(
  conversationId: string | undefined,
  onNewMessage: (msg: ThreadMessageItem) => void,
) {
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    const channel = supabase
      .channel(`mobile-thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (!active) return;
          const row = payload.new as MessageRow;
          if (!row?.id) return;
          const signed = row.attachment_path
            ? await resolveAttachmentSignedUrl(row.attachment_path)
            : null;
          if (!active) return;
          onNewMessage({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            senderRole: row.sender_role,
            messageType: row.message_type,
            body: row.body,
            attachmentPath: row.attachment_path,
            attachmentName: row.attachment_name,
            attachmentMime: row.attachment_mime,
            attachmentSize: row.attachment_size,
            attachmentSignedUrl: signed,
            createdAt: row.created_at,
          });
        },
      )
      .subscribe((state) => {
        if (!active) return;
        if (state === "SUBSCRIBED") setStatus("live");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("offline");
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, onNewMessage]);

  return status;
}
