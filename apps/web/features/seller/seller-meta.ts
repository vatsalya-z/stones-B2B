import type {
  BusinessType,
  EnquiryStatus,
  PriceType,
  QuotationStatus,
  VerificationStatus,
} from "@stone/types";
import type {
  CatalogUnit,
  StockStatus,
  VerificationDocumentType,
} from "@stone/validation";

// ---------------------------------------------------------------------------
// Friendly Display Labels & Constants
// ---------------------------------------------------------------------------

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
  limited: "Limited Lot Available",
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
  rejected: "Action Required (Rejected)",
  suspended: "Account Suspended",
};

export const DOCUMENT_TYPE_LABELS: Record<VerificationDocumentType, string> = {
  gst_certificate: "GST Registration Certificate",
  pan_card: "Business / Proprietor PAN Card",
  business_registration: "Business Registration / Incorporation / Udyam",
  trade_license: "Quarry / Mining Lease or Trade License",
  address_proof: "Factory / Facility Address Proof",
  other: "IEC / Export / Other Approved Document",
};

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  submitted: "New",
  viewed: "Viewed",
  responding: "In Discussion",
  quoted: "Quoted",
  accepted: "Quote Accepted",
  rejected: "Declined",
  closed: "Closed",
  cancelled: "Cancelled by Buyer",
};

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent to Buyer",
  viewed: "Viewed by Buyer",
  accepted: "Accepted",
  rejected: "Declined by Buyer",
  expired: "Expired",
  revised: "Superseded (Revised)",
  cancelled: "Cancelled",
};

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

// Max upload limits aligned with supabase/migrations/20261030100500_storage.sql
export const MAX_PRODUCT_IMAGE_BYTES =
  (Number(process.env.NEXT_PUBLIC_MAX_PRODUCT_IMAGE_MB) || 5) * 1024 * 1024;
export const MAX_SELLER_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_SELLER_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_VERIFICATION_DOC_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Seller Capabilities & Public Preferences Encoding inside `description`
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

  const lines = raw.split("\n");
  const bodyLines: string[] = [];
  let hasManufacturing = false;
  let hasQuarry = false;
  let hasExport = false;
  let productCategories: string[] = [];
  let showWebsitePublicly = true;
  let acceptBulkExportEnquiries = true;

  for (const line of lines) {
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
  if (input.cleanDescription?.trim()) {
    parts.push(input.cleanDescription.trim());
  }

  const metaLines: string[] = [];
  const caps: string[] = [];
  if (input.hasManufacturing) caps.push("In-House Manufacturing Unit");
  if (input.hasQuarry) caps.push("Direct Quarry / Mine Ownership");
  if (input.hasExport) caps.push("Global Export & Container Loading");
  if (caps.length > 0) {
    metaLines.push(`${CAP_PREFIX}${caps.join(" • ")}`);
  }

  const cats = input.productCategories.map((c) => c.trim()).filter(Boolean);
  if (cats.length > 0) {
    metaLines.push(`${CAT_PREFIX}${cats.join(", ")}`);
  }

  const prefs: string[] = [];
  if (input.acceptBulkExportEnquiries === false) {
    prefs.push("Domestic Enquiries Only");
  } else {
    prefs.push("Open for Bulk & Export RFQs");
  }
  if (input.showWebsitePublicly === false) {
    prefs.push("Hide Public Website");
  }
  if (prefs.length > 0) {
    metaLines.push(`${PREF_PREFIX}${prefs.join(" • ")}`);
  }

  if (metaLines.length > 0) {
    parts.push(metaLines.join("\n"));
  }

  const combined = parts.join("\n\n").trim();
  return combined.length > 0 ? combined.slice(0, 5000) : null;
}

// ---------------------------------------------------------------------------
// Structured Product Specifications Mapping (`product_specifications` table)
// ---------------------------------------------------------------------------

export const STRUCTURED_SPEC_KEYS = {
  availableSizes: "Available Sizes",
  surfaceTreatment: "Surface Treatment",
  availableQuantity: "Available Quantity",
  packagingInfo: "Packaging Details",
  seoTitle: "SEO Title",
  seoDescription: "SEO Description",
} as const;

const RESERVED_LOWER_KEYS = new Set(
  Object.values(STRUCTURED_SPEC_KEYS).map((k) => k.toLowerCase()),
);

export interface ExtractedProductSpecs {
  availableSizes: string;
  surfaceTreatment: string;
  availableQuantity: string;
  packagingInfo: string;
  seoTitle: string;
  seoDescription: string;
  customSpecifications: Array<{ name: string; value: string }>;
}

