import { z } from "zod";
import { isValidCalendarDate } from "./date";
import { BUSINESS_TYPES } from "@stone/types";
import { passwordSchema } from "./auth";
import { CATALOG_UNITS } from "./seller";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Cannot exceed ${max} characters`)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalPhone = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^[+0-9()\-\s]{7,20}$/, `Enter a valid ${label}`)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalNonNegativeBudget = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((val, ctx) => {
    if (val === null || val === undefined || val === "") return null;
    const n = typeof val === "number" ? val : Number(String(val).trim());
    if (!Number.isFinite(n) || n < 0 || n > 999_999_999_999) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected budget must be a valid non-negative amount",
      });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

const DISALLOWED_AUTH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

function hasControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Sanitizes an untrusted `?next=` redirect target so only safe internal
 * relative paths on the same origin are permitted. Prevents open redirects
 * (`https://...`, `//evil.com`, `/\evil.com`, control characters) and auth loops.
 */
export function sanitizeNextPath(
  next?: string | null,
  fallback = "/dashboard",
): string {
  if (!next || typeof next !== "string") return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (hasControlCharacters(trimmed)) return fallback;

  const [pathOnly = ""] = trimmed.split("?");
  if (pathOnly.includes("://") || pathOnly.includes("\\")) return fallback;

  if (
    DISALLOWED_AUTH_PREFIXES.some(
      (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
    )
  ) {
    return fallback;
  }

  return trimmed.slice(0, 512);
}

// ---------------------------------------------------------------------------
// Buyer Profile Management Schema (/buyer/profile)
// Note: Privileged columns (`email`, `account_status`, `roles`, `id`) are
// intentionally excluded so client payloads can never modify them.
// ---------------------------------------------------------------------------
export const buyerProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name cannot exceed 120 characters"),
  phone: optionalPhone("phone number"),
  whatsappNumber: optionalPhone("WhatsApp number"),
  companyName: optionalTrimmed(160),
  buyerType: z
    .enum(BUSINESS_TYPES)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Select a valid 2-letter ISO country code")
    .default("IN"),
  state: optionalTrimmed(100),
  city: optionalTrimmed(100),
  address: optionalTrimmed(500),
  pincode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\-\s]{4,12}$/, "Enter a valid PIN / postal code")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type BuyerProfileInput = z.input<typeof buyerProfileSchema>;
export type BuyerProfileParsed = z.output<typeof buyerProfileSchema>;

// ---------------------------------------------------------------------------
// Request for Quotation (RFQ) Schema (/buyer/rfqs/new) — Sections A through E
// ---------------------------------------------------------------------------
export const rfqFormSchema = z
  .object({
    mode: z.enum(["product", "general"]),
    productId: z
      .string()
      .uuid("Invalid product reference")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v && v.length > 0 ? v : null)),
    sellerId: z
      .string()
      .uuid("Select a verified stone supplier")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v && v.length > 0 ? v : null)),

    // Section A — Requirement
    enquiryTitle: z
      .string()
      .trim()
      .min(3, "RFQ title must be at least 3 characters")
      .max(200, "RFQ title cannot exceed 200 characters"),
    categorySlug: optionalTrimmed(100),
    materialType: optionalTrimmed(100),
    stoneOrigin: optionalTrimmed(120),
    description: z
      .string()
      .trim()
      .min(10, "Provide a detailed project requirement (at least 10 characters)")
      .max(3200, "Requirement description cannot exceed 3200 characters"),

    // Section B — Technical Specifications
    colour: optionalTrimmed(80),
    finish: optionalTrimmed(80),
    thickness: optionalTrimmed(60),
    length: optionalTrimmed(60),
    width: optionalTrimmed(60),
    surfaceRequirements: optionalTrimmed(300),
    customSpecifications: optionalTrimmed(600),

    // Section C — Quantity & Budget
    quantity: z.coerce
      .number({ invalid_type_error: "Enter a valid required quantity" })
      .positive("Quantity must be greater than zero")
      .max(99_999_999, "Quantity exceeds maximum allowed limit")
      .transform((n) => Math.round(n * 1000) / 1000),
    unit: z.enum(CATALOG_UNITS).default("sq_ft"),
    expectedBudget: optionalNonNegativeBudget,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code")
      .default("INR"),

    // Section D — Delivery
    deliveryCountry: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Select a valid delivery country")
      .default("IN"),
    deliveryState: optionalTrimmed(100),
    deliveryCity: z
      .string()
      .trim()
      .min(2, "Delivery city or port is required")
      .max(100, "Delivery city cannot exceed 100 characters"),
    deliveryAddress: optionalTrimmed(300),
    requiredDeliveryDate: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v, ctx) => {
        if (!v) return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use YYYY-MM-DD date format",
          });
          return z.NEVER;
        }
        if (!isValidCalendarDate(v)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid delivery date",
          });
          return z.NEVER;
        }
        return v;
      }),

    // Idempotency key preventing duplicate enquiry creation on retry
    clientRequestId: z.string().uuid("Valid client request identifier is required"),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "product" && !data.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productId"],
        message: "A verified product selection is required for product-specific RFQs",
      });
    }
    if (data.mode === "general" && !data.sellerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sellerId"],
        message: "Please select a verified stone supplier to receive this RFQ",
      });
    }
  });

export type RfqFormInput = z.input<typeof rfqFormSchema>;
export type RfqFormParsed = z.output<typeof rfqFormSchema>;

// ---------------------------------------------------------------------------
// Buyer Enquiry Status Transition Schema (/buyer/enquiries/[id])
// Matches `public.transition_enquiry_status` buyer permissions:
// - ('submitted' | 'viewed' | 'responding' | 'quoted') -> 'cancelled'
// - ('accepted' | 'rejected') -> 'closed'
// ---------------------------------------------------------------------------
export const buyerEnquiryTransitionSchema = z.object({
  enquiryId: z.string().uuid("Invalid enquiry identifier"),
  newStatus: z.enum(["cancelled", "closed"]),
  notes: optionalTrimmed(1000),
});

export type BuyerEnquiryTransitionInput = z.input<typeof buyerEnquiryTransitionSchema>;

// ---------------------------------------------------------------------------
// Buyer Quotation Decision Schema (/buyer/quotes/[id])
// Matches `public.quotations_guard` buyer transitions:
// - 'sent' -> 'viewed' | 'accepted' | 'rejected'
// - 'viewed' -> 'accepted' | 'rejected'
// ---------------------------------------------------------------------------
export const buyerQuotationDecisionSchema = z.object({
  quotationId: z.string().uuid("Invalid quotation identifier"),
  decision: z.enum(["viewed", "accepted", "rejected"]),
});

export type BuyerQuotationDecisionInput = z.input<typeof buyerQuotationDecisionSchema>;

// ---------------------------------------------------------------------------
// Buyer Password Update Schema (/buyer/settings)
// ---------------------------------------------------------------------------
export const buyerPasswordChangeSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type BuyerPasswordChangeInput = z.input<typeof buyerPasswordChangeSchema>;
