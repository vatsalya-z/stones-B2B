import type {
  BusinessType,
  EnquiryStatus,
  OrderStatus,
  PaymentStatus,
  PriceType,
  QuotationStatus,
  VerificationStatus,
} from "@stone/types";
import { BUSINESS_TYPES } from "@stone/types";
import type { CatalogUnit, StockStatus, VerificationDocumentType } from "@stone/validation";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  manufacturer: "Stone Manufacturer / Processor",
  mine_owner: "Mine / Quarry Owner",
  stone_supplier: "Stone Supplier / Distributor",
  exporter: "Stone Exporter",
  wholesaler: "Wholesaler / Stockyard",
  retailer: "Showroom / Retailer",
  contractor: "Stone Contractor / Fabricator",
  architect: "Architectural Practice",
  interior_designer: "Interior Design Studio",
  builder: "Developer / Builder",
  importer: "Stone Importer",
};

export const BUYER_TYPE_OPTIONS: ReadonlyArray<{ value: BusinessType; label: string }> = [
  { value: "architect", label: "Architectural Practice" },
  { value: "interior_designer", label: "Interior Design Studio" },
  { value: "contractor", label: "Stone Contractor / Fabricator" },
  { value: "builder", label: "Real Estate Developer / Builder" },
  { value: "importer", label: "International Stone Importer" },
  { value: "wholesaler", label: "Stone Wholesaler / Stockyard" },
  { value: "retailer", label: "Tile & Stone Showroom / Retailer" },
  { value: "stone_supplier", label: "Stone Distributor / Trader" },
  { value: "manufacturer", label: "Processing & Cut-to-Size Unit" },
  { value: "exporter", label: "Export Buying House" },
  { value: "mine_owner", label: "Quarry / Mine Operator" },
];

export const UNIT_LABELS: Record<CatalogUnit, string> = {
  sq_ft: "Sq. Ft.",
  sq_m: "Sq. Meter",
  piece: "Piece",
  ton: "Ton",
  metric_ton: "Metric Ton (MT)",
  slab: "Slab",
  box: "Box / Crate",
  custom: "Custom Unit",
};

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: "Fixed Ex-Factory Price",
  starting: "Starting From Price",
  negotiable: "Negotiable Price",
  on_request: "Price On Request (POA)",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  limited: "Limited Lot",
  made_to_order: "Made to Order",
  out_of_stock: "Out of Stock",
};

export type ModerationStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived";

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  draft: "Not Submitted",
  submitted: "Submitted for Review",
  under_review: "Under Admin Review",
  verified: "Verified Supplier",
  rejected: "Action Required",
  suspended: "Account Suspended",
};

export const DOCUMENT_TYPE_LABELS: Record<VerificationDocumentType, string> = {
  gst_certificate: "GST Registration Certificate",
  pan_card: "Business / Proprietor PAN Card",
  business_registration: "Business Registration / Udyam",
  trade_license: "Quarry / Mining Lease or License",
  address_proof: "Factory / Facility Address Proof",
  other: "IEC / Export / Other Document",
};

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  submitted: "New",
  viewed: "Viewed",
  responding: "In Discussion",
  quoted: "Quoted",
  accepted: "Quote Accepted",
  rejected: "Declined",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent to Buyer",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Declined",
  expired: "Expired",
  revised: "Revised",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  processing: "Processing",
  dispatched: "Dispatched",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Payment Pending",
  processing: "Verifying Payment",
  paid: "Paid (Escrow Verified)",
  failed: "Payment Failed",
  refunded: "Refunded",
};

export const STONE_MATERIAL_SUGGESTIONS = [
  "Marble",
  "Granite",
  "Sandstone",
  "Limestone",
  "Quartzite",
  "Slate",
  "Travertine",
  "Onyx",
  "Basalt",
  "Semi-Precious Stone",
] as const;

export const STONE_FINISH_SUGGESTIONS = [
  "Polished",
  "Honed",
  "Leathered",
  "Flamed",
  "Natural Cleft",
  "Sandblasted",
  "Bush Hammered",
  "Brushed / Antique",
  "Tumbled",
  "Sawn / Unpolished",
] as const;

