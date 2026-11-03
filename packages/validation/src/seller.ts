import { z } from "zod";
import { BUSINESS_TYPES, PRICE_TYPES } from "@stone/types";

export const CATALOG_UNITS = [
  "sq_ft",
  "sq_m",
  "piece",
  "ton",
  "metric_ton",
  "slab",
  "box",
  "custom",
] as const;
export type CatalogUnit = (typeof CATALOG_UNITS)[number];

export const STOCK_STATUSES = [
  "in_stock",
  "limited",
  "out_of_stock",
  "made_to_order",
] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const VERIFICATION_DOCUMENT_TYPES = [
  "gst_certificate",
  "pan_card",
  "business_registration",
  "trade_license",
  "address_proof",
  "other",
] as const;
export type VerificationDocumentType = (typeof VERIFICATION_DOCUMENT_TYPES)[number];

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalPositiveNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((val, ctx) => {
    if (val === null || val === undefined || val === "") return null;
    const n = typeof val === "number" ? val : Number(String(val).trim());
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a positive number greater than 0",
      });
      return z.NEVER;
    }
    return Math.round(n * 1000) / 1000;
  });

const optionalNonNegativeInt = (max = 3650) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val, ctx) => {
      if (val === null || val === undefined || val === "") return null;
      const n = typeof val === "number" ? val : Number(String(val).trim());
      if (!Number.isInteger(n) || n < 0 || n > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Must be a whole number between 0 and ${max}`,
        });
        return z.NEVER;
      }
      return n;
    });

// ---------------------------------------------------------------------------
// Seller Onboarding & Business Profile Schema (/seller/profile)
// ---------------------------------------------------------------------------
export const sellerProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(200, "Business name cannot exceed 200 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(SLUG_REGEX, "Slug may only contain lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  ownerName: optionalTrimmed(120),
  businessType: z.enum(BUSINESS_TYPES, {
    errorMap: () => ({ message: "Please select a valid business classification" }),
  }),
  description: optionalTrimmed(4500),
  businessEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid business email address")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9()\-\s]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^[+0-9()\-\s]{7,20}$/, "Enter a valid WhatsApp number")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v || v.length === 0) return null;
      if (!GSTIN_REGEX.test(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid 15-character GSTIN (e.g. 08AABCU9603R1ZM)",
        });
        return z.NEVER;
      }
      return v;
    }),
  website: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v || v.length === 0) return null;
      const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
      try {
        const parsed = new URL(withProto);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Invalid protocol");
        }
        return parsed.toString().replace(/\/$/, "");
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid website URL (e.g. https://yourcompany.com)",
        });
        return z.NEVER;
      }
    }),
  businessAddress: optionalTrimmed(300),
  city: optionalTrimmed(100),
  state: optionalTrimmed(100),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Country must be a 2-letter ISO code (e.g. IN)")
    .default("IN"),
  pincode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\-\s]{3,12}$/, "Enter a valid PIN / postal code")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  yearsInBusiness: optionalNonNegativeInt(300),
  hasManufacturing: z.boolean().default(false),
  hasQuarry: z.boolean().default(false),
  hasExport: z.boolean().default(false),
  productCategories: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  showWebsitePublicly: z.boolean().default(true),
  acceptBulkExportEnquiries: z.boolean().default(true),
});

export type SellerProfileInput = z.input<typeof sellerProfileSchema>;
export type SellerProfileParsed = z.output<typeof sellerProfileSchema>;

// ---------------------------------------------------------------------------
// Storefront Settings Schema (/seller/store)
// ---------------------------------------------------------------------------
export const storeSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(100)
    .regex(SLUG_REGEX, "Store slug may only contain lowercase letters, numbers, and hyphens"),
  businessType: z.enum(BUSINESS_TYPES),
  description: optionalTrimmed(4500),
  city: optionalTrimmed(100),
  state: optionalTrimmed(100),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .default("IN"),
  website: sellerProfileSchema.shape.website,
  yearsInBusiness: optionalNonNegativeInt(300),
  hasManufacturing: z.boolean().default(false),
  hasQuarry: z.boolean().default(false),
  hasExport: z.boolean().default(false),
  productCategories: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  showWebsitePublicly: z.boolean().default(true),
  acceptBulkExportEnquiries: z.boolean().default(true),
});

export type StoreSettingsInput = z.input<typeof storeSettingsSchema>;

// ---------------------------------------------------------------------------
// Product Specification Item & Full Product Form Schema (/seller/products/*)
// ---------------------------------------------------------------------------
export const productSpecificationItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Specification name is required")
    .max(100, "Specification name max 100 chars"),
  value: z
    .string()
    .trim()
    .min(1, "Specification value is required")
    .max(500, "Specification value max 500 chars"),
});

export const productFormSchema = z
  .object({
    // Section A: Basic Information
    name: z
      .string()
      .trim()
      .min(3, "Product name must be at least 3 characters")
      .max(200, "Product name cannot exceed 200 characters"),
    sku: optionalTrimmed(80),
    categoryId: z
      .string()
      .uuid("Invalid category")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v && v.length > 0 ? v : null)),
    subcategoryId: z
      .string()
      .uuid("Invalid subcategory")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v && v.length > 0 ? v : null)),
    description: optionalTrimmed(10000),
    materialType: optionalTrimmed(100),
    stoneOrigin: optionalTrimmed(150),

    // Section B: Stone Specifications
    colour: optionalTrimmed(80),
    finish: optionalTrimmed(100),
    thickness: optionalPositiveNumber,
    length: optionalPositiveNumber,
    width: optionalPositiveNumber,
    availableSizes: optionalTrimmed(400),
    surfaceTreatment: optionalTrimmed(300),
    customSpecifications: z.array(productSpecificationItemSchema).max(30).default([]),

    // Section C: Pricing
    priceType: z.enum(PRICE_TYPES).default("fixed"),
    price: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .transform((val, ctx) => {
        if (val === null || val === undefined || val === "") return null;
        const n = typeof val === "number" ? val : Number(String(val).trim());
        if (!Number.isFinite(n) || n < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Price must be 0 or greater",
          });
          return z.NEVER;
        }
        return Math.round(n * 100) / 100;
      }),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code")
      .default("INR"),
    unit: z.enum(CATALOG_UNITS).default("sq_ft"),
    minimumOrderQuantity: optionalPositiveNumber,

    // Section D: Inventory
    stockStatus: z.enum(STOCK_STATUSES).default("in_stock"),
    availableQuantity: optionalTrimmed(200),
    leadTime: optionalNonNegativeInt(365),
    packagingInfo: optionalTrimmed(400),

    // Section F: SEO
    seoTitle: optionalTrimmed(160),
    seoDescription: optionalTrimmed(320),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(160)
      .regex(SLUG_REGEX, "Slug may only contain lowercase letters, numbers, and hyphens")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v && v.length > 0 ? v : null)),

    // Submission intent
    intent: z.enum(["draft", "pending_review"]).default("draft"),
  })
  .superRefine((data, ctx) => {
    if (data.priceType !== "on_request" && (data.price === null || data.price === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Price is required unless Price Type is 'On Request'",
      });
    }
    const seen = new Set<string>();
    data.customSpecifications.forEach((spec, index) => {
      const key = spec.name.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customSpecifications", index, "name"],
          message: `Duplicate specification "${spec.name}"`,
        });
      }
      seen.add(key);
    });
  });

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormParsed = z.output<typeof productFormSchema>;

// ---------------------------------------------------------------------------
// Enquiry Transition Schema (/seller/enquiries/[id])
// ---------------------------------------------------------------------------
export const sellerEnquiryTransitionSchema = z.object({
  enquiryId: z.string().uuid(),
  newStatus: z.enum(["viewed", "responding", "rejected", "closed"]),
  notes: optionalTrimmed(2000),
});

// ---------------------------------------------------------------------------
// Quotation & Line Items Schema (/seller/quotes)
// ---------------------------------------------------------------------------
export const quotationLineItemInputSchema = z.object({
  productId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: z
    .string()
    .trim()
    .min(1, "Item description is required")
    .max(1000, "Description cannot exceed 1000 characters"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.enum(CATALOG_UNITS).default("sq_ft"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
});

export const quotationFormSchema = z.object({
  quotationId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  enquiryId: z.string().uuid("Select a valid enquiry"),
  items: z.array(quotationLineItemInputSchema).min(1, "Add at least one line item"),
  taxAmount: z.coerce.number().min(0, "Tax cannot be negative").default(0),
  shippingCharges: z.coerce.number().min(0, "Shipping charges cannot be negative").default(0),
  discountAmount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default("INR"),
  validUntil: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid expiration date",
        });
        return z.NEVER;
      }
      return d.toISOString();
    }),
  terms: optionalTrimmed(4000),
  sendImmediately: z.boolean().default(false),
});

export type QuotationFormInput = z.input<typeof quotationFormSchema>;
export type QuotationFormParsed = z.output<typeof quotationFormSchema>;

