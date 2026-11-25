import React from "react";
import { Badge, type BadgeTone } from "./Badge";
import {
  ENQUIRY_STATUS_LABELS,
  MODERATION_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
  STOCK_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  type ModerationStatus,
} from "../../lib/domain-meta";
import type {
  EnquiryStatus,
  OrderStatus,
  PaymentStatus,
  QuotationStatus,
  VerificationStatus,
} from "@stone/types";
import type { StockStatus } from "@stone/validation";

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus | string }) {
  const toneMap: Record<string, BadgeTone> = {
    submitted: "info",
    viewed: "copper",
    responding: "primary",
    quoted: "success",
    accepted: "success",
    rejected: "error",
    closed: "neutral",
    cancelled: "error",
  };
  return (
    <Badge
      label={ENQUIRY_STATUS_LABELS[status as EnquiryStatus] ?? status}
      tone={toneMap[status] ?? "neutral"}
    />
  );
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus | string }) {
  const toneMap: Record<string, BadgeTone> = {
    draft: "neutral",
    sent: "info",
    viewed: "copper",
    accepted: "success",
    rejected: "error",
    expired: "warning",
    revised: "neutral",
    cancelled: "error",
  };
  return (
    <Badge
      label={QUOTATION_STATUS_LABELS[status as QuotationStatus] ?? status}
      tone={toneMap[status] ?? "neutral"}
    />
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const toneMap: Record<string, BadgeTone> = {
    pending_payment: "warning",
    confirmed: "info",
    processing: "primary",
    dispatched: "copper",
    delivered: "success",
    completed: "success",
    cancelled: "error",
  };
  return (
    <Badge
      label={ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
      tone={toneMap[status] ?? "neutral"}
    />
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus | string }) {
  const toneMap: Record<string, BadgeTone> = {
    pending: "warning",
    processing: "info",
    paid: "success",
    failed: "error",
    refunded: "neutral",
  };
  return (
    <Badge
      label={PAYMENT_STATUS_LABELS[status as PaymentStatus] ?? status}
      tone={toneMap[status] ?? "neutral"}
    />
  );
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus | string }) {
  const toneMap: Record<string, BadgeTone> = {
    draft: "neutral",
    submitted: "info",
    under_review: "copper",
    verified: "success",
    rejected: "error",
    suspended: "error",
  };
  return (
    <Badge
      label={VERIFICATION_STATUS_LABELS[status as VerificationStatus] ?? status}
      tone={toneMap[status] ?? "neutral"}
    />
  );
}

export function ModerationStatusBadge({ status }: { status: ModerationStatus | string }) {
  const toneMap: Record<string, BadgeTone> = {
    draft: "neutral",
    pending_review: "warning",
    approved: "success",
    rejected: "error",
    archived: "neutral",
  };
  return (
    <Badge
      label={MODERATION_STATUS_LABELS[status as ModerationStatus] ?? status}
      tone={toneMap[status] ?? "neutral"}
    />
  );
}

export function StockStatusBadge({ status }: { status: StockStatus | string }) {
  const toneMap: Record<string, BadgeTone> = {
    in_stock: "success",
    limited: "warning",
    made_to_order: "info",
    out_of_stock: "error",
  };
  return (
    <Badge
      label={STOCK_STATUS_LABELS[status as StockStatus] ?? status}
      tone={toneMap[status] ?? "neutral"}
    />
  );
}
