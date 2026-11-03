import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRequireBuyer = vi.fn();
const mockRequireSeller = vi.fn();
const mockAuthorizeAdminAction = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireBuyer: () => mockRequireBuyer(),
  requireSeller: () => mockRequireSeller(),
  getCurrentUser: () => mockRequireBuyer(),
  getUserRoles: async () => ["buyer"],
}));

vi.mock("@/features/admin/guard", () => ({
  authorizeAdminAction: (...args: unknown[]) => mockAuthorizeAdminAction(...args),
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
  acceptQuotationAction,
  transitionBuyerOrderAction,
} from "../features/buyer/actions";
import { transitionSellerOrderAction } from "../features/seller/actions";
import { transitionAdminOrderAction } from "../features/admin/actions";

const TEST_BUYER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const TEST_ORDER_ID = "33333333-3333-4333-8333-333333333333";
const TEST_SELLER_USER_ID = "44444444-4444-4444-8444-444444444444";
const TEST_SELLER_ID = "55555555-5555-4555-8555-555555555555";

const validBillingAddress = {
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

describe("Phase 2 Orders Portal Server Actions & State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireBuyer.mockResolvedValue({ id: TEST_BUYER_ID, email: "buyer@test.dev" });
    mockRequireSeller.mockResolvedValue({ id: TEST_SELLER_USER_ID, email: "seller@test.dev" });
  });

  describe("acceptQuotationAction", () => {
    it("successfully validates input and invokes accept_quotation_and_create_order RPC", async () => {
      mockRpc.mockResolvedValueOnce({ data: TEST_ORDER_ID, error: null });

      const res = await acceptQuotationAction({
        quotationId: TEST_QUOTE_ID,
        billingAddress: validBillingAddress,
        sameAsBilling: true,
        projectDeliveryNotes: "Urgent project dispatch",
        saveAddresses: false,
      });

      expect(res.success).toBe(true);
      expect(res.data?.orderId).toBe(TEST_ORDER_ID);
      expect(mockRpc).toHaveBeenCalledWith("accept_quotation_and_create_order", {
        _quotation_id: TEST_QUOTE_ID,
        _billing_address: expect.objectContaining({ contactName: "Rajesh Sharma" }),
        _shipping_address: null,
        _same_as_billing: true,
        _notes: "Urgent project dispatch",
      });
    });

    it("rejects acceptance if sameAsBilling is false and shipping address is omitted", async () => {
      const res = await acceptQuotationAction({
        quotationId: TEST_QUOTE_ID,
        billingAddress: validBillingAddress,
        sameAsBilling: false,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Shipping address is required/);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("rejects acceptance if phone number is invalid", async () => {
      const res = await acceptQuotationAction({
        quotationId: TEST_QUOTE_ID,
        billingAddress: {
          ...validBillingAddress,
          phone: "123", // invalid
        },
        sameAsBilling: true,
      });

      expect(res.success).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("transitionBuyerOrderAction", () => {
    it("allows buyer to transition pending_payment order to cancelled", async () => {
      mockRpc.mockResolvedValueOnce({ error: null });

      const res = await transitionBuyerOrderAction({
        orderId: TEST_ORDER_ID,
        newStatus: "cancelled",
        notes: "Project postponed",
      });

      expect(res.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("transition_order_status", {
        _order_id: TEST_ORDER_ID,
        _new_status: "cancelled",
        _notes: "Project postponed",
      });
    });

    it("allows buyer to transition dispatched order to delivered", async () => {
      mockRpc.mockResolvedValueOnce({ error: null });

      const res = await transitionBuyerOrderAction({
        orderId: TEST_ORDER_ID,
        newStatus: "delivered",
        notes: "Received intact",
      });

      expect(res.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("transition_order_status", {
        _order_id: TEST_ORDER_ID,
        _new_status: "delivered",
        _notes: "Received intact",
      });
    });

    it("rejects unauthorized buyer transition to confirmed", async () => {
      const res = await transitionBuyerOrderAction({
        orderId: TEST_ORDER_ID,
        newStatus: "confirmed" as unknown as "cancelled",
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Buyers may only cancel pending orders or confirm delivery/);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("transitionSellerOrderAction", () => {
    it("allows seller to transition order from confirmed to processing to dispatched", async () => {
      mockFrom.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: TEST_SELLER_ID, user_id: TEST_SELLER_USER_ID },
              error: null,
            }),
          }),
        }),
      });
      mockRpc.mockResolvedValueOnce({ error: null });

      const res = await transitionSellerOrderAction({
        orderId: TEST_ORDER_ID,
        newStatus: "confirmed",
        notes: "Pro-forma wire received",
      });

      expect(res.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("transition_order_status", {
        _order_id: TEST_ORDER_ID,
        _new_status: "confirmed",
        _notes: "Pro-forma wire received",
      });
    });

    it("rejects seller direct cancellation attempt", async () => {
      mockFrom.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: TEST_SELLER_ID, user_id: TEST_SELLER_USER_ID },
              error: null,
            }),
          }),
        }),
      });

      const res = await transitionSellerOrderAction({
        orderId: TEST_ORDER_ID,
        newStatus: "cancelled" as unknown as "confirmed",
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Suppliers may only transition orders through confirmed, processing, or dispatched/);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("transitionAdminOrderAction", () => {
    it("allows admin to cancel an order under arbitration", async () => {
      mockAuthorizeAdminAction.mockResolvedValueOnce({
        ok: true,
        ctx: {
          supabase: {
            rpc: mockRpc,
          },
        },
      });
      mockRpc.mockResolvedValueOnce({ error: null });

      const res = await transitionAdminOrderAction({
        orderId: TEST_ORDER_ID,
        newStatus: "cancelled",
        notes: "Commercial arbitration: dispute resolved with cancellation",
      });

      expect(res.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("transition_order_status", {
        _order_id: TEST_ORDER_ID,
        _new_status: "cancelled",
        _notes: "Commercial arbitration: dispute resolved with cancellation",
      });
    });

    it("allows admin to close a delivered order as completed", async () => {
      mockAuthorizeAdminAction.mockResolvedValueOnce({
        ok: true,
        ctx: {
          supabase: {
            rpc: mockRpc,
          },
        },
      });
      mockRpc.mockResolvedValueOnce({ error: null });

      const res = await transitionAdminOrderAction({
        orderId: TEST_ORDER_ID,
        newStatus: "completed",
        notes: "Final completion signoff",
      });

      expect(res.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("transition_order_status", {
        _order_id: TEST_ORDER_ID,
        _new_status: "completed",
        _notes: "Final completion signoff",
      });
    });
  });
});

