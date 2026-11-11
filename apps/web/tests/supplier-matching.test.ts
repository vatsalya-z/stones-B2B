import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  findMatchingSuppliers,
  distributeRfqToSuppliers,
  type MatchCriteria,
  type SupabaseMatchClient,
} from "@/features/matching/supplier-matching";

describe("Supplier Matching Engine — findMatchingSuppliers", () => {
  it("falls back to seed suppliers and ranks Marble specialist highest for Marble RFQ", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const criteria: MatchCriteria = {
      materialType: "Marble",
      stoneVariety: "Makrana Pure White",
      deliveryLocation: "Jaipur, Rajasthan",
      quantity: 5000,
      unit: "sq_ft",
    };

    const matches = await findMatchingSuppliers(
      mockSupabase as unknown as SupabaseMatchClient,
      criteria,
    );
    expect(matches.length).toBeGreaterThan(0);
    const top = matches[0]!;
    expect(top.businessName).toBe("Royal Makrana Marbles");
    expect(top.isVerified).toBe(true);
    expect(top.score).toBeGreaterThanOrEqual(matches[matches.length - 1]!.score);
    expect(top.matchReasons.some((r) => r.includes("Marble"))).toBe(true);
  });

  it("ranks Granite specialist highest for Granite RFQ", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const criteria: MatchCriteria = {
      materialType: "Granite",
      stoneVariety: "Black Galaxy",
      deliveryLocation: "Chennai Port",
      quantity: 2000,
      unit: "sq_ft",
    };

    const matches = await findMatchingSuppliers(
      mockSupabase as unknown as SupabaseMatchClient,
      criteria,
    );
    expect(matches.length).toBeGreaterThan(0);
    const top = matches[0]!;
    expect(top.businessName).toBe("Galaxy Granite Exports");
    expect(top.matchReasons.some((r) => r.includes("Granite"))).toBe(true);
  });

  it("accurately scores live database sellers based on multi-attribute criteria", async () => {
    const mockSellers = [
      {
        id: "sel-1",
        user_id: "usr-1",
        business_name: "Apex Rajasthan Marble Ltd",
        slug: "apex-marble",
        city: "Udaipur",
        state: "Rajasthan",
        country: "India",
        verification_status: "verified",
        years_in_business: 20,
      },
      {
        id: "sel-2",
        user_id: "usr-2",
        business_name: "South India Granite Works",
        slug: "south-granite",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        verification_status: "verified",
        years_in_business: 10,
      },
      {
        id: "sel-3",
        user_id: "usr-3",
        business_name: "Unverified Sandstone Trader",
        slug: "unverified-sandstone",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        verification_status: "under_review",
        years_in_business: 2,
      },
    ];

    const mockProducts = [
      {
        seller_id: "sel-1",
        name: "Makrana Calacatta White Marble Slab",
        material_type: "Marble",
        stone_origin: "Makrana, Rajasthan",
        description: "Pure white gangsaw marble slab",
      },
      {
        seller_id: "sel-2",
        name: "Black Galaxy Polished Granite Slab",
        material_type: "Granite",
        stone_origin: "Andhra Pradesh",
        description: "Mirror polished granite",
      },
    ];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "seller_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockSellers.filter((s) => s.verification_status === "verified"),
                error: null,
              }),
            }),
          };
        }
        if (table === "products") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
        };
      }),
    };

    const criteria: MatchCriteria = {
      materialType: "Marble",
      stoneVariety: "Makrana",
      deliveryLocation: "Jaipur, Rajasthan",
      quantity: 1000,
      maxMatches: 3,
    };

    const matches = await findMatchingSuppliers(
      mockSupabase as unknown as SupabaseMatchClient,
      criteria,
    );
    expect(matches.length).toBeGreaterThan(0);
    const top = matches[0]!;
    expect(top.sellerId).toBe("sel-1");
    expect(top.isVerified).toBe(true);
    expect(top.score).toBeGreaterThanOrEqual(80); // Verification + Material + Variety + Geo
  });
});

describe("Supplier Matching Engine — distributeRfqToSuppliers", () => {
  it("dispatches notifications to matched suppliers and returns distribution results", async () => {
    const insertedNotifications: Record<string, unknown>[] = [];
    const insertedAssignments: Record<string, unknown>[] = [];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "seller_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "seller-1",
                    user_id: "user-s1",
                    business_name: "Royal Makrana Marbles",
                    slug: "royal-makrana-marbles",
                    city: "Makrana",
                    state: "Rajasthan",
                    verification_status: "verified",
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === "products") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      seller_id: "seller-1",
                      name: "White Marble",
                      material_type: "Marble",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "lead_assignments") {
          return {
            insert: vi.fn((payload) => {
              insertedAssignments.push(payload);
              return Promise.resolve({ data: null, error: null });
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn((payload) => {
              insertedNotifications.push(payload);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };

    const res = await distributeRfqToSuppliers(
      mockSupabase as unknown as SupabaseMatchClient,
      "enquiry-12345",
      {
        materialType: "Marble",
        deliveryLocation: "Rajasthan",
      },
    );

    expect(res.enquiryId).toBe("enquiry-12345");
    expect(res.matches.length).toBeGreaterThan(0);
    expect(res.assignedCount).toBe(1);
    expect(res.notificationsSent).toBe(1);
    expect(insertedAssignments.length).toBe(1);
    expect(insertedNotifications.length).toBe(1);
    const notif = insertedNotifications[0]!;
    expect(notif.user_id).toBe("user-s1");
    expect(notif.notification_type).toBe("enquiry_received");
    expect(notif.reference_id).toBe("enquiry-12345");
  });
});
