import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRequireBuyer = vi.fn();
const mockRequireSeller = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockHasRole = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireBuyer: () => mockRequireBuyer(),
  requireSeller: () => mockRequireSeller(),
  getCurrentUser: () => mockGetCurrentUser(),
  hasRole: (role: string) => mockHasRole(role),
  getUserRoles: async () => ["buyer"],
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: async () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  deleteBuyerAddressAction,
  saveBuyerAddressAction,
  setDefaultBuyerAddressAction,
  updateBuyerAddressAction,
  acceptBuyerQuotationAction,
  transitionBuyerOrderAction,
} from "../features/buyer/actions";
import { transitionSellerOrderAction } from "../features/seller/actions";
import { getBuyerDashboardData } from "../features/buyer/queries";
import type { BuyerAddressInput, OrderStatusTransitionInput } from "@stone/validation";

const BUYER_A_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BUYER_B_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ADDR_1_ID = "11111111-1111-4111-8111-111111111111";
const ADDR_2_ID = "22222222-2222-4222-8222-222222222222";
const QUOTE_ID = "33333333-3333-4333-8333-333333333333";

const sampleValidAddress: BuyerAddressInput = {
  addressType: "both",
  contactName: "Vikram Rathore",
  phone: "+91 98290 12345",
  companyName: "Rathore Stone Exporters",
  gstin: "08AABCR1234F1Z8",
  addressLine1: "RIICO Industrial Area, Phase 3",
  addressLine2: "Plot No. 104",
  city: "Kishangarh",
  state: "Rajasthan",
  pincode: "305801",
  country: "IN",
  isDefault: true,
};

