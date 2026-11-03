"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Database } from "@stone/database";
import type { ChatAttachmentMime, MessageSenderRole, MessageType } from "@stone/types";
import {
  markConversationReadSchema,
  messageCursorQuerySchema,
  sendMessageSchema,
  startConversationSchema,
  toggleArchiveConversationSchema,
} from "@stone/validation";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { dispatchTransactionalEmailIfConfigured } from "@/lib/email-notifications";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ThreadMessageItem } from "./messaging-utils";
import {
  getConversationMessagesDelta,
  getConversationMessagesPage,
  type MessagePageCursor,
} from "./queries";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StartConversationResult =
  | {
      ok: true;
      conversationId: string;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
      requiresAuth?: boolean;
    };

export async function startOrOpenConversationAction(
  rawInput: unknown,
  callerContext: "buyer" | "seller" = "buyer",
): Promise<StartConversationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      requiresAuth: true,
      error: "Please sign in to start a conversation.",
    };
  }

  const parsed = startConversationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid conversation details.",
    };
  }

  const supabase = await getSupabaseServerClient();
  const { sellerId, enquiryId, productId, subject, initialMessage } = parsed.data;

  // Verify role server-side before invoking RPC
  if (callerContext === "seller") {
    const isSeller = await hasRole("seller");
    if (!isSeller || !enquiryId) {
      return {
        ok: false,
        error: "Sellers can only initiate conversations from an existing buyer enquiry.",
      };
    }
  } else {
    const isBuyer = await hasRole("buyer");
    if (!isBuyer) {
      return {
        ok: false,
        error:
          "A Buyer capability is required to message suppliers. Enable Buyer access in your account settings.",
      };
    }
  }

  const { data: convId, error: rpcError } = await supabase.rpc(
    "get_or_create_conversation",
    {
      _seller_id: sellerId,
      _enquiry_id: enquiryId,
      _product_id: productId,
      _subject: subject,
    },
  );

  if (rpcError || !convId) {
    const msg = rpcError?.message ?? "";
    if (msg.includes("cannot message your own seller business")) {
      return { ok: false, error: "You cannot message your own seller business." };
    }
    if (msg.includes("seller is not verified")) {
      return { ok: false, error: "Only verified suppliers can be messaged directly." };
    }
    if (msg.includes("rate limit")) {
      return {
        ok: false,
        error: "Too many new conversations started recently. Please wait a minute.",
      };
    }
    if (msg.includes("not authorized")) {
      return { ok: false, error: "You are not authorized to open this conversation." };
    }
    console.error("[messaging/actions] get_or_create_conversation error:", msg);
    return { ok: false, error: "Unable to open conversation right now. Please try again." };
  }

  if (initialMessage && initialMessage.length > 0) {
    await supabase.from("messages").insert({
      conversation_id: convId,
      sender_id: user.id,
      sender_role: callerContext,
      message_type: "text",
      body: initialMessage,
      client_message_id: randomUUID(),
    });
  }

  const redirectTo =
    callerContext === "seller"
      ? `/seller/messages/${convId}`
      : `/buyer/messages/${convId}`;

  revalidatePath("/buyer/messages");
  revalidatePath("/seller/messages");

  return {
    ok: true,
    conversationId: convId,
    redirectTo,
  };
}

export type SendMessageActionResult =
  | {
      ok: true;
      message: ThreadMessageItem;
    }
  | {
      ok: false;
      error: string;
    };

