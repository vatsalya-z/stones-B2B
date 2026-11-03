import { describe, expect, it } from "vitest";
import { calculateQuoteTotals, fromMinor, parsePagination, slugify, toMinor } from "../src";

describe("slugify", () => {
  it("normalises text", () => {
    expect(slugify("  Makrana White Marble & Co. ")).toBe("makrana-white-marble-and-co");
    expect(slugify("Café Stone")).toBe("cafe-stone");
  });
});

describe("money", () => {
  it("converts without float drift", () => {
    expect(toMinor("19.99")).toBe(1999);
    expect(toMinor(0.1)).toBe(10);
    expect(fromMinor(1999)).toBe("19.99");
    expect(fromMinor(-5)).toBe("-0.05");
  });
  it("rejects invalid amounts", () => {
    expect(() => toMinor("1.234")).toThrow(RangeError);
    expect(() => toMinor("abc")).toThrow(RangeError);
  });
  it("calculates quote totals", () => {
    const t = calculateQuoteTotals({
      lines: [{ quantity: 100, unitPriceMinor: 15000 }],
      discountMinor: 100000,
      shippingMinor: 50000,
      taxRateBps: 1800,
    });
    expect(t).toEqual({ subtotalMinor: 1500000, taxMinor: 252000, totalMinor: 1702000 });
  });
  it("rejects discount above subtotal", () => {
    expect(() =>
      calculateQuoteTotals({ lines: [{ quantity: 1, unitPriceMinor: 100 }], discountMinor: 200 }),
    ).toThrow(RangeError);
  });
});

describe("parsePagination", () => {
  it("bounds values", () => {
    expect(parsePagination("abc", "9999")).toMatchObject({ page: 1, pageSize: 100, from: 0 });
    expect(parsePagination("3", "10")).toMatchObject({ from: 20, to: 29 });
  });
});
