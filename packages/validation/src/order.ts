import { z } from "zod";
import { ADDRESS_TYPES, ORDER_STATUSES } from "@stone/types";

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const indianPinRegex = /^[1-9][0-9]{5}$/;
const intlPostalRegex = /^[A-Za-z0-9\s-]{3,12}$/;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Cannot exceed ${max} characters`)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null));

export const orderAddressSchema = z
  .object({
    contactName: z
      .string()
      .trim()
      .min(2, "Contact name must be at least 2 characters")
      .max(120, "Contact name cannot exceed 120 characters"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s\-()]{7,25}$/, "Enter a valid phone number")
      .refine(
        (v) => {
          const digits = v.replace(/\D/g, "");
          return digits.length >= 10 && digits.length <= 15;
        },
        "Phone number must contain between 10 and 15 digits",
      ),
    companyName: optionalTrimmed(160),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v && v.length > 0 ? v : null)),
    addressLine1: z
      .string()
      .trim()
      .min(5, "Address must be at least 5 characters")
      .max(250, "Address cannot exceed 250 characters"),
    addressLine2: optionalTrimmed(250),
    city: z
      .string()
      .trim()
      .min(2, "City is required")
      .max(100, "City cannot exceed 100 characters"),
    state: z
      .string()
      .trim()
      .min(2, "State is required")
      .max(100, "State cannot exceed 100 characters"),
    pincode: z
      .string()
      .trim()
      .min(3, "PIN / Postal code is required")
      .max(12, "Postal code cannot exceed 12 characters"),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Country must be a 2-letter ISO code")
      .default("IN"),
  })
  .superRefine((data, ctx) => {
    // 1. PIN / Postal code rule by country
    if (data.country === "IN") {
      if (!indianPinRegex.test(data.pincode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pincode"],
          message: "Indian delivery PIN code must be exactly 6 digits starting with 1-9",
        });
      }
    } else {
      if (!intlPostalRegex.test(data.pincode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pincode"],
          message: "International postal code must be between 3 and 12 alphanumeric characters",
        });
      }
    }

    // 2. GSTIN format rule when country is India
    if (data.gstin) {
      if (data.country === "IN" && !gstinRegex.test(data.gstin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gstin"],
          message: "Invalid GSTIN format. Expected 15-character alphanumeric format",
        });
      }
    }
  });

export type OrderAddressInput = z.input<typeof orderAddressSchema>;
export type OrderAddressParsed = z.output<typeof orderAddressSchema>;

// ---------------------------------------------------------------------------
// Buyer Saved Address Schema (`public.buyer_addresses`)
// ---------------------------------------------------------------------------
export const buyerAddressSchema = orderAddressSchema.and(
  z.object({
    id: z.string().uuid().optional(),
    label: optionalTrimmed(80),
    addressType: z.enum(ADDRESS_TYPES).default("both"),
    isDefault: z.boolean().default(false),
  }),
);

export type BuyerAddressInput = z.input<typeof buyerAddressSchema>;
export type BuyerAddressParsed = z.output<typeof buyerAddressSchema>;

// ---------------------------------------------------------------------------
// Buyer Quotation Acceptance Schema
// ---------------------------------------------------------------------------
export const buyerQuotationAcceptanceSchema = z
  .object({
    quotationId: z.string().uuid("Invalid quotation identifier"),
    billingAddress: orderAddressSchema,
    sameAsBilling: z.boolean().default(false),
    shippingAddress: orderAddressSchema.optional(),
    projectDeliveryNotes: optionalTrimmed(1000),
    saveAddresses: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.sameAsBilling && !data.shippingAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shippingAddress"],
        message: "Shipping address is required when different from billing address",
      });
    }
  });

export type BuyerQuotationAcceptanceInput = z.input<typeof buyerQuotationAcceptanceSchema>;
export type BuyerQuotationAcceptanceParsed = z.output<typeof buyerQuotationAcceptanceSchema>;

// ---------------------------------------------------------------------------
// Order Status Transition Schema (`public.transition_order_status`)
// ---------------------------------------------------------------------------
export const orderStatusTransitionSchema = z.object({
  orderId: z.string().uuid("Invalid order identifier"),
  newStatus: z.enum(ORDER_STATUSES),
  notes: optionalTrimmed(1000),
});

export type OrderStatusTransitionInput = z.input<typeof orderStatusTransitionSchema>;
export type OrderStatusTransitionParsed = z.output<typeof orderStatusTransitionSchema>;
