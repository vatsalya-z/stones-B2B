import { describe, expect, it } from "vitest";
import {
  buyerQuotationAcceptanceSchema,
  orderAddressSchema,
  orderStatusTransitionSchema,
} from "../src/order";

describe("Phase 2 Order Validation Schemas", () => {
  const validDomesticAddress = {
    contactName: "Rajesh Sharma",
    phone: "+91 98765 43210",
    companyName: "Sharma Stone Works",
    gstin: "08ABCDE1234F1Z5",
    addressLine1: "Plot 14, RIICO Industrial Area",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  it("validates a well-formed domestic Indian address", () => {
    const res = orderAddressSchema.safeParse(validDomesticAddress);
    expect(res.success).toBe(true);
  });

  it("rejects phone numbers with fewer than 10 digits", () => {
    const res = orderAddressSchema.safeParse({
      ...validDomesticAddress,
      phone: "+91 12345",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toMatch(/between 10 and 15 digits/);
    }
  });

  it("rejects invalid Indian PIN codes", () => {
    const res = orderAddressSchema.safeParse({
      ...validDomesticAddress,
      pincode: "012345", // PIN code in India starts with 1-9
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toMatch(/Indian delivery PIN code must be exactly 6 digits/);
    }
  });

  it("validates valid international postal codes", () => {
    const intlAddress = {
      contactName: "John Doe",
      phone: "+971 50 123 4567",
      companyName: "Gulf Contracting LLC",
      addressLine1: "Al Quoz Industrial Area 3",
      city: "Dubai",
      state: "Dubai",
      pincode: "DXB-4001",
      country: "AE",
    };
    const res = orderAddressSchema.safeParse(intlAddress);
    expect(res.success).toBe(true);
  });

  it("normalizes empty or whitespace-only GSTIN to null", () => {
    const res = orderAddressSchema.safeParse({
      ...validDomesticAddress,
      gstin: "   ",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.gstin).toBeNull();
    }
  });

  it("rejects invalid GSTIN format for Indian address", () => {
    const res = orderAddressSchema.safeParse({
      ...validDomesticAddress,
      gstin: "INVALIDGST123",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toMatch(/Invalid GSTIN format/);
    }
  });

  it("accepts quotation acceptance when sameAsBilling is true without separate shippingAddress", () => {
    const res = buyerQuotationAcceptanceSchema.safeParse({
      quotationId: "9ad553c7-7d66-46ac-97c9-90a3fca68a5a",
      billingAddress: validDomesticAddress,
      sameAsBilling: true,
    });
    expect(res.success).toBe(true);
  });

  it("rejects quotation acceptance when sameAsBilling is false and shippingAddress is missing", () => {
    const res = buyerQuotationAcceptanceSchema.safeParse({
      quotationId: "9ad553c7-7d66-46ac-97c9-90a3fca68a5a",
      billingAddress: validDomesticAddress,
      sameAsBilling: false,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toMatch(/Shipping address is required/);
    }
  });

  it("validates order status transition schema", () => {
    const res = orderStatusTransitionSchema.safeParse({
      orderId: "9ad553c7-7d66-46ac-97c9-90a3fca68a5a",
      newStatus: "confirmed",
      notes: "Advance PO received",
    });
    expect(res.success).toBe(true);
  });
});