export async function sendMessageAction(
  rawInput: unknown,
  expectedRole: MessageSenderRole,
): Promise<SendMessageActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }

  const roleAllowed = await hasRole(expectedRole);
  if (!roleAllowed) {
    return { ok: false, error: "You do not have permission to send messages in this portal." };
  }

  const parsed = sendMessageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check your message and try again.",
    };
  }

  const input = parsed.data;
  const supabase = await getSupabaseServerClient();

  // Server-side participant authorization: never trust client-supplied role/ids
  let sellerProfileId: string | null = null;
  if (expectedRole === "seller") {
    const { data: sp } = await supabase
      .from("seller_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    sellerProfileId = sp?.id ?? null;
    if (!sellerProfileId) {
      return { ok: false, error: "Seller profile not found." };
    }
  }

  let convQuery = supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, subject")
    .eq("id", input.conversationId);

  if (expectedRole === "buyer") {
    convQuery = convQuery.eq("buyer_id", user.id);
  } else {
    convQuery = convQuery.eq("seller_id", sellerProfileId!);
  }

  const { data: conversation } = await convQuery.maybeSingle();
  if (!conversation) {
    return { ok: false, error: "Conversation not found or access denied." };
  }

  const messageType: "text" | "attachment" = input.attachmentPath
    ? "attachment"
    : "text";

  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      sender_role: expectedRole,
      message_type: messageType,
      body: input.body,
      attachment_path: input.attachmentPath,
      attachment_name: input.attachmentName,
      attachment_mime: input.attachmentMime,
      attachment_size: input.attachmentSize,
      client_message_id: input.clientMessageId,
    })
    .select("*")
    .maybeSingle();

  let row: MessageRow | null = (inserted as MessageRow | null) ?? null;

  // Idempotent retry recovery: if duplicate client_message_id hit (23505), fetch existing message
  if (insertError) {
    if (insertError.code === "23505" && input.clientMessageId) {
      const { data: existing } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .eq("sender_id", user.id)
        .eq("client_message_id", input.clientMessageId)
        .maybeSingle();
      row = (existing as MessageRow | null) ?? null;
    } else if (insertError.message?.toLowerCase().includes("rate limit")) {
      return {
        ok: false,
        error: "You are sending messages too quickly. Please wait a moment and try again.",
      };
    } else {
      console.error("[messaging/actions] message insert error:", insertError.message);
      return { ok: false, error: "Could not deliver message. Please retry." };
    }
  }

  if (!row) {
    return { ok: false, error: "Could not deliver message. Please retry." };
  }

  let signedUrl: string | null = null;
  if (row.attachment_path) {
    const { data: signed } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(row.attachment_path, 900);
    signedUrl = signed?.signedUrl ?? null;
  }

  // Non-blocking optional email notification (only sends when RESEND_API_KEY + EMAIL_FROM exist)
  void notifyCounterpartyByEmail({
    supabase,
    senderRole: expectedRole,
    conversation,
    preview:
      row.body.trim().length > 0
        ? row.body.trim().slice(0, 180)
        : `Shared an attachment: ${row.attachment_name ?? "Document"}`,
  });

  revalidatePath("/buyer/messages");
  revalidatePath(`/buyer/messages/${conversation.id}`);
  revalidatePath("/seller/messages");
  revalidatePath(`/seller/messages/${conversation.id}`);

  return {
    ok: true,
    message: {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderRole: row.sender_role as MessageSenderRole,
      messageType: row.message_type as MessageType,
      body: row.body,
      attachmentPath: row.attachment_path,
      attachmentName: row.attachment_name,
      attachmentMime: (row.attachment_mime as ChatAttachmentMime | null) ?? null,
      attachmentSize: row.attachment_size,
      attachmentSignedUrl: signedUrl,
      clientMessageId: row.client_message_id,
      createdAt: row.created_at,
      deliveryState: "sent",
    },
  };
}

async function notifyCounterpartyByEmail(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  senderRole: MessageSenderRole;
  conversation: { id: string; buyer_id: string; seller_id: string; subject: string };
  preview: string;
}): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;

    if (params.senderRole === "buyer") {
      // Note: seller_profiles base email is owner-only under RLS; skip unless accessible
      return;
    }

    const { data: buyerProfile } = await params.supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", params.conversation.buyer_id)
      .maybeSingle();

    if (buyerProfile?.email) {
      await dispatchTransactionalEmailIfConfigured({
        to: buyerProfile.email,
        subject: `New supplier message: ${params.conversation.subject}`,
        heading: `New reply regarding "${params.conversation.subject}"`,
        bodyText: params.preview,
        ctaLabel: "Open Conversation",
        ctaPath: `/buyer/messages/${params.conversation.id}`,
      });
    }
  } catch {
    // Non-fatal optional email path
  }
}

