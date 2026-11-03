import { z } from "zod";
import { CHAT_ATTACHMENT_MIMES, MAX_CHAT_ATTACHMENT_BYTES } from "@stone/types";

function stripDisallowedControlChars(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // Preserve newline (\n = 10), carriage return (\r = 13), and tab (\t = 9); strip NUL and other C0/DEL control bytes.
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) {
      out += value[i];
    }
  }
  return out;
}

const optionalUuid = z
  .union([z.string().uuid("Invalid identifier"), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v && v.length > 0 ? v : null));

export const startConversationSchema = z.object({
  sellerId: z.string().uuid("Invalid supplier identifier"),
  enquiryId: optionalUuid,
  productId: optionalUuid,
  subject: z
    .string()
    .transform((v) => stripDisallowedControlChars(v).trim())
    .pipe(z.string().max(200, "Subject cannot exceed 200 characters"))
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  initialMessage: z
    .string()
    .transform((v) => stripDisallowedControlChars(v).trim())
    .pipe(z.string().max(4000, "Message cannot exceed 4,000 characters"))
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const sendMessageSchema = z
  .object({
    conversationId: z.string().uuid("Invalid conversation identifier"),
    body: z
      .string()
      .default("")
      .transform((v) => stripDisallowedControlChars(v).trim())
      .pipe(z.string().max(4000, "Message cannot exceed 4,000 characters")),
    attachmentPath: z
      .string()
      .trim()
      .max(512, "Attachment path is too long")
      .nullable()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    attachmentName: z
      .string()
      .transform((v) => stripDisallowedControlChars(v).trim())
      .pipe(z.string().max(255, "Filename cannot exceed 255 characters"))
      .nullable()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    attachmentMime: z
      .enum(CHAT_ATTACHMENT_MIMES, {
        errorMap: () => ({ message: "Unsupported attachment file type" }),
      })
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    attachmentSize: z
      .number()
      .int("File size must be an integer")
      .min(1, "Attachment cannot be empty")
      .max(MAX_CHAT_ATTACHMENT_BYTES, "Attachment exceeds the 10 MB limit")
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    clientMessageId: optionalUuid,
  })
  .superRefine((data, ctx) => {
    const hasText = data.body.length > 0;
    const attachmentFields = [
      data.attachmentPath,
      data.attachmentName,
      data.attachmentMime,
      data.attachmentSize,
    ];
    const presentAttachmentCount = attachmentFields.filter((f) => f !== null).length;

    if (presentAttachmentCount > 0 && presentAttachmentCount < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attachmentPath"],
        message: "Attachment metadata is incomplete",
      });
    }

    const hasAttachment = presentAttachmentCount === 4;

    if (!hasText && !hasAttachment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Enter a message or attach a file before sending",
      });
    }

    if (data.attachmentPath) {
      if (
        !data.attachmentPath.startsWith(`${data.conversationId}/`) ||
        data.attachmentPath.includes("..") ||
        data.attachmentPath.includes("\\")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["attachmentPath"],
          message: "Attachment path must belong to this conversation",
        });
      }
    }
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const CONVERSATION_INBOX_TABS = ["active", "unread", "archived"] as const;
export type ConversationInboxTab = (typeof CONVERSATION_INBOX_TABS)[number];

export const conversationInboxFilterSchema = z.object({
  search: z
    .string()
    .optional()
    .default("")
    .transform((v) => stripDisallowedControlChars(v).trim().slice(0, 120)),
  tab: z.enum(CONVERSATION_INBOX_TABS).optional().default("active"),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(50).optional().default(25),
});
export type ConversationInboxFilterInput = z.infer<typeof conversationInboxFilterSchema>;

export const messageCursorQuerySchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier"),
  beforeCreatedAt: z
    .string()
    .datetime({ offset: true, message: "Invalid timestamp cursor" })
    .optional()
    .nullable(),
  beforeId: optionalUuid,
  limit: z.coerce.number().int().min(1).max(50).optional().default(30),
});
export type MessageCursorQueryInput = z.infer<typeof messageCursorQuerySchema>;

export const markConversationReadSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier"),
});

export const toggleArchiveConversationSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier"),
  archived: z.boolean(),
});

export function sanitizeAttachmentFilename(filename: string): string {
  const base = stripDisallowedControlChars(filename)
    .split(/[/\\]/)
    .pop()
    ?.trim() || "attachment";
  const cleaned = base.replace(/[^a-zA-Z0-9._\-\s()]/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned.length > 0 ? cleaned : "attachment").slice(0, 180);
}

