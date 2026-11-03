import { Badge, VerifiedBadge } from "@stone/ui";
import type {
  EnquiryStatus,
  OrderStatus,
  PaymentStatus,
  PriceType,
  QuotationStatus,
  VerificationStatus,
} from "@stone/types";
import type { StockStatus } from "@stone/validation";
import {
  ENQUIRY_STATUS_LABELS,
  MODERATION_STATUS_LABELS,
  PRICE_TYPE_LABELS,
  QUOTATION_STATUS_LABELS,
  STOCK_STATUS_LABELS,
  UNIT_LABELS,
  VERIFICATION_STATUS_LABELS,
  type ModerationStatus,
} from "@/features/seller/seller-meta";

export function ModerationStatusBadge({ status }: { status: ModerationStatus }) {
  const variantMap: Record<
    ModerationStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    draft: "secondary",
    pending_review: "warning",
    approved: "success",
    rejected: "destructive",
    archived: "outline",
  };

  return (
    <Badge variant={variantMap[status] ?? "secondary"}>
      {MODERATION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  if (status === "verified") {
    return <VerifiedBadge label="Verified Supplier" />;
  }

  const variantMap: Record<
    Exclude<VerificationStatus, "verified">,
    "secondary" | "warning" | "destructive"
  > = {
    draft: "secondary",
    submitted: "warning",
    under_review: "warning",
    rejected: "destructive",
    suspended: "destructive",
  };

  return (
    <Badge variant={variantMap[status] ?? "secondary"}>
      {VERIFICATION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const variantMap: Record<StockStatus, "success" | "warning" | "secondary" | "destructive"> = {
    in_stock: "success",
    limited: "warning",
    made_to_order: "secondary",
    out_of_stock: "destructive",
  };

  return (
    <Badge variant={variantMap[status] ?? "secondary"}>
      {STOCK_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  const variantMap: Record<
    EnquiryStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    submitted: "warning",
    viewed: "secondary",
    responding: "default",
    quoted: "warning",
    accepted: "success",
    rejected: "destructive",
    closed: "outline",
    cancelled: "destructive",
  };

  return (
    <Badge variant={variantMap[status] ?? "secondary"}>
      {ENQUIRY_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const variantMap: Record<
    QuotationStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    draft: "secondary",
    sent: "warning",
    viewed: "default",
    accepted: "success",
    rejected: "destructive",
    expired: "outline",
    revised: "outline",
    cancelled: "destructive",
  };

  return (
    <Badge variant={variantMap[status] ?? "secondary"}>
      {QUOTATION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variantMap: Record<
    OrderStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    pending_payment: "warning",
    confirmed: "default",
    processing: "secondary",
    dispatched: "default",
    delivered: "success",
    completed: "success",
    cancelled: "destructive",
  };

  const labelMap: Record<OrderStatus, string> = {
    pending_payment: "Pending Payment / Pro-Forma",
    confirmed: "Order Confirmed",
    processing: "Processing / Cutting",
    dispatched: "Consignment Dispatched",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <Badge variant={variantMap[status] ?? "secondary"}>
      {labelMap[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variantMap: Record<
    PaymentStatus,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  > = {
    pending: "outline",
    processing: "warning",
    paid: "success",
    failed: "destructive",
    refunded: "secondary",
  };

  const labelMap: Record<PaymentStatus, string> = {
    pending: "Offline Settlement Pending",
    processing: "Payment In Verification",
    paid: "Direct Settlement Paid",
    failed: "Payment Failed",
    refunded: "Refunded",
  };

  return (
    <Badge variant={variantMap[status] ?? "secondary"}>
      {labelMap[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

export function formatSellerPrice(
  priceType: PriceType,
  price: number | null,
  currency: string,
  unit: string,
): string {
  const unitLabel = UNIT_LABELS[unit as keyof typeof UNIT_LABELS] ?? unit.replace(/_/g, " ");
  if (priceType === "on_request" || price === null) {
    return "Price on Request";
  }
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(Number(price));

  if (priceType === "starting") {
    return `From ${formatted} / ${unitLabel}`;
  }
  if (priceType === "negotiable") {
    return `${formatted} / ${unitLabel} (Neg.)`;
  }
  return `${formatted} / ${unitLabel}`;
}

export function formatPriceTypeShort(priceType: PriceType): string {
  return PRICE_TYPE_LABELS[priceType] ?? priceType;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

