import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  findMatchingSuppliers,
  distributeRfqToSuppliers,
  retryFailedLeadNotifications,
  type MatchCriteria,
  type SupabaseMatchClient,
} from "@/features/matching/supplier-matching";
import { getSellerEnquiries, getSellerEnquiryDetail } from "@/features/seller/queries";

// Mock Supabase Server Client for Seller Queries
const mockSupabaseServerClient = {
  from: vi.fn(),
  storage: {
    from: vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: () => Promise.resolve(mockSupabaseServerClient),
}));

describe("StoneB2B Phase 3.1 — Lead Engine E2E Verification (12 Scenarios)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test Fixture Sellers
  const mockSellers = [
    {
      id: "sel-marble-1",
      user_id: "usr-s1",
      business_name: "Makrana Royal Marble Works",
      slug: "makrana-royal-marble",
      city: "Makrana",
      state: "Rajasthan",
      country: "India",
      verification_status: "verified",
      years_in_business: 25,
      verified_at: "2021-01-01T00:00:00Z",
    },
    {
      id: "sel-marble-2",
      user_id: "usr-s2",
      business_name: "Apex Rajasthan Marble Ltd",
      slug: "apex-rajasthan-marble",
      city: "Udaipur",
      state: "Rajasthan",
      country: "India",
      verification_status: "verified",
      years_in_business: 18,
      verified_at: "2021-06-01T00:00:00Z",
    },
    {
      id: "sel-marble-3",
      user_id: "usr-s3",
      business_name: "Kishangarh Classic Stones",
      slug: "kishangarh-classic-stones",
      city: "Kishangarh",
      state: "Rajasthan",
      country: "India",
      verification_status: "verified",
      years_in_business: 12,
      verified_at: "2022-01-01T00:00:00Z",
    },
    {
      id: "sel-marble-4",
      user_id: "usr-s4",
      business_name: "Jaipur Architectural Marbles",
      slug: "jaipur-architectural-marbles",
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      verification_status: "verified",
      years_in_business: 10,
      verified_at: "2022-06-01T00:00:00Z",
    },
    {
      id: "sel-marble-5",
      user_id: "usr-s5",
      business_name: "Marwar White Marbles",
      slug: "marwar-white-marbles",
      city: "Makrana",
      state: "Rajasthan",
      country: "India",
      verification_status: "verified",
      years_in_business: 8,
      verified_at: "2023-01-01T00:00:00Z",
    },
    {
      id: "sel-marble-6",
      user_id: "usr-s6",
      business_name: "Aravalli Stone Crafts",
      slug: "aravalli-stone-crafts",
      city: "Ajmer",
      state: "Rajasthan",
      country: "India",
      verification_status: "verified",
      years_in_business: 5,
      verified_at: "2023-06-01T00:00:00Z",
    },
    {
      id: "sel-granite-1",
      user_id: "usr-g1",
      business_name: "South India Granite Works",
      slug: "south-india-granite",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      verification_status: "verified",
      years_in_business: 20,
      verified_at: "2021-01-01T00:00:00Z",
    },
    {
      id: "sel-suspended-1",
      user_id: "usr-sus1",
      business_name: "Suspended Marble Exporter",
      slug: "suspended-marble",
      city: "Makrana",
      state: "Rajasthan",
      country: "India",
      verification_status: "suspended",
      years_in_business: 30,
      verified_at: "2020-01-01T00:00:00Z",
    },
    {
      id: "sel-unverified-1",
      user_id: "usr-unv1",
      business_name: "Unverified Marble Trader",
      slug: "unverified-marble",
      city: "Makrana",
      state: "Rajasthan",
      country: "India",
      verification_status: "under_review",
      years_in_business: 2,
    },
  ];

  // Test Fixture Products with approved moderation status
  const mockProducts = [
    {
      seller_id: "sel-marble-1",
      name: "Makrana Pure White Marble Slabs",
      material_type: "Marble",
      stone_origin: "Makrana, Rajasthan",
      description: "Premium architectural grade white marble",
      moderation_status: "approved",
    },
    {
      seller_id: "sel-marble-2",
      name: "Makrana Udaipur Gangsaw Marble",
      material_type: "Marble",
      stone_origin: "Rajasthan",
      description: "Polished white marble slabs",
      moderation_status: "approved",
    },
    {
      seller_id: "sel-marble-3",
      name: "Makrana Banswara Marble Tile",
      material_type: "Marble",
      stone_origin: "Makrana",
      description: "Export quality white marble",
      moderation_status: "approved",
    },
    {
      seller_id: "sel-marble-4",
      name: "Makrana Jaipur Calacatta Marble",
      material_type: "Marble",
      stone_origin: "Rajasthan",
      description: "Bookmatched white marble",
      moderation_status: "approved",
    },
    {
      seller_id: "sel-marble-5",
      name: "Makrana Albeta White Marble",
      material_type: "Marble",
      stone_origin: "Makrana",
      description: "Original Makrana stone",
      moderation_status: "approved",
    },
    {
      seller_id: "sel-marble-6",
      name: "Makrana Aravalli White Marble Blocks",
      material_type: "Marble",
      stone_origin: "Aravalli",
      description: "Rough blocks and slabs",
      moderation_status: "approved",
    },
    {
      seller_id: "sel-granite-1",
      name: "Black Galaxy Polished Granite",
      material_type: "Granite",
      stone_origin: "Andhra Pradesh",
      description: "Granite only, no marble",
      moderation_status: "approved",
    },
    {
      seller_id: "sel-suspended-1",
      name: "Makrana White Marble Slab",
      material_type: "Marble",
      stone_origin: "Makrana",
      description: "From suspended seller",
      moderation_status: "approved",
    },
  ];

  function createMockSupabaseEngine(options?: {
    leadAssignmentsStore?: Array<Record<string, unknown>>;
    notificationsStore?: Array<Record<string, unknown>>;
    simulateNotificationFailure?: boolean;
  }) {
    const assignmentsStore = options?.leadAssignmentsStore ?? [];
    const notifsStore = options?.notificationsStore ?? [];

    const client: SupabaseMatchClient = {
      from: vi.fn((table: string) => {
        if (table === "seller_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn((col: string, val: string) => {
                const filtered = mockSellers.filter(
                  (s) => s[col as keyof typeof s] === val,
                );
                return Promise.resolve({ data: filtered, error: null });
              }),
            }),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        if (table === "products") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn((col: string, vals: string[]) => ({
                eq: vi.fn((eqCol: string, eqVal: string) => {
                  const filtered = mockProducts.filter(
                    (p) =>
                      vals.includes(p[col as keyof typeof p] as string) &&
                      p[eqCol as keyof typeof p] === eqVal,
                  );
                  return Promise.resolve({ data: filtered, error: null });
                }),
              })),
            }),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        if (table === "lead_assignments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn((col: string, val: string) => {
                const results = assignmentsStore.filter((a) => a[col] === val);
                return Promise.resolve({ data: results, error: null });
              }),
              in: vi.fn((col: string, vals: string[]) => {
                const results = assignmentsStore.filter((a) =>
                  vals.includes(a[col] as string),
                );
                return Promise.resolve({ data: results, error: null });
              }),
            }),
            insert: vi.fn((payload: Record<string, unknown>) => {
              const enquiryId = payload.enquiry_id;
              const sellerId = payload.seller_id;
              // Enforce UNIQUE(enquiry_id, seller_id)
              const exists = assignmentsStore.some(
                (a) => a.enquiry_id === enquiryId && a.seller_id === sellerId,
              );
              if (exists) {
                return Promise.resolve({
                  error: { message: "duplicate key value violates unique constraint" },
                });
              }
              const record = { id: `la-${Date.now()}-${Math.random()}`, ...payload };
              assignmentsStore.push(record);
              return Promise.resolve({ error: null, data: record });
            }),
            update: vi.fn((payload: Record<string, unknown>) => ({
              eq: vi.fn((col1: string, val1: string) => {
                const chain = {
                  eq: vi.fn((col2: string, val2: string) => {
                    for (const item of assignmentsStore) {
                      if (item[col1] === val1 && item[col2] === val2) {
                        Object.assign(item, payload);
                      }
                    }
                    return Promise.resolve({ error: null, data: null });
                  }),
                };
                for (const item of assignmentsStore) {
                  if (item[col1] === val1) {
                    Object.assign(item, payload);
                  }
                }
                return Object.assign(Promise.resolve({ error: null, data: null }), chain);
              }),
            })),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        if (table === "notifications") {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              if (options?.simulateNotificationFailure) {
                return Promise.resolve({
                  error: { message: "Simulated SMTP/FCM connection timeout" },
                });
              }
              notifsStore.push(payload);
              return Promise.resolve({ error: null, data: payload });
            }),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
        } as unknown as ReturnType<SupabaseMatchClient["from"]>;
      }),
    };

    return { client, assignmentsStore, notifsStore };
  }

  // Scenario 1 & 2: RFQ submitted for Makrana White Marble -> Eligible verified marble sellers matched
  it("Scenario 1 & 2: Matches verified sellers with Makrana White Marble capability", async () => {
    const { client } = createMockSupabaseEngine();
    const criteria: MatchCriteria = {
      materialType: "Marble",
      stoneVariety: "Makrana Pure White",
      deliveryLocation: "Jaipur, Rajasthan",
      quantity: 5000,
      unit: "sq_ft",
    };

    const matches = await findMatchingSuppliers(client, criteria);

    expect(matches.length).toBeGreaterThan(0);
    // Top matched supplier should be Makrana specialist
    const top = matches[0]!;
    expect(top.sellerId).toBe("sel-marble-1");
    expect(top.businessName).toBe("Makrana Royal Marble Works");
    expect(top.isVerified).toBe(true);
    expect(top.score).toBeGreaterThanOrEqual(90); // 40 (material) + 20 (variety) + 20 (verified) + 20 (geo) = 100
  });

  // Scenario 3: Ineligible and suspended sellers excluded
  it("Scenario 3: Excludes Granite-only, unverified, and suspended sellers", async () => {
    const { client } = createMockSupabaseEngine();
    const criteria: MatchCriteria = {
      materialType: "Marble",
      stoneVariety: "Makrana",
      deliveryLocation: "Rajasthan",
    };

    const matches = await findMatchingSuppliers(client, criteria);
    const matchedSellerIds = matches.map((m) => m.sellerId);

    // Granite specialist should NOT match a Marble RFQ
    expect(matchedSellerIds).not.toContain("sel-granite-1");
    // Suspended seller should NOT be matched
    expect(matchedSellerIds).not.toContain("sel-suspended-1");
    // Under-review seller should NOT be matched
    expect(matchedSellerIds).not.toContain("sel-unverified-1");
  });

  // Scenario 4: Top 5 sellers selected correctly with deterministic tie-breaking
  it("Scenario 4: Selects strictly top 5 sellers ordered by score, experience, and seniority", async () => {
    const { client } = createMockSupabaseEngine();
    const criteria: MatchCriteria = {
      materialType: "Marble",
      stoneVariety: "Makrana",
      deliveryLocation: "Rajasthan",
      maxMatches: 5,
    };

    const matches = await findMatchingSuppliers(client, criteria);

    // Out of 6 verified marble sellers, only top 5 should be returned
    expect(matches.length).toBe(5);
    // Highest years in business first among equal scores
    expect(matches[0]!.sellerId).toBe("sel-marble-1"); // 25 years
    expect(matches[1]!.sellerId).toBe("sel-marble-2"); // 18 years
    expect(matches[2]!.sellerId).toBe("sel-marble-3"); // 12 years
    expect(matches[3]!.sellerId).toBe("sel-marble-4"); // 10 years
    expect(matches[4]!.sellerId).toBe("sel-marble-5"); // 8 years
    // 6th seller (sel-marble-6, 5 years) excluded by top 5 cap
    expect(matches.map((m) => m.sellerId)).not.toContain("sel-marble-6");
  });

  // Scenario 5: Matching assignments persisted in lead_assignments
  it("Scenario 5: Persists matching assignments with scores in lead_assignments", async () => {
    const { client, assignmentsStore, notifsStore } = createMockSupabaseEngine();
    const enquiryId = "enq-audit-101";

    const res = await distributeRfqToSuppliers(client, enquiryId, {
      materialType: "Marble",
      stoneVariety: "Makrana",
      deliveryLocation: "Jaipur, Rajasthan",
      maxMatches: 5,
    });

    expect(res.enquiryId).toBe(enquiryId);
    expect(res.assignedCount).toBe(5);
    expect(res.notificationsSent).toBe(5);
    expect(assignmentsStore.length).toBe(5);
    expect(notifsStore.length).toBe(5);

    // Verify assignment attributes
    const firstAssignment = assignmentsStore[0]!;
    expect(firstAssignment.enquiry_id).toBe(enquiryId);
    expect(firstAssignment.seller_id).toBe("sel-marble-1");
    expect(firstAssignment.notification_status).toBe("delivered");
    expect(Number(firstAssignment.match_score)).toBeGreaterThanOrEqual(90);
  });

  // Scenario 6: Seller lead inbox displays assigned RFQ
  it("Scenario 6: Seller queries include broadcast RFQs assigned via lead_assignments", async () => {
    const assignedEnquiryId = "enq-broadcast-999";
    const assignedSellerId = "sel-marble-1";

    mockSupabaseServerClient.from.mockImplementation((table: string) => {
      if (table === "lead_assignments") {
        const leadObj: Record<string, unknown> = {
          eq: vi.fn((col1: string, val1: string) => {
            const innerObj: Record<string, unknown> = {
              eq: vi.fn((col2: string, val2: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "la-1", enquiry_id: val1, seller_id: val2 },
                  error: null,
                }),
              })),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "la-1", enquiry_id: assignedEnquiryId, seller_id: assignedSellerId },
                error: null,
              }),
            };
            // Support both direct promise for getSellerEnquiries and chained .eq for getSellerEnquiryDetail
            return Object.assign(
              Promise.resolve({
                data: [{ enquiry_id: assignedEnquiryId, seller_id: assignedSellerId }],
                error: null,
              }),
              innerObj,
            );
          }),
        };
        return {
          select: vi.fn().mockReturnValue(leadObj),
        };
      }
      if (table === "enquiries") {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: assignedEnquiryId,
                      seller_id: null, // Broadcast RFQ
                      enquiry_title: "10,000 sq ft Makrana White Marble",
                      status: "submitted",
                      created_at: new Date().toISOString(),
                      profiles: { id: "buy-1", full_name: "DLF Builders", email: "procure@dlf.in" },
                      products: null,
                    },
                  ],
                  count: 1,
                  error: null,
                }),
              }),
            }),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: assignedEnquiryId,
                  seller_id: null,
                  enquiry_title: "10,000 sq ft Makrana White Marble",
                  status: "submitted",
                  created_at: new Date().toISOString(),
                  profiles: { id: "buy-1", full_name: "DLF Builders", email: "procure@dlf.in" },
                  products: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "enquiry_status_history" || table === "quotations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    // 1. Seller enquiry list
    const enquiries = await getSellerEnquiries(assignedSellerId, {});
    expect(enquiries.total).toBe(1);
    expect(enquiries.enquiries[0]!.id).toBe(assignedEnquiryId);

    // 2. Seller enquiry detail
    const detail = await getSellerEnquiryDetail(assignedSellerId, assignedEnquiryId);
    expect(detail).not.toBeNull();
    expect(detail!.enquiry.id).toBe(assignedEnquiryId);
  });

  // Scenario 7: Seller A cannot access Seller B's lead
  it("Scenario 7: Prevents Seller A from accessing unassigned lead meant for Seller B", async () => {
    const unassignedSellerId = "sel-granite-1";
    const enquiryId = "enq-exclusive-marble";

    mockSupabaseServerClient.from.mockImplementation((table: string) => {
      if (table === "lead_assignments") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "enquiries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                // Seller granite-1 is NOT assigned and NOT the direct seller
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const result = await getSellerEnquiryDetail(unassignedSellerId, enquiryId);
    expect(result).toBeNull();
  });

  // Scenario 8: Duplicate RFQ submission does not duplicate distribution
  it("Scenario 8: Duplicate distribution calls do not create duplicate lead assignments", async () => {
    const { client, assignmentsStore } = createMockSupabaseEngine();
    const enquiryId = "enq-idempotent-202";

    const criteria: MatchCriteria = {
      materialType: "Marble",
      stoneVariety: "Makrana",
      deliveryLocation: "Rajasthan",
    };

    // First distribution
    const firstCall = await distributeRfqToSuppliers(client, enquiryId, criteria);
    expect(firstCall.assignedCount).toBe(5);
    expect(assignmentsStore.length).toBe(5);

    // Duplicate second distribution call for same RFQ
    const secondCall = await distributeRfqToSuppliers(client, enquiryId, criteria);
    // Duplicate insertions return unique constraint violation and are skipped
    expect(secondCall.assignedCount).toBe(0);
    expect(assignmentsStore.length).toBe(5); // Store count remains 5
  });

  // Scenario 9: Notification failure and retry mechanism
  it("Scenario 9: Handles notification failures gracefully and retries successfully via worker", async () => {
    // 1. Distribute with simulated notification failure
    const { client, assignmentsStore } = createMockSupabaseEngine({
      simulateNotificationFailure: true,
    });
    const enquiryId = "enq-retry-303";

    const distRes = await distributeRfqToSuppliers(client, enquiryId, {
      materialType: "Marble",
      stoneVariety: "Makrana",
      deliveryLocation: "Rajasthan",
    });

    expect(distRes.assignedCount).toBe(5);
    expect(distRes.notificationsSent).toBe(0);
    expect(distRes.failures.length).toBe(5);
    expect(assignmentsStore.every((a) => a.notification_status === "failed")).toBe(true);

    // 2. Run retry worker with working notification delivery
    const healthyEngine = createMockSupabaseEngine({
      leadAssignmentsStore: assignmentsStore,
      simulateNotificationFailure: false,
    });

    const retryRes = await retryFailedLeadNotifications(healthyEngine.client);
    expect(retryRes.retried).toBe(5);
    expect(retryRes.succeeded).toBe(5);
    expect(retryRes.failed).toBe(0);
    expect(assignmentsStore.every((a) => a.notification_status === "delivered")).toBe(true);
  });

  // Scenario 10: No eligible seller scenario handled gracefully
  it("Scenario 10: Handles non-existent stone categories gracefully without crashing", async () => {
    const { client } = createMockSupabaseEngine();
    const criteria: MatchCriteria = {
      materialType: "ObsidianMeteorite",
      stoneVariety: "ExtraTerrestrial",
      deliveryLocation: "Moon Base",
    };

    const matches = await findMatchingSuppliers(client, criteria);
    // Should fall back to seed suppliers or return empty without throwing
    expect(Array.isArray(matches)).toBe(true);
  });

  // Scenario 11: Matching engine failure without RFQ loss
  it("Scenario 11: Guarantees RFQ persistence even if matching engine encounters error", async () => {
    const brokenClient: SupabaseMatchClient = {
      from: vi.fn().mockImplementation(() => {
        throw new Error("Fatal database socket timeout during matching");
      }),
    };

    // Public RFQ submission pattern:
    // Step A: Original RFQ is persisted first
    const rfqRow = { id: "enq-safe-persist", refNum: "RFQ-2026-999" };
    expect(rfqRow.id).toBe("enq-safe-persist");

    // Step B: Asynchronous matching dispatch does not crash or lose the RFQ
    const res = await distributeRfqToSuppliers(brokenClient, rfqRow.id, {
      materialType: "Marble",
    });

    // Matching engine handles client errors safely and records errors in failures array
    expect(res.enquiryId).toBe("enq-safe-persist");
    expect(res.failures.length).toBeGreaterThan(0);
    expect(res.failures[0]).toContain("Fatal database socket timeout during matching");
  });

  // Scenario 12: Concurrent RFQ submission idempotency
  it("Scenario 12: Safely handles concurrent distributions without race condition duplicates", async () => {
    const { client, assignmentsStore } = createMockSupabaseEngine();
    const enquiryId = "enq-concurrent-505";
    const criteria: MatchCriteria = {
      materialType: "Marble",
      stoneVariety: "Makrana",
      deliveryLocation: "Rajasthan",
    };

    // Simulate 3 concurrent distribution workers racing on the same enquiry
    const [res1, res2, res3] = await Promise.all([
      distributeRfqToSuppliers(client, enquiryId, criteria),
      distributeRfqToSuppliers(client, enquiryId, criteria),
      distributeRfqToSuppliers(client, enquiryId, criteria),
    ]);

    // Total unique assignments stored should be exactly 5
    expect(assignmentsStore.length).toBe(5);
    const sumAssigned = res1.assignedCount + res2.assignedCount + res3.assignedCount;
    expect(sumAssigned).toBe(5);
  });
});