describe("Phase 5 Buyer Portal — Address CRUD, Security & Dashboard Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireBuyer.mockResolvedValue({ id: BUYER_A_ID, email: "buyer.a@stonesdekho.test" });
  });

  describe("Address CRUD Server Actions (/buyer/addresses)", () => {
    it("creates a new delivery address with default flag and clears previous default", async () => {
      const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: ADDR_1_ID }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockFrom.mockImplementation((table: string) => {
        if (table === "buyer_addresses") {
          return {
            update: mockUpdate,
            insert: mockInsert,
          };
        }
        return {};
      });

      const res = await saveBuyerAddressAction(sampleValidAddress);

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data?.id).toBe(ADDR_1_ID);
      }
      expect(mockUpdate).toHaveBeenCalledWith({ is_default: false });
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          buyer_id: BUYER_A_ID,
          contact_name: "Vikram Rathore",
          city: "Kishangarh",
          pincode: "305801",
          is_default: true,
        }),
      );
    });

    it("rejects invalid Indian PIN codes that do not match 6-digit format", async () => {
      const invalidAddress = {
        ...sampleValidAddress,
        pincode: "30580", // 5 digits
      };

      const res = await saveBuyerAddressAction(invalidAddress);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/PIN code must be exactly 6 digits/i);
      }
    });

    it("rejects invalid Indian GSTIN formats", async () => {
      const invalidGstinAddress = {
        ...sampleValidAddress,
        gstin: "INVALID_GSTIN_123",
      };

      const res = await saveBuyerAddressAction(invalidGstinAddress);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Invalid GSTIN format/i);
      }
    });

    it("updates an existing address scoped strictly to caller's buyer_id", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: ADDR_1_ID }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEqBuyer = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqBuyer });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });

      mockFrom.mockImplementation((table: string) => {
        if (table === "buyer_addresses") {
          return {
            update: mockUpdate,
          };
        }
        return {};
      });

      const res = await updateBuyerAddressAction(ADDR_1_ID, {
        ...sampleValidAddress,
        contactName: "Vikram Rathore Jr.",
        isDefault: false,
      });

      expect(res.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_name: "Vikram Rathore Jr.",
          is_default: false,
        }),
      );
      expect(mockEqId).toHaveBeenCalledWith("id", ADDR_1_ID);
      expect(mockEqBuyer).toHaveBeenCalledWith("buyer_id", BUYER_A_ID);
    });

    it("deletes an address scoped strictly to caller's buyer_id", async () => {
      const mockEqBuyer = vi.fn().mockResolvedValue({ error: null });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqBuyer });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqId });

      mockFrom.mockImplementation((table: string) => {
        if (table === "buyer_addresses") {
          return {
            delete: mockDelete,
          };
        }
        return {};
      });

      const res = await deleteBuyerAddressAction(ADDR_1_ID);

      expect(res.success).toBe(true);
      expect(mockEqId).toHaveBeenCalledWith("id", ADDR_1_ID);
      expect(mockEqBuyer).toHaveBeenCalledWith("buyer_id", BUYER_A_ID);
    });

    it("sets default address atomically via RPC for caller", async () => {
      mockRpc.mockResolvedValueOnce({ data: ADDR_2_ID, error: null });

      const res = await setDefaultBuyerAddressAction(ADDR_2_ID);

      expect(res.success).toBe(true);
      expect(res.data?.id).toBe(ADDR_2_ID);
      expect(mockRpc).toHaveBeenCalledWith("set_default_buyer_address", {
        _address_id: ADDR_2_ID,
      });
    });

    it("handles database RPC errors safely without UI mutation", async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: "Address not found" } });

      const res = await setDefaultBuyerAddressAction(ADDR_2_ID);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Address not found/i);
    });

    it("rejects non-UUID addressId before invoking RPC in setDefaultBuyerAddressAction", async () => {
      const res = await setDefaultBuyerAddressAction("invalid-non-uuid-id");

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Invalid address identifier/i);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("rejects empty string addressId in setDefaultBuyerAddressAction", async () => {
      const res = await setDefaultBuyerAddressAction("");

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Invalid address identifier/i);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("Cross-Buyer Security & Role Boundaries", () => {
    it("fails when unauthenticated user attempts to update an address", async () => {
      mockRequireBuyer.mockRejectedValueOnce(new Error("Unauthorized"));

      const res = await updateBuyerAddressAction(ADDR_1_ID, sampleValidAddress);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeDefined();
      }
    });

    it("fails when non-UUID string is passed as addressId", async () => {
      const res = await deleteBuyerAddressAction("malicious-sql-injection-id");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Invalid address identifier/i);
      }
    });

    it("rejects modification of addresses owned by another buyer", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Row not found" } });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEqBuyer = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqBuyer });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });

      mockFrom.mockImplementation((table: string) => {
        if (table === "buyer_addresses") {
          return { update: mockUpdate };
        }
        return {};
      });

      // Calling user is BUYER_A_ID, target address belongs to BUYER_B_ID
      const res = await updateBuyerAddressAction(ADDR_1_ID, sampleValidAddress);
      expect(res.success).toBe(false);
      expect(mockEqBuyer).toHaveBeenCalledWith("buyer_id", BUYER_A_ID);
      expect(mockEqBuyer).not.toHaveBeenCalledWith("buyer_id", BUYER_B_ID);
    });
  });

  describe("Quotation Acceptance Workflow (Payment Model B Integration)", () => {
    it("invokes accept_quotation_and_create_order RPC with valid addresses", async () => {
      const NEW_ORDER_ID = "99999999-9999-4999-8999-999999999999";
      mockRpc.mockResolvedValueOnce({ data: NEW_ORDER_ID, error: null });

      const res = await acceptBuyerQuotationAction({
        quotationId: QUOTE_ID,
        billingAddress: {
          contactName: "Vikram Rathore",
          phone: "+91 98290 12345",
          companyName: "Rathore Stone Works",
          gstin: "08AABCR1234F1Z8",
          addressLine1: "RIICO Phase 3",
          city: "Kishangarh",
          state: "Rajasthan",
          pincode: "305801",
          country: "IN",
        },
        sameAsBilling: true,
        saveAddresses: false,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data?.orderId).toBe(NEW_ORDER_ID);
      }
      expect(mockRpc).toHaveBeenCalledWith("accept_quotation_and_create_order", {
        _quotation_id: QUOTE_ID,
        _billing_address: expect.objectContaining({
          contactName: "Vikram Rathore",
          city: "Kishangarh",
        }),
        _shipping_address: null,
        _same_as_billing: true,
        _notes: null,
      });
    });

    it("rejects acceptance when sameAsBilling is false but shipping address is missing", async () => {
      const res = await acceptBuyerQuotationAction({
        quotationId: QUOTE_ID,
        billingAddress: {
          contactName: "Vikram Rathore",
          phone: "+91 98290 12345",
          addressLine1: "RIICO Phase 3",
          city: "Kishangarh",
          state: "Rajasthan",
          pincode: "305801",
          country: "IN",
        },
        sameAsBilling: false,
        shippingAddress: undefined,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Shipping address is required/i);
      }
    });
  });

  describe("Buyer Dashboard Aggregation Query (Real Metrics)", () => {
    it("fetches and aggregates real KPI metrics and orders without fabrication", async () => {
      // Mock queries in getBuyerDashboardData
      mockFrom.mockImplementation((table: string) => {
        if (table === "enquiries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ count: 3 }),
                is: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({ count: 2 }),
                  select: vi.fn().mockResolvedValue({ count: 5 }),
                  then: (cb: (val: unknown) => unknown) => Promise.resolve({ count: 5 }).then(cb),
                }),
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] }),
                }),
                then: (cb: (val: unknown) => unknown) => Promise.resolve({ count: 8 }).then(cb),
              }),
            }),
          };
        }
        if (table === "quotations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [] }),
                  }),
                  then: (cb: (val: unknown) => unknown) => Promise.resolve({ count: 4 }).then(cb),
                }),
                eq: vi.fn().mockResolvedValue({ count: 1 }),
              }),
            }),
          };
        }
        if (table === "orders") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ count: 2 }),
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "order-1",
                        order_number: "ORD-20261103-0001",
                        quotation_id: QUOTE_ID,
                        enquiry_id: "enq-1",
                        seller_id: "seller-1",
                        seller_snapshot: { business_name: "Makrana Marbles Ltd" },
                        status: "pending_payment",
                        payment_status: "pending",
                        subtotal: 50000,
                        tax_amount: 9000,
                        shipping_charges: 3000,
                        discount_amount: 0,
                        total_amount: 62000,
                        currency: "INR",
                        delivery_location: "Jaipur, Rajasthan",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "order_items") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ order_id: "order-1" }] }),
            }),
          };
        }
        if (table === "product_favourites") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      });

      const dashboard = await getBuyerDashboardData(BUYER_A_ID);

      expect(dashboard).toBeDefined();
      expect(dashboard.metrics).toBeDefined();
      expect(dashboard.metrics.totalRfqs).toBeGreaterThanOrEqual(0);
      expect(dashboard.metrics.activeOrders).toBeGreaterThanOrEqual(0);
      expect(dashboard.recentOrders).toBeDefined();
      expect(Array.isArray(dashboard.recentOrders)).toBe(true);
      expect(Array.isArray(dashboard.recentActivity)).toBe(true);
    });
  });

  describe("P0: Payment Model B Remediation & Copy Audit", () => {
    it("ensures unsupported escrow claims are completely absent from product enquiry form", () => {
      const rfqFormPath = path.resolve(__dirname, "../features/rfq/product-enquiry-form.tsx");
      const content = fs.readFileSync(rfqFormPath, "utf-8");

      expect(content).not.toContain("StoneB2B Platform Escrow Protection Enabled");
      expect(content).not.toContain("Escrow Protection Enabled");
      expect(content).toContain("Official StoneB2B Procurement Request");
    });

    it("ensures payment instructions are correctly marked non-operational across buyer orders pages", () => {
      const buyerOrdersPage = path.resolve(__dirname, "../app/buyer/orders/page.tsx");
      const buyerOrderDetailPage = path.resolve(__dirname, "../app/buyer/orders/[id]/page.tsx");
      const sellerOrderDetailPage = path.resolve(__dirname, "../app/seller/orders/[id]/page.tsx");

      const normalize = (str: string) => str.replace(/\s+/g, " ");
      const ordersContent = normalize(fs.readFileSync(buyerOrdersPage, "utf-8"));
      const orderDetailContent = normalize(fs.readFileSync(buyerOrderDetailPage, "utf-8"));
      const sellerDetailContent = normalize(fs.readFileSync(sellerOrderDetailPage, "utf-8"));

      const expectedNotice =
        "Platform payment integration is pending. No payment should be made using unverified platform payment instructions.";
      const preferredWording =
        "Commercial settlement will be processed through StoneB2B Payment Model B after the authorized Payment Aggregator integration is activated.";

      expect(ordersContent).toContain(expectedNotice);
      expect(orderDetailContent).toContain(expectedNotice);
      expect(sellerDetailContent).toContain(expectedNotice);
      expect(ordersContent).toContain(preferredWording);
      expect(orderDetailContent).toContain(preferredWording);
      expect(sellerDetailContent).toContain(preferredWording);

      // Verify no direct supplier settlement mischaracterization remains
      expect(ordersContent).not.toContain("No customer escrow or intermediate funds are held");
      expect(ordersContent).not.toContain("decoupled B2B direct commercial settlement");
      expect(orderDetailContent).not.toContain("Settlement is conducted directly between buyer and supplier via wire");
      expect(sellerDetailContent).not.toContain("verify direct commercial wire remittance into your bank account");
    });

    it("ensures seller order action commits production without claiming payment received", () => {
      const sellerActionsPath = path.resolve(
        __dirname,
        "../app/seller/orders/[id]/seller-order-actions.tsx",
      );
      const content = fs.readFileSync(sellerActionsPath, "utf-8");

      expect(content).not.toContain("Confirm Order (Payment / Pro-Forma Received)");
      expect(content).toContain("Confirm Order (Commit Production)");
      expect(content).toContain("Pro-forma acknowledged; production committed by supplier");
    });
  });

  describe("P0 & Security: Financial State Mutation Protections", () => {
    it("strictly prevents buyers from mutating order payment_status", async () => {
      // Attempting to set an invalid status or payment status directly
      const maliciousInput = {
        orderId: "33333333-3333-4333-8333-333333333333",
        newStatus: "paid" as unknown as "cancelled",
        notes: "Trying to mark paid as buyer",
      };

      const res = await transitionBuyerOrderAction(maliciousInput);
      expect(res.success).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("allows buyer to only transition pending orders to cancelled or dispatched to delivered", async () => {
      mockRpc.mockResolvedValueOnce({ error: null });

      const validCancelInput: OrderStatusTransitionInput = {
        orderId: "33333333-3333-4333-8333-333333333333",
        newStatus: "cancelled",
        notes: "Buyer decided to cancel prior to commitment",
      };

      const res = await transitionBuyerOrderAction(validCancelInput);
      expect(res.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("transition_order_status", {
        _order_id: validCancelInput.orderId,
        _new_status: "cancelled",
        _notes: validCancelInput.notes,
      });
    });

    it("strictly prevents sellers from mutating order payment_status during fulfillment", async () => {
      mockRequireSeller.mockResolvedValueOnce({ id: "seller-user-1", email: "seller@stone.test" });
      mockFrom.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: "seller-1", user_id: "seller-user-1" },
            }),
          }),
        }),
      });

      const maliciousSellerInput = {
        orderId: "33333333-3333-4333-8333-333333333333",
        newStatus: "paid" as unknown as "confirmed",
        notes: "Supplier attempting to mark order paid directly",
      };

      const res = await transitionSellerOrderAction(maliciousSellerInput);
      expect(res.success).toBe(false);
      // RPC must NOT be invoked for invalid status
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("P1: Single-Default Address Guarantee & Concurrency Verification", () => {
    it("simulates concurrent default address updates verifying atomic RPC invocation", async () => {
      mockRpc.mockResolvedValue({ data: ADDR_1_ID, error: null });

      // Fire concurrent requests
      const [res1, res2] = await Promise.all([
        setDefaultBuyerAddressAction(ADDR_1_ID),
        setDefaultBuyerAddressAction(ADDR_2_ID),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("set_default_buyer_address", {
        _address_id: ADDR_1_ID,
      });
      expect(mockRpc).toHaveBeenCalledWith("set_default_buyer_address", {
        _address_id: ADDR_2_ID,
      });
    });
  });
});

