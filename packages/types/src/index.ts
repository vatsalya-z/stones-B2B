/**
 * Shared domain enums. Each is a const tuple so Zod schemas and DB enums can
 * be derived from a single source of truth.
 */
export const USER_ROLES = ["buyer", "seller", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ["active", "pending", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const BUSINESS_TYPES = [
  "manufacturer",
  "mine_owner",
  "stone_supplier",
  "exporter",
  "wholesaler",
  "retailer",
  "contractor",
  "architect",
  "interior_designer",
  "builder",
  "importer",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const VERIFICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "verified",
  "rejected",
  "suspended",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const PRODUCT_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "archived",
  "out_of_stock",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRICE_TYPES = ["fixed", "starting", "on_request", "negotiable"] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const ENQUIRY_STATUSES = [
  "submitted",
  "viewed",
  "responding",
  "quoted",
  "accepted",
  "rejected",
  "closed",
  "cancelled",
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const QUOTATION_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "revised",
  "cancelled",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "processing",
  "dispatched",
  "delivered",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ADDRESS_TYPES = ["billing", "shipping", "project_site", "both"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export const MESSAGE_SENDER_ROLES = ["buyer", "seller"] as const;
export type MessageSenderRole = (typeof MESSAGE_SENDER_ROLES)[number];

export const MESSAGE_TYPES = ["text", "attachment", "system"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "enquiry_received",
  "enquiry_viewed",
  "quotation_received",
  "quotation_accepted",
  "quotation_rejected",
  "message_received",
  "seller_verification",
  "product_moderation",
  "account_status",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CHAT_ATTACHMENT_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type ChatAttachmentMime = (typeof CHAT_ATTACHMENT_MIMES)[number];

export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const DEFAULT_LOCALE = "en-IN";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_COUNTRY = "IN";