export async function loadOlderMessagesAction(
  rawInput: unknown,
  viewerRole: MessageSenderRole,
): Promise<{
  ok: boolean;
  messages: ThreadMessageItem[];
  hasOlderMessages: boolean;
  nextCursor: MessagePageCursor | null;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      messages: [],
      hasOlderMessages: false,
      nextCursor: null,
      error: "Authentication required.",
    };
  }

  const parsed = messageCursorQuerySchema.safeParse(rawInput);
  if (!parsed.success || !parsed.data.beforeCreatedAt || !parsed.data.beforeId) {
    return {
      ok: false,
      messages: [],
      hasOlderMessages: false,
      nextCursor: null,
      error: "Invalid message pagination cursor.",
    };
  }

  let sellerId: string | null = null;
  if (viewerRole === "seller") {
    const supabase = await getSupabaseServerClient();
    const { data: sp } = await supabase
      .from("seller_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    sellerId = sp?.id ?? null;
  }

  const page = await getConversationMessagesPage({
    conversationId: parsed.data.conversationId,
    viewerRole,
    userId: user.id,
    sellerId,
    beforeCreatedAt: parsed.data.beforeCreatedAt,
    beforeId: parsed.data.beforeId,
    limit: parsed.data.limit,
  });

  if (!page) {
    return {
      ok: false,
      messages: [],
      hasOlderMessages: false,
      nextCursor: null,
      error: "Conversation not found or access denied.",
    };
  }

  return {
    ok: true,
    messages: page.messages,
    hasOlderMessages: page.hasOlderMessages,
    nextCursor: page.nextCursor,
  };
}

export async function syncMissedMessagesAction(
  params: { conversationId: string; afterCreatedAt?: string | null },
  viewerRole: MessageSenderRole,
): Promise<{
  ok: boolean;
  messages: ThreadMessageItem[];
  counterpartyLastReadAt: string | null;
}> {
  const user = await getCurrentUser();
  if (!user || !UUID_REGEX.test(params.conversationId)) {
    return { ok: false, messages: [], counterpartyLastReadAt: null };
  }

  let sellerId: string | null = null;
  if (viewerRole === "seller") {
    const supabase = await getSupabaseServerClient();
    const { data: sp } = await supabase
      .from("seller_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    sellerId = sp?.id ?? null;
  }

  const delta = await getConversationMessagesDelta({
    conversationId: params.conversationId,
    viewerRole,
    userId: user.id,
    sellerId,
    afterCreatedAt: params.afterCreatedAt,
  });

  if (!delta) {
    return { ok: false, messages: [], counterpartyLastReadAt: null };
  }

  return {
    ok: true,
    messages: delta.messages,
    counterpartyLastReadAt: delta.counterpartyLastReadAt,
  };
}

export async function markConversationReadAction(
  conversationId: string,
  viewerRole: MessageSenderRole,
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const parsed = markConversationReadSchema.safeParse({ conversationId });
  if (!parsed.success) return { ok: false };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("mark_conversation_read", {
    _conversation_id: parsed.data.conversationId,
  });

  if (error) return { ok: false };

  if (viewerRole === "buyer") {
    revalidatePath("/buyer/messages");
    revalidatePath("/buyer/notifications");
  } else {
    revalidatePath("/seller/messages");
    revalidatePath("/seller/notifications");
  }

  return { ok: true };
}

export async function toggleArchiveConversationAction(
  conversationId: string,
  archived: boolean,
  viewerRole: MessageSenderRole,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Authentication required." };

  const parsed = toggleArchiveConversationSchema.safeParse({
    conversationId,
    archived,
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_conversation_archived", {
    _conversation_id: parsed.data.conversationId,
    _archived: parsed.data.archived,
  });

  if (error) {
    return { ok: false, error: "Could not update conversation archive status." };
  }

  if (viewerRole === "buyer") {
    revalidatePath("/buyer/messages");
  } else {
    revalidatePath("/seller/messages");
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Seller Notifications Actions (/seller/notifications)
// ---------------------------------------------------------------------------

export async function markSellerNotificationReadAction(
  notificationId: string,
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || !UUID_REGEX.test(notificationId)) return { ok: false };

  const isSeller = await hasRole("seller");
  if (!isSeller) return { ok: false };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) return { ok: false };

  revalidatePath("/seller/notifications");
  revalidatePath("/seller/dashboard");
  return { ok: true };
}

export async function markAllSellerNotificationsReadAction(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const isSeller = await hasRole("seller");
  if (!isSeller) return { ok: false };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { ok: false };

  revalidatePath("/seller/notifications");
  revalidatePath("/seller/dashboard");
  return { ok: true };
}

