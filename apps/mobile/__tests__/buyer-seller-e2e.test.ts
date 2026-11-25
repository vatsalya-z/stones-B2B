import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderStatus, PaymentStatus } from "@stone/types";

interface DbEnquiry {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  product_id: string | null;
  client_request_id: string;
  enquiry_title: string;
  status: string;
  quantity: number;
  unit: string;
  delivery_location: string;
}

interface DbQuotation {
  id: string;
  enquiry_id: string;
  seller_id: string;
  buyer_id: string;
  quote_number: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_charges: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
}

interface DbOrder {
  id: string;
  quotation_id: string;
  buyer_id: string;
  seller_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  currency: string;
}

const SELLER_UUID = "44444444-4444-4444-8444-444444444444";
const BUYER_UUID = "55555555-5555-4555-8555-555555555555";

const state = {
  enquiries: [] as DbEnquiry[],
  quotations: [] as DbQuotation[],
  quotationItems: [] as Array<Record<string, unknown>>,
  orders: [] as DbOrder[],
  leadAssignments: [] as Array<{ enquiry_id: string; seller_id: string; status: string }>,
  sellerProfile: {
    id: SELLER_UUID,
    verification_status: "verified" as "verified" | "suspended",
    is_suspended: false,
  },
  verifiedSellers: new Set([SELLER_UUID]),
};

function createChain(table: string) {
  const filters: Record<string, unknown> = {};
  let pendingInsert: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;

  const execute = async (): Promise<{ data: unknown; error: { message: string } | null }> => {
    if (pendingInsert) {
      const items = Array.isArray(pendingInsert) ? pendingInsert : [pendingInsert];
      if (table === "enquiries") {
        const row = items[0]!;
        const inserted: DbEnquiry = {
          id: `66666666-6666-4666-8666-66666666666${state.enquiries.length + 1}`,
          buyer_id: (row.buyer_id as string) ?? null,
          seller_id: (row.seller_id as string) ?? null,
          product_id: (row.product_id as string) ?? null,
          client_request_id: row.client_request_id as string,
          enquiry_title: row.enquiry_title as string,
          status: "submitted",
          quantity: row.quantity as number,
          unit: row.unit as string,
          delivery_location: row.delivery_location as string,
        };
        state.enquiries.push(inserted);
        return { data: inserted, error: null };
      }
      if (table === "quotations") {
        const row = items[0]!;
        const q: DbQuotation = {
          id: "22222222-2222-4222-8222-222222222222",
          enquiry_id: row.enquiry_id as string,
          seller_id: row.seller_id as string,
          buyer_id: row.buyer_id as string,
          quote_number: `SD-Q-${state.quotations.length + 1}`,
          status: "draft",
          subtotal: row.subtotal as number,
          tax_amount: row.tax_amount as number,
          shipping_charges: row.shipping_charges as number,
          discount_amount: row.discount_amount as number,
          total_amount: row.total_amount as number,
          currency: row.currency as string,
        };
        state.quotations.push(q);
        return { data: q, error: null };
      }
      if (table === "quotation_items") {
        state.quotationItems.push(...items);
        return { data: items, error: null };
      }
      return { data: items[0] ?? null, error: null };
    }

    if (pendingUpdate && table === "quotations") {
      const q = state.quotations.find((x) => x.id === filters.id);
      if (q && typeof pendingUpdate.status === "string") {
        q.status = pendingUpdate.status;
      }
      return { data: q ?? null, error: null };
    }

    if (table === "seller_profiles") {
      return { data: null, error: null };
    }
    if (table === "public_seller_profiles") {
      const found = state.verifiedSellers.has(String(filters.id))
        ? { id: filters.id }
        : null;
      return { data: found, error: null };
    }
    if (table === "enquiries") {
      if (typeof filters.client_request_id === "string") {
        const match =
          state.enquiries.find(
            (e) =>
              e.buyer_id === filters.buyer_id &&
              e.client_request_id === filters.client_request_id,
          ) ?? null;
        return { data: match, error: null };
      }
      if (typeof filters.id === "string") {
        const match = state.enquiries.find((e) => e.id === filters.id) ?? null;
        return { data: match, error: null };
      }
    }
    return { data: null, error: null };
  };

  const chain = {
    select: () => chain,
    insert: (payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
      pendingInsert = payload;
      return chain;
    },
    update: (payload: Record<string, unknown>) => {
      pendingUpdate = payload;
      return chain;
    },
    delete: () => chain,
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    },
    maybeSingle: () => execute(),
    single: () => execute(),
    then: (onfulfilled: (res: { data: unknown; error: { message: string } | null }) => unknown) =>
      execute().then(onfulfilled),
  };
  return chain;
}

