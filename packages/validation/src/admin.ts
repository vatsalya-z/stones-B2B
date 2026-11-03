import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------
const uuid = z.string().uuid("Invalid identifier");

/** Mandatory, human-readable reason that sellers / buyers may read (10–1000 chars). */
export const adminReasonSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(10, "Please provide a clear reason (at least 10 characters).")
      .max(1000, "Reason cannot exceed 1,000 characters."),
  );

/**
 * Makes a free-text search term safe to embed into a PostgREST `.or()` / `ilike`
 * filter: removes characters that carry meaning in filter syntax or LIKE wildcards.
 */
export function sanitizeAdminSearchTerm(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let out = "";
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127) continue; // control characters
    if (",()%*_\\\"'`;:{}[]<>|".includes(ch)) {
      out += " ";
      continue;
    }
    out += ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, 80);
}

// ---------------------------------------------------------------------------
// Seller management
// ---------------------------------------------------------------------------
export const SELLER_ADMIN_ACTIONS = [
  "start_review",
  "approve",
  "reject",
  "request_documents",
  "suspend",
  "reactivate",
] as const;
export type SellerAdminAction = (typeof SELLER_ADMIN_ACTIONS)[number];

/** Which actions must carry a reason / message. */
export const SELLER_ACTIONS_REQUIRING_REASON: ReadonlySet<SellerAdminAction> = new Set([
  "reject",
  "request_documents",
  "suspend",
]);

export const sellerAdminActionSchema = z
  .object({
    sellerId: uuid,
    action: z.enum(SELLER_ADMIN_ACTIONS),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (SELLER_ACTIONS_REQUIRING_REASON.has(data.action)) {
      const parsed = adminReasonSchema.safeParse(data.reason ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: parsed.error.issues[0]?.message ?? "A reason is required.",
        });
      }
    }
  })
  .transform((data) => ({
    sellerId: data.sellerId,
    action: data.action,
    reason: SELLER_ACTIONS_REQUIRING_REASON.has(data.action)
      ? adminReasonSchema.parse(data.reason ?? "")
      : null,
  }));
export type SellerAdminActionInput = z.input<typeof sellerAdminActionSchema>;

export const documentReviewSchema = z
  .object({
    documentId: uuid,
    status: z.enum(["approved", "rejected"]),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "rejected") {
      const parsed = adminReasonSchema.safeParse(data.reason ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: parsed.error.issues[0]?.message ?? "A reason is required.",
        });
      }
    }
  })
  .transform((data) => ({
    documentId: data.documentId,
    status: data.status,
    reason: data.status === "rejected" ? adminReasonSchema.parse(data.reason ?? "") : null,
  }));
export type DocumentReviewInput = z.input<typeof documentReviewSchema>;

// ---------------------------------------------------------------------------
// Product moderation
// ---------------------------------------------------------------------------
export const PRODUCT_ADMIN_ACTIONS = [
  "approve",
  "reject",
  "request_changes",
  "archive",
  "restore",
] as const;
export type ProductAdminAction = (typeof PRODUCT_ADMIN_ACTIONS)[number];

export const PRODUCT_ACTIONS_REQUIRING_REASON: ReadonlySet<ProductAdminAction> = new Set([
  "reject",
  "request_changes",
  "archive",
  "restore",
]);

export const productAdminActionSchema = z
  .object({
    productId: uuid,
    action: z.enum(PRODUCT_ADMIN_ACTIONS),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (PRODUCT_ACTIONS_REQUIRING_REASON.has(data.action)) {
      const parsed = adminReasonSchema.safeParse(data.reason ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: parsed.error.issues[0]?.message ?? "A reason is required.",
        });
      }
    }
  })
  .transform((data) => ({
    productId: data.productId,
    action: data.action,
    reason: PRODUCT_ACTIONS_REQUIRING_REASON.has(data.action)
      ? adminReasonSchema.parse(data.reason ?? "")
      : null,
  }));
export type ProductAdminActionInput = z.input<typeof productAdminActionSchema>;

export const MAX_BULK_MODERATION_ITEMS = 50;

/**
 * Bulk moderation. Every item is authorized and executed individually by the
 * database RPC; this schema only bounds the request. Bulk actions are limited
 * to approve / reject (reject needs a reason shared by all items).
 */
export const bulkProductModerationSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    productIds: z
      .array(uuid)
      .min(1, "Select at least one product.")
      .max(MAX_BULK_MODERATION_ITEMS, `Select at most ${MAX_BULK_MODERATION_ITEMS} products at a time.`),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.productIds).size !== data.productIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productIds"],
        message: "Duplicate products in selection.",
      });
    }
    if (data.action === "reject") {
      const parsed = adminReasonSchema.safeParse(data.reason ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: parsed.error.issues[0]?.message ?? "A reason is required.",
        });
      }
    }
  })
  .transform((data) => ({
    action: data.action,
    productIds: data.productIds,
    reason: data.action === "reject" ? adminReasonSchema.parse(data.reason ?? "") : null,
  }));
export type BulkProductModerationInput = z.input<typeof bulkProductModerationSchema>;