export function extractProductSpecifications(
  rows: ReadonlyArray<{ specification_name: string; specification_value: string; display_order?: number }>,
): ExtractedProductSpecs {
  const byLower = new Map<string, string>();
  const customSpecifications: Array<{ name: string; value: string }> = [];

  const sorted = [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  for (const row of sorted) {
    const key = row.specification_name.trim().toLowerCase();
    if (RESERVED_LOWER_KEYS.has(key)) {
      byLower.set(key, row.specification_value);
    } else {
      customSpecifications.push({
        name: row.specification_name,
        value: row.specification_value,
      });
    }
  }

  return {
    availableSizes: byLower.get(STRUCTURED_SPEC_KEYS.availableSizes.toLowerCase()) ?? "",
    surfaceTreatment: byLower.get(STRUCTURED_SPEC_KEYS.surfaceTreatment.toLowerCase()) ?? "",
    availableQuantity: byLower.get(STRUCTURED_SPEC_KEYS.availableQuantity.toLowerCase()) ?? "",
    packagingInfo: byLower.get(STRUCTURED_SPEC_KEYS.packagingInfo.toLowerCase()) ?? "",
    seoTitle: byLower.get(STRUCTURED_SPEC_KEYS.seoTitle.toLowerCase()) ?? "",
    seoDescription: byLower.get(STRUCTURED_SPEC_KEYS.seoDescription.toLowerCase()) ?? "",
    customSpecifications,
  };
}

export function buildProductSpecificationRows(input: {
  productId: string;
  availableSizes?: string | null;
  surfaceTreatment?: string | null;
  availableQuantity?: string | null;
  packagingInfo?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  customSpecifications?: ReadonlyArray<{ name: string; value: string }>;
}): Array<{
  product_id: string;
  specification_name: string;
  specification_value: string;
  display_order: number;
}> {
  const out: Array<{
    product_id: string;
    specification_name: string;
    specification_value: string;
    display_order: number;
  }> = [];
  const usedNames = new Set<string>();
  let order = 1;

  const pushSpec = (name: string, val: string | null | undefined) => {
    const trimmedName = name.trim();
    const trimmedVal = val?.trim();
    if (!trimmedName || !trimmedVal) return;
    const lower = trimmedName.toLowerCase();
    if (usedNames.has(lower)) return;
    usedNames.add(lower);
    out.push({
      product_id: input.productId,
      specification_name: trimmedName.slice(0, 100),
      specification_value: trimmedVal.slice(0, 500),
      display_order: order++,
    });
  };

  pushSpec(STRUCTURED_SPEC_KEYS.availableSizes, input.availableSizes);
  pushSpec(STRUCTURED_SPEC_KEYS.surfaceTreatment, input.surfaceTreatment);
  pushSpec(STRUCTURED_SPEC_KEYS.availableQuantity, input.availableQuantity);
  pushSpec(STRUCTURED_SPEC_KEYS.packagingInfo, input.packagingInfo);

  for (const custom of input.customSpecifications ?? []) {
    pushSpec(custom.name, custom.value);
  }

  pushSpec(STRUCTURED_SPEC_KEYS.seoTitle, input.seoTitle);
  pushSpec(STRUCTURED_SPEC_KEYS.seoDescription, input.seoDescription);

  return out;
}

// ---------------------------------------------------------------------------
// Seller Verification Readiness Checklist (mirrors submit_seller_verification)
// ---------------------------------------------------------------------------

export interface VerificationReadiness {
  isReady: boolean;
  canSubmitStatus: boolean;
  checks: Array<{ label: string; complete: boolean; field?: string }>;
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
): VerificationReadiness {
  const checks = [
    {
      label: "Business name & classification",
      complete: Boolean(profile?.business_name && profile.business_name.trim().length >= 2),
      field: "businessName",
    },
    {
      label: "Commercial email & primary phone",
      complete: Boolean(profile?.business_email && profile?.phone),
      field: "businessEmail",
    },
    {
      label: "Valid 15-character GSTIN",
      complete: Boolean(profile?.gst_number),
      field: "gstNumber",
    },
    {
      label: "Complete facility address (Address, City, State, PIN)",
      complete: Boolean(
        profile?.business_address && profile?.city && profile?.state && profile?.pincode,
      ),
      field: "businessAddress",
    },
    {
      label: "At least one verification document uploaded",
      complete: documentCount >= 1,
      field: "documents",
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

// ---------------------------------------------------------------------------
// Allowed Seller Enquiry Transitions (mirrors public.transition_enquiry_status)
// ---------------------------------------------------------------------------

export function getAllowedSellerEnquiryTransitions(
  status: EnquiryStatus,
): Array<{ status: "viewed" | "responding" | "rejected" | "closed"; label: string }> {
  switch (status) {
    case "submitted":
      return [
        { status: "viewed", label: "Mark as Viewed" },
        { status: "responding", label: "Respond / Start Discussion" },
        { status: "rejected", label: "Decline Enquiry" },
      ];
    case "viewed":
      return [
        { status: "responding", label: "Respond / Start Discussion" },
        { status: "rejected", label: "Decline Enquiry" },
      ];
    case "responding":
      return [{ status: "rejected", label: "Decline Enquiry" }];
    case "quoted":
    case "accepted":
    case "rejected":
      return [{ status: "closed", label: "Close Enquiry" }];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Deterministic Quotation Arithmetic (matches PostgreSQL numeric(14,2) rules)
// ---------------------------------------------------------------------------

export interface ComputedQuotationLine {
  productId: string | null;
  description: string;
  quantity: number;
  unit: CatalogUnit;
  unitPrice: number;
  totalPrice: number;
}

export interface ComputedQuotationSummary {
  items: ComputedQuotationLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCharges: number;
  totalAmount: number;
}

/**
 * Computes line totals and quotation totals using exact 2-decimal rounding:
 * - line total_price = round(quantity * unit_price, 2)
 * - subtotal = sum(line.total_price)
 * - total_amount = subtotal - discount_amount + tax_amount + shipping_charges
 * Rejects discount_amount > subtotal (matching `quotations_discount_le_subtotal`).
 */
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
}): ComputedQuotationSummary {
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const toPaise = (n: number) => Math.round(round2(n) * 100);
  const fromPaise = (p: number) => Number((p / 100).toFixed(2));

  let subtotalPaise = 0;
  const items: ComputedQuotationLine[] = input.items.map((item) => {
    const qty = Math.round(item.quantity * 1000) / 1000;
    const unitPrice = round2(item.unitPrice);
    // Matches Postgres `round(quantity * unit_price, 2)`
    const lineTotal = round2(qty * unitPrice);
    subtotalPaise += toPaise(lineTotal);
    return {
      productId: item.productId ?? null,
      description: item.description.trim(),
      quantity: qty,
      unit: item.unit,
      unitPrice,
      totalPrice: lineTotal,
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