vi.mock("expo-crypto", () => ({
  randomUUID: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
}));

vi.mock("../src/theme/assets", () => ({
  CANONICAL_STONE_CATEGORIES: [],
  getLocalStoneImageByMaterial: () => 1,
  resolveStorageImageUrl: (path: string | null) => path,
}));

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    from: (table: string) => createChain(table),
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      if (fn === "get_seller_subscription_entitlements") {
        return {
          data: {
            plan_code: "pro",
            plan_name: "Pro Quarry",
            status: "active",
            max_active_listings: 50,
            active_listings_count: 3,
            remaining_listings: 47,
            can_create_listing: !state.sellerProfile.is_suspended,
            is_unlimited_listings: false,
            max_monthly_leads: 50,
            monthly_leads_used: 4,
            remaining_monthly_leads: 46,
            lead_credit_balance: 20,
            is_suspended: state.sellerProfile.is_suspended,
          },
          error: null,
        };
      }
      if (fn === "accept_quotation_and_create_order") {
        const quote = state.quotations.find((q) => q.id === args?._quotation_id);
        if (!quote) return { data: null, error: { message: "Quotation not found" } };
        const order: DbOrder = {
          id: "33333333-3333-4333-8333-333333333333",
          quotation_id: quote.id,
          buyer_id: quote.buyer_id,
          seller_id: quote.seller_id,
          order_number: "SD-ORD-1001",
          status: "pending_payment",
          payment_status: "pending",
          total_amount: quote.total_amount,
          currency: quote.currency,
        };
        quote.status = "accepted";
        state.orders.push(order);
        return { data: order.id, error: null };
      }
      if (fn === "transition_order_status") {
        const ord = state.orders.find((o) => o.id === args?._order_id);
        if (!ord) return { data: null, error: { message: "Order not found" } };
        const nextStatus = args?._new_status as OrderStatus;
        if (nextStatus === "confirmed" && ord.payment_status !== "paid") {
          return {
            data: null,
            error: { message: "Payment Model B violation: order is unpaid." },
          };
        }
        ord.status = nextStatus;
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  },
  fromPublicMutableTable: (table: string) => createChain(table),
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
  submitBuyerRfq,
  transitionBuyerOrder,
} from "../src/services/buyer.service";
import {
  changeSellerProductStatus,
  saveSellerProduct,
  saveSellerQuotation,
  transitionSellerOrder,
} from "../src/services/seller.service";