// ---------------------------------------------------------------------------
// Account status (buyers, sellers, admins)
// ---------------------------------------------------------------------------
export const accountStatusActionSchema = z
  .object({
    userId: uuid,
    status: z.enum(["active", "suspended"]),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "suspended") {
      const parsed = adminReasonSchema.safeParse(data.reason ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: parsed.error.issues[0]?.message ?? "A reason is required.",
        });
      }
    }
  })
  .transform((data) => ({
    userId: data.userId,
    status: data.status,
    reason:
      data.status === "suspended"
        ? adminReasonSchema.parse(data.reason ?? "")
        : data.reason?.trim() || null,
  }));
export type AccountStatusActionInput = z.input<typeof accountStatusActionSchema>;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Cannot exceed ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

export const categoryImageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .refine(
    (v) => !v || v.startsWith("/images/") || /^https:\/\/[^\s]+$/i.test(v),
    "Image must be an uploaded file, an /images/ asset or an https URL",
  )
  .transform((v) => (v && v.length > 0 ? v : null));

export const categoryFormSchema = z.object({
  id: uuid.optional().nullable().transform((v) => v ?? null),
  parentId: uuid.optional().nullable().transform((v) => v ?? null),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name cannot exceed 120 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug cannot exceed 100 characters")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens only"),
  description: nullableText(500),
  imageUrl: categoryImageUrlSchema,
  isActive: z.boolean().default(true),
  displayOrder: z.coerce
    .number()
    .int("Order must be a whole number")
    .min(0, "Order cannot be negative")
    .max(10000, "Order is too large")
    .default(0),
  seoTitle: nullableText(160),
  seoDescription: nullableText(320),
});
export type CategoryFormInput = z.input<typeof categoryFormSchema>;
export type CategoryFormData = z.output<typeof categoryFormSchema>;

export const deleteCategorySchema = z.object({ categoryId: uuid });
export type DeleteCategoryInput = z.input<typeof deleteCategorySchema>;

// ---------------------------------------------------------------------------
// Admin users / roles (super_admin only)
// ---------------------------------------------------------------------------
export const ADMIN_ROLES = ["admin", "super_admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const grantAdminRoleSchema = z
  .object({
    userId: uuid.optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter the registered email of an existing user")
      .max(254)
      .optional(),
    role: z.enum(ADMIN_ROLES),
  })
  .refine((data) => Boolean(data.userId || data.email), {
    message: "Either a userId or a registered email must be provided",
  });
export type GrantAdminRoleInput = z.input<typeof grantAdminRoleSchema>;

export const revokeAdminRoleSchema = z.object({
  userId: uuid,
  role: z.enum(ADMIN_ROLES),
});
export type RevokeAdminRoleInput = z.input<typeof revokeAdminRoleSchema>;

// ---------------------------------------------------------------------------
// Platform settings (super_admin only)
// ---------------------------------------------------------------------------
export const SETTING_KEYS = ["marketplace", "contact", "homepage", "seo"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const shortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Cannot exceed ${max} characters`)
    .default("");

const optionalUrlOrPath = z
  .string()
  .trim()
  .max(500)
  .default("")
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\/[^\s]+$/i.test(v), "Use a relative path or http(s) URL");

export const marketplaceSettingsSchema = z.object({
  name: shortText(80).refine((v) => v.length >= 2, "Marketplace name is required"),
  tagline: shortText(160),
  default_currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code")
    .default("INR"),
  support_hours: shortText(120),
});

export const contactSettingsSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .default("")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email"),
  phone: z
    .string()
    .trim()
    .max(30)
    .default("")
    .refine((v) => v === "" || /^[0-9+()\-\s]{6,30}$/.test(v), "Enter a valid phone number"),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .default("")
    .refine((v) => v === "" || /^[0-9+()\-\s]{6,30}$/.test(v), "Enter a valid WhatsApp number"),
  address: shortText(300),
});

export const homepageSettingsSchema = z.object({
  hero_headline: shortText(140),
  hero_subheadline: shortText(300),
  banner_enabled: z.boolean().default(false),
  banner_text: shortText(200),
  banner_link: optionalUrlOrPath,
});

export const seoSettingsSchema = z.object({
  default_title: shortText(70),
  default_description: shortText(170),
  default_og_image: optionalUrlOrPath,
});

export const SETTING_SCHEMAS = {
  marketplace: marketplaceSettingsSchema,
  contact: contactSettingsSchema,
  homepage: homepageSettingsSchema,
  seo: seoSettingsSchema,
} as const;

export const savePlatformSettingSchema = z.object({
  key: z.enum(SETTING_KEYS),
  value: z.record(z.unknown()),
  isPublic: z.boolean().default(true),
});
export type SavePlatformSettingInput = z.input<typeof savePlatformSettingSchema>;

// ---------------------------------------------------------------------------
// List filters (query-string driven, untrusted)
// ---------------------------------------------------------------------------
export const ADMIN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns a YYYY-MM-DD string or null; rejects impossible dates such as 2026-02-31. */
export function parseAdminDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !ADMIN_DATE_RE.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return null;
  return raw;
}

/** Picks a value from an allow-list; anything else becomes `fallback`. */
export function pickAllowed<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function parseOptionalUuid(raw: unknown): string | null {
  return typeof raw === "string" && uuid.safeParse(raw).success ? raw : null;
}

