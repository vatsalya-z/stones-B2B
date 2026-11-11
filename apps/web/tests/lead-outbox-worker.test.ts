import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import {
  retryFailedLeadNotifications,
  type SupabaseMatchClient,
} from "@/features/matching/supplier-matching";
import { GET as leadOutboxCronHandler } from "@/app/api/cron/lead-outbox/route";

vi.mock("@stone/database/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@stone/database/admin";

describe("StoneB2B Phase 3.2 — Lead Outbox Worker & Cron Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes both failed and stale pending lead assignments", async () => {
    const store = [
      {
        id: "la-pending-1",
        enquiry_id: "enq-1",
        seller_id: "sel-1",
        retry_count: 0,
        notification_status: "pending",
      },
      {
        id: "la-failed-1",
        enquiry_id: "enq-2",
        seller_id: "sel-2",
        retry_count: 1,
        notification_status: "failed",
      },
    ];

    const notifications: Record<string, unknown>[] = [];

    const mockClient: SupabaseMatchClient = {
      from: vi.fn((table: string) => {
        if (table === "lead_assignments") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn((col: string, vals: string[]) => {
                const filtered = store.filter((item) =>
                  vals.includes(item[col as keyof typeof item] as string),
                );
                return Promise.resolve({ data: filtered, error: null });
              }),
            }),
            update: vi.fn((payload: Record<string, unknown>) => ({
              eq: vi.fn((col: string, val: string) => {
                const target = store.find((item) => item[col as keyof typeof item] === val);
                if (target) {
                  Object.assign(target, payload);
                }
                return Promise.resolve({ error: null, data: target });
              }),
            })),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        if (table === "seller_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn((col: string, val: string) => {
                return Promise.resolve({
                  data: [{ id: val, user_id: `usr-${val}` }],
                  error: null,
                });
              }),
            }),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        if (table === "notifications") {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              notifications.push(payload);
              return Promise.resolve({ error: null, data: payload });
            }),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        return { select: vi.fn().mockReturnThis() } as unknown as ReturnType<
          SupabaseMatchClient["from"]
        >;
      }),
    };

    const res = await retryFailedLeadNotifications(mockClient);

    expect(res.retried).toBe(2);
    expect(res.succeeded).toBe(2);
    expect(res.failed).toBe(0);
    expect(notifications.length).toBe(2);
    expect(store.every((s) => s.notification_status === "delivered")).toBe(true);
    expect(store.find((s) => s.id === "la-failed-1")?.retry_count).toBe(2);
  });

  it("bounds retries: transitions to 'abandoned' when retry_count >= 3", async () => {
    const store = [
      {
        id: "la-exhausted",
        enquiry_id: "enq-99",
        seller_id: "sel-99",
        retry_count: 3,
        notification_status: "failed",
      },
    ];

    const mockClient: SupabaseMatchClient = {
      from: vi.fn((table: string) => {
        if (table === "lead_assignments") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn(() => Promise.resolve({ data: store, error: null })),
            }),
            update: vi.fn((payload: Record<string, unknown>) => ({
              eq: vi.fn((col: string, val: string) => {
                const target = store.find((item) => item[col as keyof typeof item] === val);
                if (target) {
                  Object.assign(target, payload);
                }
                return Promise.resolve({ error: null, data: target });
              }),
            })),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }
        return { select: vi.fn().mockReturnThis() } as unknown as ReturnType<
          SupabaseMatchClient["from"]
        >;
      }),
    };

    const res = await retryFailedLeadNotifications(mockClient);

    // Should not re-attempt notification dispatch
    expect(res.retried).toBe(0);
    expect(res.succeeded).toBe(0);
    expect(store[0]?.notification_status).toBe("abandoned");
  });

  it("enforces atomic claiming lock against duplicate processing", async () => {
    const assignment = {
      id: "la-concurrency",
      enquiry_id: "enq-conc",
      seller_id: "sel-conc",
      retry_count: 0,
      notification_status: "failed",
    };

    let claimAttempts = 0;
    const notifications: Record<string, unknown>[] = [];

    const createSimulatedClient = (): SupabaseMatchClient => ({
      from: vi.fn((table: string) => {
        if (table === "lead_assignments") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn(() => Promise.resolve({ data: [assignment], error: null })),
            }),
            update: vi.fn((payload: Record<string, unknown>) => ({
              eq: vi.fn(() => {
                if (payload.notification_status === "processing") {
                  claimAttempts++;
                  if (claimAttempts > 1) {
                    // Simulate second worker failing to claim because already locked
                    return Promise.resolve({
                      error: { message: "Could not obtain lock on row" },
                    });
                  }
                  assignment.notification_status = "processing";
                } else if (payload.notification_status === "delivered") {
                  assignment.notification_status = "delivered";
                }
                return Promise.resolve({ error: null, data: assignment });
              }),
            })),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        if (table === "seller_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [{ id: "sel-conc", user_id: "usr-conc" }],
                  error: null,
                }),
              ),
            }),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        if (table === "notifications") {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              notifications.push(payload);
              return Promise.resolve({ error: null, data: payload });
            }),
          } as unknown as ReturnType<SupabaseMatchClient["from"]>;
        }

        return { select: vi.fn().mockReturnThis() } as unknown as ReturnType<
          SupabaseMatchClient["from"]
        >;
      }),
    });

    // Run two workers simultaneously on the same assignment
    const [res1, res2] = await Promise.all([
      retryFailedLeadNotifications(createSimulatedClient()),
      retryFailedLeadNotifications(createSimulatedClient()),
    ]);

    // Only one worker should have successfully claimed and dispatched the notification
    const totalSucceeded = res1.succeeded + res2.succeeded;
    expect(totalSucceeded).toBe(1);
    expect(notifications.length).toBe(1);
    expect(assignment.notification_status).toBe("delivered");
  });

  describe("HTTP Cron Endpoint: GET /api/cron/lead-outbox", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    it("rejects unauthorized cron requests when CRON_SECRET is configured", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token-12345";

      const req = new NextRequest("http://localhost:3000/api/cron/lead-outbox", {
        headers: {
          authorization: "Bearer wrong-token",
        },
      });

      const res = await leadOutboxCronHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("accepts valid requests with Authorization Bearer header", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token-12345";

      const mockSupabaseAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(
        mockSupabaseAdmin as unknown as ReturnType<typeof createAdminClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/cron/lead-outbox", {
        headers: {
          authorization: "Bearer super-secret-cron-token-12345",
        },
      });

      const res = await leadOutboxCronHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.stats).toEqual({ retried: 0, succeeded: 0, failed: 0 });
    });

    it("accepts valid requests with x-cron-secret header", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token-12345";

      const mockSupabaseAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(
        mockSupabaseAdmin as unknown as ReturnType<typeof createAdminClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/cron/lead-outbox", {
        headers: {
          "x-cron-secret": "super-secret-cron-token-12345",
        },
      });

      const res = await leadOutboxCronHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