describe("Phase M2 Buyer-Seller End-to-End Integration", () => {
  beforeEach(() => {
    state.enquiries = [];
    state.quotations = [];
    state.quotationItems = [];
    state.orders = [];
    state.leadAssignments = [];
    state.sellerProfile = {
      id: SELLER_UUID,
      verification_status: "verified",
      is_suspended: false,
    };
  });

  it("executes full RFQ -> Quote -> Accept Order -> Payment Model B -> Fulfillment -> Delivered flow", async () => {
    const reqId = "11111111-1111-4111-8111-111111111111";

    // 1. Buyer submits RFQ
    const first = await submitBuyerRfq({
      userId: BUYER_UUID,
      input: {
        mode: "general",
        sellerId: SELLER_UUID,
        enquiryTitle: "Makrana White Slabs — Hotel Lobby",
        categorySlug: "marble",
        materialType: "Marble",
        colour: "White",
        finish: "Polished",
        thickness: "20 mm",
        description: "Need 2500 sq ft bookmatched slabs delivered to Jaipur site.",
        quantity: 2500,
        unit: "sq_ft",
        deliveryCountry: "IN",
        deliveryCity: "Jaipur",
        currency: "INR",
        clientRequestId: reqId,
      },
    });
    expect(first.deduplicated).toBe(false);
    expect(state.enquiries).toHaveLength(1);

    // 2. Duplicate tap / retry with same clientRequestId deduplicates without inserting
    const retry = await submitBuyerRfq({
      userId: BUYER_UUID,
      input: {
        mode: "general",
        sellerId: SELLER_UUID,
        enquiryTitle: "Makrana White Slabs — Hotel Lobby",
        categorySlug: "marble",
        materialType: "Marble",
        description: "Need 2500 sq ft bookmatched slabs delivered to Jaipur site.",
        quantity: 2500,
        unit: "sq_ft",
        deliveryCountry: "IN",
        deliveryCity: "Jaipur",
        currency: "INR",
        clientRequestId: reqId,
      },
    });
    expect(retry.deduplicated).toBe(true);
    expect(retry.enquiryId).toBe(first.enquiryId);
    expect(state.enquiries).toHaveLength(1);

    // 3. Verified Seller sends Quotation
    const quoteRes = await saveSellerQuotation(SELLER_UUID, {
      enquiryId: first.enquiryId,
      items: [
        {
          description: "Makrana White Bookmatched Slabs 20mm",
          quantity: 2500,
          unit: "sq_ft",
          unitPrice: 320,
        },
      ],
      taxAmount: 144000,
      shippingCharges: 25000,
      discountAmount: 0,
      currency: "INR",
      terms: "100% Escrow before dispatch",
      sendImmediately: true,
    });
    expect(quoteRes.status).toBe("sent");
    expect(state.quotations[0]?.total_amount).toBe(2500 * 320 + 144000 + 25000);

    // 4. Buyer accepts quotation -> Order begins in pending_payment / pending
    const orderId = await acceptQuotationAndCreateOrder(BUYER_UUID, {
      quotationId: quoteRes.quotationId,
      billingAddress: {
        contactName: "Rohan Sharma",
        phone: "+919829012345",
        addressLine1: "C-45 Tonk Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302015",
        country: "IN",
      },
      sameAsBilling: true,
      saveAddresses: false,
    });
    expect(state.orders[0]?.status).toBe("pending_payment");
    expect(state.orders[0]?.payment_status).toBe("pending");

    // 5. Seller CANNOT confirm order while payment_status is pending
    await expect(
      transitionSellerOrder(
        orderId,
        "confirmed",
        undefined,
        state.orders[0]!.status,
        state.orders[0]!.payment_status,
      ),
    ).rejects.toThrow(/Payment Model B/);

    // 6. Seller CANNOT skip stages directly to dispatched
    await expect(
      transitionSellerOrder(orderId, "dispatched", undefined, "pending_payment", "paid"),
    ).rejects.toThrow(/cannot transition/i);

    // 7. Simulate verified backend payment webhook marking order as paid
    state.orders[0]!.payment_status = "paid";

    // 8. Seller performs authorized fulfillment chain without altering payment_status
    await transitionSellerOrder(orderId, "confirmed", "Payment verified, cutting scheduled", "pending_payment", "paid");
    expect(state.orders[0]!.status).toBe("confirmed");
    expect(state.orders[0]!.payment_status).toBe("paid");

    await transitionSellerOrder(orderId, "processing", undefined, "confirmed", "paid");
    await transitionSellerOrder(orderId, "dispatched", "LR #88412", "processing", "paid");
    expect(state.orders[0]!.status).toBe("dispatched");

    // 9. Buyer confirms delivery
    await transitionBuyerOrder(orderId, "delivered", "Received 22 crates intact", "dispatched");
    expect(state.orders[0]!.status).toBe("delivered");
  });

  it("blocks suspended sellers from creating products, changing product status, or issuing quotes", async () => {
    state.sellerProfile.verification_status = "suspended";
    state.sellerProfile.is_suspended = true;

    const suspendedSeller = {
      id: SELLER_UUID,
      user_id: "user-uuid",
      business_name: "Suspended Quarry",
      slug: "suspended-quarry",
      business_type: "mine_owner" as const,
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
      verification_status: "suspended" as const,
      verification_reason: "Policy violation",
      verified_at: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };

    await expect(
      saveSellerProduct({
        seller: suspendedSeller,
        input: {
          name: "Black Granite",
          priceType: "fixed",
          price: 180,
          currency: "INR",
          unit: "sq_ft",
          stockStatus: "in_stock",
          customSpecifications: [],
          intent: "draft",
        },
      }),
    ).rejects.toThrow(/suspended/i);

    await expect(
      changeSellerProductStatus(suspendedSeller, "prod-uuid-1", "draft"),
    ).rejects.toThrow(/suspended/i);

    await expect(
      saveSellerQuotation(SELLER_UUID, {
        enquiryId: "11111111-1111-4111-8111-111111111111",
        items: [{ description: "Granite", quantity: 100, unit: "sq_ft", unitPrice: 180 }],
        taxAmount: 0,
        shippingCharges: 0,
        discountAmount: 0,
        currency: "INR",
        sendImmediately: false,
      }),
    ).rejects.toThrow(/suspended/i);
  });
});
