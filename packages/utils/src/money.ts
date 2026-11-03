import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@stone/types";

/**
 * Money is handled as integer minor units (e.g. paise) in calculations to
 * avoid floating-point drift. Currencies here use 2 minor digits.
 */
export function toMinor(amount: string | number): number {
  const n = typeof amount === "number" ? amount.toString() : amount.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(n)) {
    throw new RangeError(`Invalid monetary amount: ${n}`);
  }
  const negative = n.startsWith("-");
  const [whole = "0", frac = ""] = n.replace("-", "").split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return negative ? -minor : minor;
}

export function fromMinor(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function formatMoney(
  minor: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
}

export interface QuoteTotals {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}

/**
 * Quote total = (subtotal - discount) + tax on the discounted amount + shipping.
 * `taxRateBps` is in basis points (18% = 1800). Tax is rounded half-up.
 */
export function calculateQuoteTotals(input: {
  lines: ReadonlyArray<{ quantity: number; unitPriceMinor: number }>;
  discountMinor?: number;
  shippingMinor?: number;
  taxRateBps?: number;
}): QuoteTotals {
  const subtotalMinor = input.lines.reduce((sum, l) => {
    if (!Number.isInteger(l.unitPriceMinor) || l.quantity < 0) {
      throw new RangeError("Invalid quote line");
    }
    return sum + Math.round(l.quantity * l.unitPriceMinor);
  }, 0);
  const discount = input.discountMinor ?? 0;
  if (discount < 0 || discount > subtotalMinor) {
    throw new RangeError("Discount must be between 0 and the subtotal");
  }
  const taxable = subtotalMinor - discount;
  const taxMinor = Math.round((taxable * (input.taxRateBps ?? 0)) / 10000);
  const totalMinor = taxable + taxMinor + (input.shippingMinor ?? 0);
  return { subtotalMinor, taxMinor, totalMinor };
}