export const STONE_COLOUR_SUGGESTIONS = [
  "White",
  "Black",
  "Beige",
  "Grey",
  "Green",
  "Brown",
  "Red",
  "Pink",
  "Gold / Yellow",
  "Blue",
  "Multi-Colour",
] as const;

export const COUNTRY_OPTIONS = [
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "IT", name: "Italy" },
  { code: "TR", name: "Turkey" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "OM", name: "Oman" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "SG", name: "Singapore" },
] as const;

export function formatMoneyAmount(
  amount: number | string | null | undefined,
  currency = "INR",
): string {
  const num = typeof amount === "number" ? amount : Number(amount ?? 0);
  if (!Number.isFinite(num)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

export function formatUnitLabel(unit: string | null | undefined): string {
  if (!unit) return "unit";
  return UNIT_LABELS[unit as CatalogUnit] ?? unit.replace(/_/g, " ");
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Buyer Extended Metadata inside `public.profiles.address`
// ---------------------------------------------------------------------------
const BUYER_META_DIVIDER = "--- Buyer Profile Metadata ---";

export interface DecodedBuyerAddress {
  cleanAddress: string;
  companyName: string;
  buyerType: BusinessType | "";
  whatsappNumber: string;
  pincode: string;
}

export function decodeBuyerAddress(rawAddress: string | null | undefined): DecodedBuyerAddress {
  if (!rawAddress) {
    return { cleanAddress: "", companyName: "", buyerType: "", whatsappNumber: "", pincode: "" };
  }
  const dividerIdx = rawAddress.indexOf(BUYER_META_DIVIDER);
  if (dividerIdx === -1) {
    return {
      cleanAddress: rawAddress.trim(),
      companyName: "",
      buyerType: "",
      whatsappNumber: "",
      pincode: "",
    };
  }
  const cleanAddress = rawAddress.slice(0, dividerIdx).trim();
  const metaSection = rawAddress.slice(dividerIdx + BUYER_META_DIVIDER.length);

  let companyName = "";
  let buyerType: BusinessType | "" = "";
  let whatsappNumber = "";
  let pincode = "";

  for (const line of metaSection.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Company:")) {
      companyName = trimmed.slice("Company:".length).trim();
    } else if (trimmed.startsWith("Buyer Type:")) {
      const candidate = trimmed.slice("Buyer Type:".length).trim() as BusinessType;
      if ((BUSINESS_TYPES as readonly string[]).includes(candidate)) {
        buyerType = candidate;
      }
    } else if (trimmed.startsWith("WhatsApp:")) {
      whatsappNumber = trimmed.slice("WhatsApp:".length).trim();
    } else if (trimmed.startsWith("PIN Code:")) {
      pincode = trimmed.slice("PIN Code:".length).trim();
    }
  }

  return { cleanAddress, companyName, buyerType, whatsappNumber, pincode };
}

export function encodeBuyerAddress(input: {
  cleanAddress?: string | null;
  companyName?: string | null;
  buyerType?: BusinessType | null | "";
  whatsappNumber?: string | null;
  pincode?: string | null;
}): string | null {
  const street = input.cleanAddress?.trim() ?? "";
  const metaLines: string[] = [];

  if (input.companyName?.trim()) metaLines.push(`Company: ${input.companyName.trim()}`);
  if (input.buyerType && (BUSINESS_TYPES as readonly string[]).includes(input.buyerType)) {
    metaLines.push(`Buyer Type: ${input.buyerType}`);
  }
  if (input.whatsappNumber?.trim()) metaLines.push(`WhatsApp: ${input.whatsappNumber.trim()}`);
  if (input.pincode?.trim()) metaLines.push(`PIN Code: ${input.pincode.trim()}`);

  if (!street && metaLines.length === 0) return null;
  if (metaLines.length === 0) return street;

  const parts: string[] = [];
  if (street) parts.push(street);
  parts.push(`${BUYER_META_DIVIDER}\n${metaLines.join("\n")}`);
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// RFQ Technical Description Encoding/Decoding (`public.enquiries.description`)
// ---------------------------------------------------------------------------
const RFQ_SPEC_HEADER = "--- RFQ Technical & Delivery Specifications ---";

export interface RfqSpecificationMeta {
  isRfq: boolean;
  rfqMode: "product" | "general" | null;
  cleanDescription: string;
  categorySlug: string | null;
  materialType: string | null;
  stoneOrigin: string | null;
  colour: string | null;
  finish: string | null;
  thickness: string | null;
  length: string | null;
  width: string | null;
  surfaceRequirements: string | null;
  customSpecifications: string | null;
  deliveryCountry: string | null;
  deliveryState: string | null;
  deliveryCity: string | null;
  deliveryAddress: string | null;
}

export function buildDeliveryLocationSummary(input: {
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  deliveryCountry?: string | null;
}): string | null {
  const parts = [
    input.deliveryAddress?.trim(),
    input.deliveryCity?.trim(),
    input.deliveryState?.trim(),
    input.deliveryCountry?.trim()?.toUpperCase(),
  ].filter((p): p is string => Boolean(p && p.length > 0));
  return parts.length > 0 ? parts.join(", ").slice(0, 300) : null;
}

export function encodeRfqDescription(input: {
  mode: "product" | "general";
  cleanDescription: string;
  categorySlug?: string | null;
  materialType?: string | null;
  stoneOrigin?: string | null;
  colour?: string | null;
  finish?: string | null;
  thickness?: string | null;
  length?: string | null;
  width?: string | null;
  surfaceRequirements?: string | null;
  customSpecifications?: string | null;
  deliveryCountry?: string | null;
  deliveryState?: string | null;
  deliveryCity?: string | null;
  deliveryAddress?: string | null;
}): string {
  const sanitizeLine = (v?: string | null) => (v ? v.replace(/\r?\n+/g, " ").trim() : "");
  const specLines: string[] = [
    `Submission Type: ${
      input.mode === "product" ? "Product-Specific RFQ" : "General Custom Stone RFQ"
    }`,
  ];
  const pushIf = (label: string, val?: string | null) => {
    const clean = sanitizeLine(val);
    if (clean) specLines.push(`${label}: ${clean}`);
  };
  pushIf("Category", input.categorySlug);
  pushIf("Material Type", input.materialType);
  pushIf("Required Stone Origin", input.stoneOrigin);
  pushIf("Colour", input.colour);
  pushIf("Finish", input.finish);
  pushIf("Thickness", input.thickness);
  pushIf("Length", input.length);
  pushIf("Width", input.width);
  pushIf("Surface Requirements", input.surfaceRequirements);
  pushIf("Custom Specifications", input.customSpecifications);
  pushIf("Delivery Country", input.deliveryCountry);
  pushIf("Delivery State", input.deliveryState);
  pushIf("Delivery City", input.deliveryCity);
  pushIf("Delivery Address", input.deliveryAddress);

  const narrative = input.cleanDescription.trim();
  const block = `${RFQ_SPEC_HEADER}\n${specLines.join("\n")}`;
  const maxNarrativeLen = Math.max(100, 4980 - block.length);
  return `${narrative.slice(0, maxNarrativeLen)}\n\n${block}`.slice(0, 5000);
}

export function decodeRfqDescription(raw: string | null | undefined): RfqSpecificationMeta {
  const empty: RfqSpecificationMeta = {
    isRfq: false,
    rfqMode: null,
    cleanDescription: raw?.trim() ?? "",
    categorySlug: null,
    materialType: null,
    stoneOrigin: null,
    colour: null,
    finish: null,
    thickness: null,
    length: null,
    width: null,
    surfaceRequirements: null,
    customSpecifications: null,
    deliveryCountry: null,
    deliveryState: null,
    deliveryCity: null,
    deliveryAddress: null,
  };
  if (!raw) return empty;
  const idx = raw.indexOf(RFQ_SPEC_HEADER);
  if (idx === -1) return empty;

  const meta: RfqSpecificationMeta = {
    ...empty,
    isRfq: true,
    rfqMode: "general",
    cleanDescription: raw.slice(0, idx).trim(),
  };

  for (const line of raw.slice(idx + RFQ_SPEC_HEADER.length).split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim();
    if (!val) continue;
    switch (key) {
      case "submission type":
        meta.rfqMode = val.toLowerCase().includes("product") ? "product" : "general";
        break;
      case "category":
        meta.categorySlug = val;
        break;
      case "material type":
        meta.materialType = val;
        break;
      case "required stone origin":
        meta.stoneOrigin = val;
        break;
      case "colour":
        meta.colour = val;
        break;
      case "finish":
        meta.finish = val;
        break;
      case "thickness":
        meta.thickness = val;
        break;
      case "length":
        meta.length = val;
        break;
      case "width":
        meta.width = val;
        break;
      case "surface requirements":
        meta.surfaceRequirements = val;
        break;
      case "custom specifications":
        meta.customSpecifications = val;
        break;
      case "delivery country":
        meta.deliveryCountry = val;
        break;
      case "delivery state":
        meta.deliveryState = val;
        break;
      case "delivery city":
        meta.deliveryCity = val;
        break;
      case "delivery address":
        meta.deliveryAddress = val;
        break;
    }
  }
  return meta;
}

// ---------------------------------------------------------------------------
// Seller Capabilities Encoding/Decoding (`public.seller_profiles.description`)
// ---------------------------------------------------------------------------
export interface SellerCapabilitiesMeta {
  cleanDescription: string;
  hasManufacturing: boolean;
  hasQuarry: boolean;
  hasExport: boolean;
  productCategories: string[];
  showWebsitePublicly: boolean;
  acceptBulkExportEnquiries: boolean;
}

const CAP_PREFIX = "Capabilities: ";
const CAT_PREFIX = "Stone Categories: ";
const PREF_PREFIX = "Trade Preferences: ";

export function decodeSellerDescription(raw: string | null | undefined): SellerCapabilitiesMeta {
  if (!raw) {
    return {
      cleanDescription: "",
      hasManufacturing: false,
      hasQuarry: false,
      hasExport: false,
      productCategories: [],
      showWebsitePublicly: true,
      acceptBulkExportEnquiries: true,
    };
  }
  const bodyLines: string[] = [];
  let hasManufacturing = false;
  let hasQuarry = false;
  let hasExport = false;
  let productCategories: string[] = [];
  let showWebsitePublicly = true;
  let acceptBulkExportEnquiries = true;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(CAP_PREFIX)) {
      const items = trimmed
        .slice(CAP_PREFIX.length)
        .split("•")
        .map((s) => s.trim().toLowerCase());
      hasManufacturing = items.some((i) => i.includes("manufacturing"));
      hasQuarry = items.some((i) => i.includes("quarry") || i.includes("mine"));
      hasExport = items.some((i) => i.includes("export"));
    } else if (trimmed.startsWith(CAT_PREFIX)) {
      productCategories = trimmed
        .slice(CAT_PREFIX.length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (trimmed.startsWith(PREF_PREFIX)) {
      const lower = trimmed.slice(PREF_PREFIX.length).toLowerCase();
      acceptBulkExportEnquiries = !lower.includes("domestic enquiries only");
      showWebsitePublicly = !lower.includes("hide public website");
    } else {
      bodyLines.push(line);
    }
  }

  return {
    cleanDescription: bodyLines.join("\n").trim(),
    hasManufacturing,
    hasQuarry,
    hasExport,
    productCategories,
    showWebsitePublicly,
    acceptBulkExportEnquiries,
  };
}

export function encodeSellerDescription(input: {
  cleanDescription: string | null;
  hasManufacturing: boolean;
  hasQuarry: boolean;
  hasExport: boolean;
  productCategories: string[];
  showWebsitePublicly?: boolean;
  acceptBulkExportEnquiries?: boolean;
}): string | null {
  const parts: string[] = [];
  if (input.cleanDescription?.trim()) parts.push(input.cleanDescription.trim());

  const metaLines: string[] = [];
  const caps: string[] = [];
  if (input.hasManufacturing) caps.push("In-House Manufacturing Unit");
  if (input.hasQuarry) caps.push("Direct Quarry / Mine Ownership");
  if (input.hasExport) caps.push("Global Export & Container Loading");
  if (caps.length > 0) metaLines.push(`${CAP_PREFIX}${caps.join(" • ")}`);

  const cats = input.productCategories.map((c) => c.trim()).filter(Boolean);
  if (cats.length > 0) metaLines.push(`${CAT_PREFIX}${cats.join(", ")}`);

  const prefs: string[] = [];
  prefs.push(
    input.acceptBulkExportEnquiries === false
      ? "Domestic Enquiries Only"
      : "Open for Bulk & Export RFQs",
  );
  if (input.showWebsitePublicly === false) prefs.push("Hide Public Website");
  metaLines.push(`${PREF_PREFIX}${prefs.join(" • ")}`);

  if (metaLines.length > 0) parts.push(metaLines.join("\n"));
  const combined = parts.join("\n\n").trim();
  return combined.length > 0 ? combined.slice(0, 5000) : null;
}

// ---------------------------------------------------------------------------
// State Machine & Verification Readiness Helpers (Aligned with DB triggers/RPCs)
// ---------------------------------------------------------------------------
export function getAllowedBuyerEnquiryTransitions(
  currentStatus: EnquiryStatus,
): Array<{ status: "cancelled" | "closed"; label: string; destructive: boolean }> {
  if (
    currentStatus === "submitted" ||
    currentStatus === "viewed" ||
    currentStatus === "responding" ||
    currentStatus === "quoted"
  ) {
    return [{ status: "cancelled", label: "Cancel Enquiry", destructive: true }];
  }
  if (currentStatus === "accepted" || currentStatus === "rejected") {
    return [{ status: "closed", label: "Close Enquiry", destructive: false }];
  }
  return [];
}

export function getAllowedSellerEnquiryTransitions(
  status: EnquiryStatus,
): Array<{ status: "viewed" | "responding" | "rejected" | "closed"; label: string }> {
  switch (status) {
    case "submitted":
      return [
        { status: "viewed", label: "Mark as Viewed" },
        { status: "responding", label: "Start Discussion" },
        { status: "rejected", label: "Decline Lead" },
      ];
    case "viewed":
      return [
        { status: "responding", label: "Start Discussion" },
        { status: "rejected", label: "Decline Lead" },
      ];
    case "responding":
      return [{ status: "rejected", label: "Decline Lead" }];
    case "quoted":
    case "accepted":
    case "rejected":
      return [{ status: "closed", label: "Close Enquiry" }];
    default:
      return [];
  }
}

/**
 * Payment Model B — Buyer Order Actions:
 * Strictly limited to cancelling unpaid orders or confirming delivery after dispatch.
 */
export function getAllowedBuyerOrderTransitions(
  status: OrderStatus,
): Array<{ status: "cancelled" | "delivered"; label: string; destructive: boolean }> {
  if (status === "pending_payment") {
    return [{ status: "cancelled", label: "Cancel Order", destructive: true }];
  }
  if (status === "dispatched") {
    return [{ status: "delivered", label: "Confirm Delivery Received", destructive: false }];
  }
  return [];
}

/**
 * Payment Model B — Seller Fulfillment Actions:
 * Sellers may ONLY transition fulfillment (`confirmed` -> `processing` -> `dispatched`).
 * Sellers can NEVER mutate `payment_status`.
 */
export function getAllowedSellerOrderTransitions(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): Array<{ status: "confirmed" | "processing" | "dispatched"; label: string }> {
  if (status === "confirmed") {
    return [{ status: "processing", label: "Mark as Processing" }];
  }
  if (status === "processing") {
    return [{ status: "dispatched", label: "Mark as Dispatched" }];
  }
  if (status === "pending_payment" && paymentStatus === "paid") {
    return [{ status: "confirmed", label: "Confirm Order" }];
  }
  return [];
}

export function isQuotationExpired(
  validUntil: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!validUntil) return false;
  const expiry = new Date(validUntil);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() < now.getTime();
}

export function getBuyerQuotationActionEligibility(
  status: QuotationStatus,
  validUntil: string | null | undefined,
  now: Date = new Date(),
) {
  const expired = isQuotationExpired(validUntil, now);
  const decidable = status === "sent" || status === "viewed";
  if (!decidable) {
    return {
      canMarkViewed: false,
      canAccept: false,
      canReject: false,
      isExpired: expired || status === "expired",
      ineligibleReason: `Quotation is currently "${QUOTATION_STATUS_LABELS[status] ?? status}".`,
    };
  }
  if (expired) {
    return {
      canMarkViewed: status === "sent",
      canAccept: false,
      canReject: true,
      isExpired: true,
      ineligibleReason: "This quotation's validity date has passed.",
    };
  }
  return {
    canMarkViewed: status === "sent",
    canAccept: true,
    canReject: true,
    isExpired: false,
    ineligibleReason: null,
  };
}

export function checkVerificationReadiness(
  profile: {
    business_name?: string | null;
    business_email?: string | null;
    phone?: string | null;
    gst_number?: string | null;
    business_address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    verification_status?: string | null;
  } | null,
  documentCount: number,
) {
  const checks = [
    {
      label: "Business name & classification",
      complete: Boolean(profile?.business_name && profile.business_name.trim().length >= 2),
    },
    {
      label: "Commercial email & primary phone",
      complete: Boolean(profile?.business_email && profile?.phone),
    },
    {
      label: "Valid 15-character GSTIN",
      complete: Boolean(profile?.gst_number),
    },
    {
      label: "Complete facility address (Address, City, State, PIN)",
      complete: Boolean(
        profile?.business_address && profile?.city && profile?.state && profile?.pincode,
      ),
    },
    {
      label: "At least one verification document uploaded",
      complete: documentCount >= 1,
    },
  ];
  const canSubmitStatus =
    profile?.verification_status === "draft" || profile?.verification_status === "rejected";
  return {
    isReady: canSubmitStatus && checks.every((c) => c.complete),
    canSubmitStatus,
    checks,
  };
}

export function computeQuotationTotals(input: {
  items: ReadonlyArray<{
    productId?: string | null;
    description: string;
    quantity: number;
    unit: CatalogUnit;
    unitPrice: number;
  }>;
  discountAmount?: number;
  taxAmount?: number;
  shippingCharges?: number;
}) {
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const toPaise = (n: number) => Math.round(round2(n) * 100);
  const fromPaise = (p: number) => Number((p / 100).toFixed(2));

  let subtotalPaise = 0;
  const items = input.items.map((item) => {
    const qty = Math.round(item.quantity * 1000) / 1000;
    const unitPrice = round2(item.unitPrice);
    const totalPrice = round2(qty * unitPrice);
    subtotalPaise += toPaise(totalPrice);
    return {
      productId: item.productId ?? null,
      description: item.description.trim(),
      quantity: qty,
      unit: item.unit,
      unitPrice,
      totalPrice,
    };
  });

  const discountPaise = toPaise(Math.max(0, input.discountAmount ?? 0));
  if (discountPaise > subtotalPaise) {
    throw new RangeError("Discount amount cannot exceed the quotation subtotal.");
  }
  const taxPaise = toPaise(Math.max(0, input.taxAmount ?? 0));
  const shippingPaise = toPaise(Math.max(0, input.shippingCharges ?? 0));
  const totalPaise = subtotalPaise - discountPaise + taxPaise + shippingPaise;

  return {
    items,
    subtotal: fromPaise(subtotalPaise),
    discountAmount: fromPaise(discountPaise),
    taxAmount: fromPaise(taxPaise),
    shippingCharges: fromPaise(shippingPaise),
    totalAmount: fromPaise(totalPaise),
  };
}

export function buildProductSpecificationRows(input: {
  productId: string;
  availableSizes?: string | null;
  surfaceTreatment?: string | null;
  availableQuantity?: string | null;
  packagingInfo?: string | null;
  customSpecifications?: ReadonlyArray<{ name: string; value: string }>;
}) {
  const out: Array<{
    product_id: string;
    specification_name: string;
    specification_value: string;
    display_order: number;
  }> = [];
  const used = new Set<string>();
  let order = 1;
  const push = (name: string, val?: string | null) => {
    const n = name.trim();
    const v = val?.trim();
    if (!n || !v) return;
    if (used.has(n.toLowerCase())) return;
    used.add(n.toLowerCase());
    out.push({
      product_id: input.productId,
      specification_name: n.slice(0, 100),
      specification_value: v.slice(0, 500),
      display_order: order++,
    });
  };
  push("Available Sizes", input.availableSizes);
  push("Surface Treatment", input.surfaceTreatment);
  push("Available Quantity", input.availableQuantity);
  push("Packaging Details", input.packagingInfo);
  for (const c of input.customSpecifications ?? []) {
    push(c.name, c.value);
  }
  return out;
}
