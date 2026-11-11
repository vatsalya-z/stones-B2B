import type {
  BusinessType,
  EnquiryStatus,
  QuotationStatus,
  VerificationStatus,
} from "@stone/types";
import { BUSINESS_TYPES } from "@stone/types";
import type { CatalogUnit } from "@stone/validation";
import {
  COUNTRY_OPTIONS,
  UNIT_LABELS,
} from "@/features/seller/seller-meta";

export const MAX_ENQUIRY_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB matching `20261030100500_storage.sql`
export const ALLOWED_ENQUIRY_ATTACHMENT_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const CURRENCY_OPTIONS = [
  { code: "INR", label: "INR (₹) — Indian Rupee" },
  { code: "USD", label: "USD ($) — US Dollar" },
  { code: "EUR", label: "EUR (€) — Euro" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "GBP", label: "GBP (£) — British Pound" },
] as const;

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

export function formatCountryName(code: string | null | undefined): string {
  if (!code) return "India";
  const upper = code.trim().toUpperCase();
  const found = COUNTRY_OPTIONS.find((c) => c.code === upper);
  return found ? `${found.name} (${found.code})` : upper;
}

// ---------------------------------------------------------------------------
// 1. Buyer Extended Contact Metadata in `public.profiles.address`
// Preserves street address human-readably while storing optional extended B2B
// buyer contact fields without requiring unapproved production schema drift.
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
    return {
      cleanAddress: "",
      companyName: "",
      buyerType: "",
      whatsappNumber: "",
      pincode: "",
    };
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

  return {
    cleanAddress,
    companyName,
    buyerType,
    whatsappNumber,
    pincode,
  };
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

  if (input.companyName?.trim()) {
    metaLines.push(`Company: ${input.companyName.trim()}`);
  }
  if (input.buyerType && (BUSINESS_TYPES as readonly string[]).includes(input.buyerType)) {
    metaLines.push(`Buyer Type: ${input.buyerType}`);
  }
  if (input.whatsappNumber?.trim()) {
    metaLines.push(`WhatsApp: ${input.whatsappNumber.trim()}`);
  }
  if (input.pincode?.trim()) {
    metaLines.push(`PIN Code: ${input.pincode.trim()}`);
  }

  if (!street && metaLines.length === 0) {
    return null;
  }

  if (metaLines.length === 0) {
    return street;
  }

  const parts: string[] = [];
  if (street) parts.push(street);
  parts.push(`${BUYER_META_DIVIDER}\n${metaLines.join("\n")}`);
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// 2. RFQ Structured Specification Encoding in `public.enquiries.description`
// Renders cleanly for sellers in `/seller/enquiries/[id]` AND decodes back into
// structured stone specifications in `/buyer/rfqs/[id]` & `/buyer/enquiries/[id]`.
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
  const sanitizeLine = (v?: string | null) =>
    v ? v.replace(/\r?\n+/g, " ").trim() : "";

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
  const clippedNarrative = narrative.slice(0, maxNarrativeLen);

  return `${clippedNarrative}\n\n${block}`.slice(0, 5000);
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

  const cleanDescription = raw.slice(0, idx).trim();
  const specBlock = raw.slice(idx + RFQ_SPEC_HEADER.length);

  const meta: RfqSpecificationMeta = {
    ...empty,
    isRfq: true,
    rfqMode: "general",
    cleanDescription,
  };

  for (const line of specBlock.split("\n")) {
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
// 3. Buyer Enquiry & Quotation Transition Rules (Authoritative DB Alignment)
// ---------------------------------------------------------------------------

export interface AllowedBuyerEnquiryAction {
  status: "cancelled" | "closed";
  label: string;
  description: string;
  destructive: boolean;
}

/**
 * Mirrors `public.transition_enquiry_status` buyer permissions in
 * `20261030100300_commerce.sql`:
 * - ('submitted', 'viewed', 'responding', 'quoted') -> 'cancelled'
 * - ('accepted', 'rejected') -> 'closed'
 */
export function getAllowedBuyerEnquiryTransitions(
  currentStatus: EnquiryStatus,
): AllowedBuyerEnquiryAction[] {
  if (
    currentStatus === "submitted" ||
    currentStatus === "viewed" ||
    currentStatus === "responding" ||
    currentStatus === "quoted"
  ) {
    return [
      {
        status: "cancelled",
        label: "Cancel Enquiry",
        description:
          "Withdraw this requirement. Once cancelled, the supplier cannot submit new quotations for this enquiry.",
        destructive: true,
      },
    ];
  }

  if (currentStatus === "accepted" || currentStatus === "rejected") {
    return [
      {
        status: "closed",
        label: "Close Enquiry",
        description:
          "Archive this enquiry as commercially concluded while preserving full quotation history.",
        destructive: false,
      },
    ];
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

export interface BuyerQuotationActionEligibility {
  canMarkViewed: boolean;
  canAccept: boolean;
  canReject: boolean;
  isExpired: boolean;
  ineligibleReason: string | null;
}

/**
 * Mirrors `public.quotations_guard` (`20261030100300_commerce.sql`):
 * - Buyer may transition `sent` -> `viewed | accepted | rejected`
 * - Buyer may transition `viewed` -> `accepted | rejected`
 * - Accepting when `valid_until < now()` is forbidden (`quotation has expired`).
 */
export function getBuyerQuotationActionEligibility(
  status: QuotationStatus,
  validUntil: string | null | undefined,
  now: Date = new Date(),
): BuyerQuotationActionEligibility {
  const expired = isQuotationExpired(validUntil, now);
  const decidableStatus = status === "sent" || status === "viewed";

  if (!decidableStatus) {
    const reasonMap: Partial<Record<QuotationStatus, string>> = {
      accepted: "You have already accepted this quotation.",
      rejected:
        "You declined this quotation. The supplier may issue a revised quotation on the enquiry.",
      expired: "This quotation has expired and can no longer be accepted.",
      cancelled: "This quotation was cancelled by the supplier.",
      revised: "This quotation has been superseded by a newer revision.",
      draft: "Draft quotations are not actionable.",
    };
    return {
      canMarkViewed: false,
      canAccept: false,
      canReject: false,
      isExpired: expired || status === "expired",
      ineligibleReason: reasonMap[status] ?? "This quotation is no longer open for decision.",
    };
  }

  if (expired) {
    return {
      canMarkViewed: status === "sent",
      canAccept: false,
      canReject: true,
      isExpired: true,
      ineligibleReason:
        "This quotation's validity date has passed. Ask the supplier for a refreshed quotation.",
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

export interface ParsedCommercialTerms {
  paymentTerms: string | null;
  deliveryTerms: string | null;
  validityNote: string | null;
  additionalConditions: string | null;
}

export function parseQuotationCommercialTerms(
  terms: string | null | undefined,
  validUntil: string | null | undefined,
): ParsedCommercialTerms {
  let paymentTerms: string | null = null;
  let deliveryTerms: string | null = null;
  let validityNote: string | null = validUntil
    ? new Date(validUntil).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;
  const otherLines: string[] = [];

  if (terms?.trim()) {
    for (const rawLine of terms.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      const lower = line.toLowerCase();
      if (!paymentTerms && (lower.startsWith("payment terms:") || lower.startsWith("payment:"))) {
        paymentTerms = line.slice(line.indexOf(":") + 1).trim() || null;
      } else if (
        !deliveryTerms &&
        (lower.startsWith("delivery terms:") ||
          lower.startsWith("delivery:") ||
          lower.startsWith("incoterms:") ||
          lower.startsWith("shipping terms:"))
      ) {
        deliveryTerms = line.slice(line.indexOf(":") + 1).trim() || null;
      } else if (lower.startsWith("validity:")) {
        const parsedVal = line.slice(line.indexOf(":") + 1).trim();
        if (parsedVal) validityNote = parsedVal;
      } else {
        otherLines.push(line);
      }
    }
  }

  return {
    paymentTerms,
    deliveryTerms,
    validityNote,
    additionalConditions: otherLines.length > 0 ? otherLines.join("\n") : null,
  };
}

// ---------------------------------------------------------------------------
// 4. Quotation Comparison Compatibility & Difference Engine
// Never compares incompatible currencies as equivalent and never declares a
// "best supplier" based solely on price.
// ---------------------------------------------------------------------------

export interface ComparableQuotationInput {
  id: string;
  quoteNumber: string;
  enquiryId: string;
  sellerName: string;
  sellerVerificationStatus: VerificationStatus | null;
  currency: string;
  subtotal: number;
  taxAmount: number;
  shippingCharges: number;
  discountAmount: number;
  totalAmount: number;
  validUntil: string | null;
  status: QuotationStatus;
  totalQuantity: number;
  primaryUnit: string | null;
  hasMixedUnits: boolean;
  effectiveUnitPrice: number | null;
}

export interface QuotationComparisonAnalysis {
  count: number;
  sameEnquiry: boolean;
  currencies: string[];
  hasUniformCurrency: boolean;
  hasComparableQuantities: boolean;
  isDirectlyComparable: boolean;
  lowestTotalQuotationId: string | null;
  lowestTotalAmount: number | null;
  highestTotalAmount: number | null;
  priceSpread: number | null;
  deltasById: Record<
    string,
    {
      isLowestEligible: boolean;
      deltaAmount: number | null;
      deltaPercent: number | null;
      isExpired: boolean;
    }
  >;
  incompatibilityReasons: string[];
}

export function analyzeQuotationComparison(
  quotes: ReadonlyArray<ComparableQuotationInput>,
  now: Date = new Date(),
): QuotationComparisonAnalysis {
  const currencies = Array.from(
    new Set(quotes.map((q) => (q.currency || "INR").trim().toUpperCase())),
  );
  const enquiryIds = Array.from(new Set(quotes.map((q) => q.enquiryId)));
  const sameEnquiry = enquiryIds.length === 1;
  const hasUniformCurrency = currencies.length === 1;

  const units = Array.from(
    new Set(quotes.map((q) => (q.primaryUnit || "").trim().toLowerCase()).filter(Boolean)),
  );
  const anyMixedUnits = quotes.some((q) => q.hasMixedUnits);
  const quantities = quotes.map((q) => q.totalQuantity).filter((n) => Number.isFinite(n) && n > 0);
  const minQty = quantities.length > 0 ? Math.min(...quantities) : 0;
  const maxQty = quantities.length > 0 ? Math.max(...quantities) : 0;

  const hasComparableQuantities =
    quotes.length >= 2 &&
    !anyMixedUnits &&
    units.length === 1 &&
    quantities.length === quotes.length &&
    Math.abs(maxQty - minQty) <= 0.001;

  const incompatibilityReasons: string[] = [];
  if (quotes.length < 2) {
    incompatibilityReasons.push("Select at least two quotations to run a side-by-side comparison.");
  }
  if (!hasUniformCurrency && quotes.length >= 2) {
    incompatibilityReasons.push(
      `Incompatible currencies detected (${currencies.join(", ")}). Totals remain in their original currencies and lowest-price highlighting is disabled.`,
    );
  }
  if (!hasComparableQuantities && quotes.length >= 2) {
    incompatibilityReasons.push(
      "Quoted quantities or units of measure differ across these quotations. Lowest-total highlighting is disabled so unequal scopes are not treated as equivalent.",
    );
  }
  if (!sameEnquiry && quotes.length >= 2) {
    incompatibilityReasons.push(
      "Selected quotations belong to different enquiries. Verify technical specifications and delivery destinations independently.",
    );
  }

  const isDirectlyComparable =
    quotes.length >= 2 && hasUniformCurrency && hasComparableQuantities;

  // Prefer active/eligible or accepted quotes when identifying the lowest comparable total
  const activePool = isDirectlyComparable
    ? quotes.filter(
        (q) =>
          (q.status === "sent" || q.status === "viewed" || q.status === "accepted") &&
          !isQuotationExpired(q.validUntil, now),
      )
    : [];

  let lowestTotalQuotationId: string | null = null;
  let lowestTotalAmount: number | null = null;
  let highestTotalAmount: number | null = null;

  if (isDirectlyComparable && activePool.length >= 1) {
    const sorted = [...activePool].sort((a, b) => a.totalAmount - b.totalAmount);
    lowestTotalQuotationId = sorted[0]?.id ?? null;
    lowestTotalAmount = sorted[0]?.totalAmount ?? null;
    const allTotals = quotes.map((q) => q.totalAmount);
    highestTotalAmount = Math.max(...allTotals);
  }

  const priceSpread =
    isDirectlyComparable && lowestTotalAmount !== null && highestTotalAmount !== null
      ? Math.round((highestTotalAmount - lowestTotalAmount) * 100) / 100
      : null;

  const deltasById: QuotationComparisonAnalysis["deltasById"] = {};
  for (const q of quotes) {
    const expired = isQuotationExpired(q.validUntil, now) || q.status === "expired";
    if (isDirectlyComparable && lowestTotalAmount !== null) {
      const diff = Math.round((q.totalAmount - lowestTotalAmount) * 100) / 100;
      const pct =
        lowestTotalAmount > 0
          ? Math.round((diff / lowestTotalAmount) * 1000) / 10
          : 0;
      deltasById[q.id] = {
        isLowestEligible: q.id === lowestTotalQuotationId,
        deltaAmount: diff,
        deltaPercent: pct,
        isExpired: expired,
      };
    } else {
      deltasById[q.id] = {
        isLowestEligible: false,
        deltaAmount: null,
        deltaPercent: null,
        isExpired: expired,
      };
    }
  }

  return {
    count: quotes.length,
    sameEnquiry,
    currencies,
    hasUniformCurrency,
    hasComparableQuantities,
    isDirectlyComparable,
    lowestTotalQuotationId,
    lowestTotalAmount,
    highestTotalAmount,
    priceSpread,
    deltasById,
    incompatibilityReasons,
  };
}

// ---------------------------------------------------------------------------
// 5. Pure-TypeScript Commercial Quotation PDF Generator (`%PDF-1.4`)
// Produces a clean, print-ready A4 B2B quotation document from real DB records.
// Explicitly marked as a Commercial Quotation (never a fake invoice/receipt).
// ---------------------------------------------------------------------------

export interface QuotationPdfDocumentInput {
  quoteNumber: string;
  status: QuotationStatus;
  createdAt: string;
  validUntil: string | null;
  currency: string;
  enquiryTitle: string;
  enquiryReference: string;
  seller: {
    businessName: string;
    location: string;
    isVerified: boolean;
  };
  buyer: {
    name: string;
    deliveryLocation: string | null;
  };
  items: ReadonlyArray<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCharges: number;
  totalAmount: number;
  terms: string | null;
}

function pdfSafeText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/₹/g, "INR ")
    .replace(/€/g, "EUR ")
    .replace(/£/g, "GBP ")
    .replace(/[•·]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .trim();
}

function pdfMoney(amount: number, currency: string): string {
  const num = Number.isFinite(amount) ? amount : 0;
  return `${currency.toUpperCase()} ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word.slice(0, maxChars);
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word.slice(0, maxChars);
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function generateQuotationPdfBytes(doc: QuotationPdfDocumentInput): Uint8Array {
  const ops: string[] = [];

  const drawText = (
    text: string,
    x: number,
    y: number,
    size = 10,
    bold = false,
    rgb: [number, number, number] = [0.11, 0.1, 0.09],
  ) => {
    const safe = pdfSafeText(text);
    if (!safe) return;
    ops.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x.toFixed(
        1,
      )} ${y.toFixed(1)} Td (${safe}) Tj ET`,
    );
  };

  const drawRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fillRgb: [number, number, number],
  ) => {
    ops.push(
      `q ${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg ${x.toFixed(1)} ${y.toFixed(
        1,
      )} ${w.toFixed(1)} ${h.toFixed(1)} re f Q`,
    );
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    gray = 0.85,
    width = 0.75,
  ) => {
    ops.push(
      `q ${gray} G ${width} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(
        1,
      )} ${y2.toFixed(1)} l S Q`,
    );
  };

  // Top Header Banner (A4: 595 x 842 pt)
  drawRect(0, 772, 595, 70, [0.11, 0.1, 0.09]);
  drawText("STONESDEKHO", 42, 812, 18, true, [0.96, 0.62, 0.04]);
  drawText(
    "COMMERCIAL STONE QUOTATION (NOT AN INVOICE)",
    42,
    792,
    9,
    false,
    [0.85, 0.83, 0.81],
  );
  drawText(`Quote #: ${doc.quoteNumber}`, 390, 812, 12, true, [1, 1, 1]);
  drawText(
    `Status: ${doc.status.toUpperCase()}`,
    390,
    794,
    9,
    false,
    [0.92, 0.9, 0.88],
  );

  // Metadata Strip
  drawRect(42, 722, 511, 36, [0.97, 0.96, 0.95]);
  const issuedDate = doc.createdAt ? doc.createdAt.slice(0, 10) : "N/A";
  const validDate = doc.validUntil ? doc.validUntil.slice(0, 10) : "Open / As per terms";
  drawText(`Issued: ${issuedDate}`, 52, 742, 9, true);
  drawText(`Valid Until: ${validDate}`, 200, 742, 9, true);
  drawText(`Currency: ${doc.currency.toUpperCase()}`, 390, 742, 9, true);
  drawText(
    `Enquiry Ref: ${doc.enquiryReference} - ${doc.enquiryTitle.slice(0, 56)}`,
    52,
    729,
    8.5,
    false,
    [0.35, 0.33, 0.31],
  );

  // Seller & Buyer Columns
  let y = 698;
  drawText("SUPPLIER (FROM)", 42, y, 8.5, true, [0.47, 0.44, 0.42]);
  drawText("BUYER (PREPARED FOR)", 310, y, 8.5, true, [0.47, 0.44, 0.42]);
  y -= 15;
  drawText(doc.seller.businessName.slice(0, 42), 42, y, 10.5, true);
  drawText(doc.buyer.name.slice(0, 42), 310, y, 10.5, true);
  y -= 13;
  drawText(
    doc.seller.location || "India",
    42,
    y,
    9,
    false,
    [0.34, 0.32, 0.3],
  );
  drawText(
    `Delivery: ${(doc.buyer.deliveryLocation || "As specified in enquiry").slice(0, 42)}`,
    310,
    y,
    9,
    false,
    [0.34, 0.32, 0.3],
  );
  y -= 13;
  drawText(
    doc.seller.isVerified ? "StonesDekho Verified Supplier" : "Supplier Account",
    42,
    y,
    8.5,
    true,
    [0.71, 0.33, 0.04],
  );

  // Line Items Table Header
  y -= 24;
  drawRect(42, y - 6, 511, 22, [0.16, 0.14, 0.13]);
  drawText("#", 50, y + 2, 8.5, true, [1, 1, 1]);
  drawText("STONE SPECIFICATION / ITEM DESCRIPTION", 72, y + 2, 8.5, true, [1, 1, 1]);
  drawText("QTY & UNIT", 315, y + 2, 8.5, true, [1, 1, 1]);
  drawText("UNIT PRICE", 395, y + 2, 8.5, true, [1, 1, 1]);
  drawText("LINE TOTAL", 475, y + 2, 8.5, true, [1, 1, 1]);

  y -= 22;
  const maxItemsOnPage = Math.min(doc.items.length, 14);
  for (let i = 0; i < maxItemsOnPage; i++) {
    const item = doc.items[i]!;
    const wrapped = wrapText(item.description, 42).slice(0, 2);
    const rowHeight = wrapped.length > 1 ? 26 : 18;
    if (i % 2 === 1) {
      drawRect(42, y - (rowHeight - 12), 511, rowHeight, [0.985, 0.98, 0.975]);
    }
    drawText(String(i + 1), 50, y, 8.5, false);
    drawText(wrapped[0] ?? "Natural Stone Item", 72, y, 8.5, true);
    if (wrapped[1]) {
      drawText(wrapped[1], 72, y - 10, 8, false, [0.35, 0.33, 0.31]);
    }
    drawText(
      `${item.quantity} ${formatUnitLabel(item.unit)}`,
      315,
      y,
      8.5,
      false,
    );
    drawText(pdfMoney(item.unitPrice, doc.currency), 395, y, 8.5, false);
    drawText(pdfMoney(item.totalPrice, doc.currency), 475, y, 8.5, true);
    drawLine(42, y - (rowHeight - 10), 553, y - (rowHeight - 10), 0.9, 0.5);
    y -= rowHeight;
  }

  if (doc.items.length > maxItemsOnPage) {
    drawText(
      `+ ${doc.items.length - maxItemsOnPage} additional line item(s) on StonesDekho portal quotation record.`,
      72,
      y,
      8.5,
      false,
      [0.45, 0.42, 0.4],
    );
    y -= 16;
  }

  // Financial Breakdown Box
  y -= 10;
  const summaryTop = y;
  const summaryRows: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: "Subtotal", value: pdfMoney(doc.subtotal, doc.currency) },
    { label: "Discount", value: `- ${pdfMoney(doc.discountAmount, doc.currency)}` },
    { label: "Tax / GST", value: pdfMoney(doc.taxAmount, doc.currency) },
    { label: "Shipping / Freight", value: pdfMoney(doc.shippingCharges, doc.currency) },
    {
      label: "FINAL QUOTED TOTAL",
      value: pdfMoney(doc.totalAmount, doc.currency),
      highlight: true,
    },
  ];

  let sy = summaryTop;
  for (const row of summaryRows) {
    if (row.highlight) {
      drawRect(330, sy - 6, 223, 22, [0.99, 0.95, 0.88]);
      drawText(row.label, 340, sy + 2, 9.5, true, [0.57, 0.25, 0.05]);
      drawText(row.value, 458, sy + 2, 9.5, true, [0.11, 0.1, 0.09]);
      sy -= 24;
    } else {
      drawText(row.label, 340, sy, 8.5, false, [0.35, 0.33, 0.31]);
      drawText(row.value, 458, sy, 8.5, true);
      sy -= 15;
    }
  }

  // Commercial Terms Column (Left of Financial Summary or Below)
  let ty = summaryTop;
  drawText("COMMERCIAL TERMS & CONDITIONS", 42, ty, 8.5, true, [0.47, 0.44, 0.42]);
  ty -= 14;
  const termLines = doc.terms?.trim()
    ? doc.terms
        .split("\n")
        .flatMap((line) => wrapText(line, 46))
        .slice(0, 7)
    : ["Standard B2B stone supply terms as mutually agreed on StonesDekho."];
  for (const line of termLines) {
    drawText(line, 42, ty, 8, false, [0.28, 0.26, 0.24]);
    ty -= 11;
  }

  // Footer Disclaimer
  drawLine(42, 66, 553, 66, 0.82, 0.75);
  drawText(
    "COMMERCIAL QUOTATION ONLY - NOT A TAX INVOICE, PROFORMA RECEIPT, OR PAYMENT CONFIRMATION.",
    42,
    50,
    8,
    true,
    [0.45, 0.42, 0.4],
  );
  drawText(
    `Generated from authenticated StonesDekho record (${doc.quoteNumber}). Verify current status online before procurement.`,
    42,
    38,
    7.5,
    false,
    [0.5, 0.48, 0.46],
  );

  const contentStream = ops.join("\n");
  const encoder = new TextEncoder();
  const streamBytesLength = encoder.encode(contentStream).byteLength;

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    `6 0 obj\n<< /Length ${streamBytesLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  const header = "%PDF-1.4\n";
  const parts: string[] = [header];
  const offsets: number[] = [0];
  let byteCursor = encoder.encode(header).byteLength;

  for (const obj of objects) {
    offsets.push(byteCursor);
    parts.push(obj);
    byteCursor += encoder.encode(obj).byteLength;
  }

  const xrefOffset = byteCursor;
  const xrefLines = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((off) => `${String(off).padStart(10, "0")} 00000 n `),
  ];
  const xrefBlock = `${xrefLines.join("\n")}\n`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  parts.push(xrefBlock, trailer);
  return encoder.encode(parts.join(""));
}
