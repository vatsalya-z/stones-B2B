import { describe, expect, it, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("expo-crypto", () => ({
  randomUUID: () => "mock-uuid-1234",
}));

vi.mock("../src/theme/assets", () => ({
  CANONICAL_STONE_CATEGORIES: [],
  getLocalStoneImageByMaterial: () => 1,
  resolveStorageImageUrl: (path: string | null) => path,
}));

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        }),
      }),
    },
  },
  fromPublicMutableTable: (...args: unknown[]) => fromMock(...args),
  groupRowsByKey: <T, K extends keyof T>(rows: readonly T[] | null | undefined, key: K) => {
    const map = new Map<string, T[]>();
    for (const row of rows ?? []) {
      const id = row[key];
      if (typeof id !== "string" || !id) continue;
      const arr = map.get(id);
      if (arr) arr.push(row);
      else map.set(id, [row]);
    }
    return map;
  },
}));

import {
  acceptQuotationAndCreateOrder,
  transitionBuyerEnquiry,
  transitionBuyerOrder,
} from "../src/services/buyer.service";
import {
  saveSellerProduct,
  submitSellerVerification,
  transitionSellerOrder,
} from "../src/services/seller.service";
import {
  markConversationRead,
  startOrOpenConversation,
} from "../src/services/messaging.service";

describe("Supabase RPC & Entitlement Service Integration", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it("calls accept_quotation_and_create_order RPC with validated addresses", async () => {
    rpcMock.mockResolvedValue({ data: "order-uuid-1", error: null });

    const orderId = await acceptQuotationAndCreateOrder("buyer-uuid", {
      quotationId: "11111111-1111-4111-8111-111111111111",
      billingAddress: {
        contactName: "Aarav Mehta",
        phone: "+919876543210",
        addressLine1: "Plot 12, Marble Market",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
      sameAsBilling: true,
      saveAddresses: false,
    });

    expect(orderId).toBe("order-uuid-1");
    expect(rpcMock).toHaveBeenCalledWith("accept_quotation_and_create_order", {
      _quotation_id: "11111111-1111-4111-8111-111111111111",
      _billing_address: expect.objectContaining({ city: "Jaipur", pincode: "302001" }),
      _shipping_address: null,
      _same_as_billing: true,
      _notes: null,
    });
  });

  it("calls transition_order_status for buyer and seller authorized states", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await transitionBuyerOrder("22222222-2222-4222-8222-222222222222", "delivered");
    expect(rpcMock).toHaveBeenCalledWith("transition_order_status", {
      _order_id: "22222222-2222-4222-8222-222222222222",
      _new_status: "delivered",
      _notes: null,
    });

    await transitionSellerOrder(
      "22222222-2222-4222-8222-222222222222",
      "dispatched",
      "LR #7721",
    );
    expect(rpcMock).toHaveBeenCalledWith("transition_order_status", {
      _order_id: "22222222-2222-4222-8222-222222222222",
      _new_status: "dispatched",
      _notes: "LR #7721",
    });
  });

  it("calls transition_enquiry_status, submit_seller_verification, and messaging RPCs", async () => {
    rpcMock.mockResolvedValue({ data: "conv-uuid-1", error: null });

    await transitionBuyerEnquiry("33333333-3333-4333-8333-333333333333", "cancelled");
    expect(rpcMock).toHaveBeenCalledWith("transition_enquiry_status", {
      _enquiry_id: "33333333-3333-4333-8333-333333333333",
      _new_status: "cancelled",
      _notes: undefined,
    });

    await submitSellerVerification();
    expect(rpcMock).toHaveBeenCalledWith("submit_seller_verification");

    const convId = await startOrOpenConversation({
      sellerId: "44444444-4444-4444-8444-444444444444",
      subject: "Marble Sample",
      callerRole: "buyer",
      userId: "buyer-uuid",
    });
    expect(convId).toBe("conv-uuid-1");
    expect(rpcMock).toHaveBeenCalledWith("get_or_create_conversation", {
      _seller_id: "44444444-4444-4444-8444-444444444444",
      _enquiry_id: null,
      _product_id: null,
      _subject: "Marble Sample",
    });

    await markConversationRead("conv-uuid-1");
    expect(rpcMock).toHaveBeenCalledWith("mark_conversation_read", {
      _conversation_id: "conv-uuid-1",
    });
  });

  it("enforces seller verification & subscription listing limits before inserting product", async () => {
    rpcMock.mockResolvedValue({
      data: {
        plan_name: "Free",
        max_active_listings: 5,
        active_listings_count: 5,
        can_create_listing: false,
      },
      error: null,
    });

    await expect(
      saveSellerProduct({
        seller: {
          id: "seller-uuid",
          user_id: "user-uuid",
          business_name: "Test Quarry",
          slug: "test-quarry",
          business_type: "mine_owner",
          owner_name: null,
          business_email: null,
          phone: null,
          whatsapp_number: null,
          gst_number: null,
          business_address: null,
          city: null,
          state: null,
          country: "IN",
          pincode: null,
          website: null,
          years_in_business: null,
          description: null,
          logo_url: null,
          cover_image_url: null,
          verification_status: "verified",
          verification_reason: null,
          verified_at: "2026-01-01",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        input: {
          name: "Makrana White",
          priceType: "fixed",
          price: 250,
          currency: "INR",
          unit: "sq_ft",
          stockStatus: "in_stock",
          customSpecifications: [],
          intent: "draft",
        },
      }),
    ).rejects.toThrow(/plan allows up to 5 active listings/);
  });
});
