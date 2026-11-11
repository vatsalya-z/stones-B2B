import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SlidingWindowRateLimiter,
  getClientIp,
  accountRateLimiter,
  ipRateLimiter,
} from "@/lib/rate-limit";
import { POST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn().mockImplementation(({ password }) => {
        if (password === "validPassword123") {
          return Promise.resolve({ data: { user: { id: "user-1" } }, error: null });
        }
        return Promise.resolve({
          data: { user: null },
          error: { name: "AuthApiError", message: "Invalid login credentials" },
        });
      }),
    },
  }),
}));

describe("SlidingWindowRateLimiter Unit Tests", () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({ windowMs: 1000, maxRequests: 3 });
  });

  it("allows requests up to the max threshold", () => {
    const r1 = limiter.check("test-user");
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check("test-user");
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check("test-user");
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests once threshold is exceeded and provides retryAfterSeconds", () => {
    limiter.check("test-user");
    limiter.check("test-user");
    limiter.check("test-user");

    const r4 = limiter.check("test-user");
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets rate limit when reset() is called", () => {
    limiter.check("test-user");
    limiter.check("test-user");
    limiter.check("test-user");
    expect(limiter.check("test-user").allowed).toBe(false);

    limiter.reset("test-user");
    expect(limiter.check("test-user").allowed).toBe(true);
  });

  it("cleans up expired entries", async () => {
    limiter.check("key-1");
    expect(limiter.size()).toBe(1);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1050));
    limiter.cleanup();
    expect(limiter.size()).toBe(0);
  });
});

describe("Anti-Spoofing getClientIp Utility Tests", () => {
  it("prioritizes trusted x-real-ip over spoofed x-forwarded-for", () => {
    const req = new Request("http://localhost:3000", {
      headers: {
        "x-real-ip": "198.51.100.1",
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      },
    });
    expect(getClientIp(req)).toBe("198.51.100.1");
  });

  it("prioritizes cf-connecting-ip if x-real-ip is absent", () => {
    const req = new Request("http://localhost:3000", {
      headers: {
        "cf-connecting-ip": "103.21.244.2",
        "x-forwarded-for": "1.1.1.1",
      },
    });
    expect(getClientIp(req)).toBe("103.21.244.2");
  });

  it("extracts valid IP from x-forwarded-for when direct headers absent", () => {
    const req = new Request("http://localhost:3000", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    expect(getClientIp(req)).toBe("203.0.113.195");
  });

  it("defaults to 127.0.0.1 when header contains invalid injection strings", () => {
    const req = new Request("http://localhost:3000", {
      headers: { "x-forwarded-for": "malicious_script_header" },
    });
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});

describe("POST /api/auth/login Dual-Bucket Rate Limiting Integration", () => {
  const testEmail = `brute_target_${Date.now()}@example.com`;
  const testIp = "198.51.100.42";

  beforeEach(() => {
    accountRateLimiter.reset(`account:${testEmail.toLowerCase()}`);
    ipRateLimiter.reset(`ip:${testIp}`);
  });

  function makeLoginRequest(email: string, password = "wrongPassword", ip = testIp) {
    return new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": ip,
      },
      body: JSON.stringify({ email, password }),
    });
  }

  it("enforces 429 Too Many Requests after 5 failed attempts on the target account", async () => {
    // Attempts 1 to 5 fail with 401
    for (let i = 1; i <= 5; i++) {
      const res = await POST(makeLoginRequest(testEmail));
      expect(res.status).toBe(401);
    }

    // Attempt 6 should be rejected with 429
    const blockedRes = await POST(makeLoginRequest(testEmail));
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get("Retry-After")).toBeTruthy();

    const json = await blockedRes.json();
    expect(json.error).toContain("Too many failed attempts for this account");
  });

  it("normalizes email addresses regardless of casing", async () => {
    const upperEmail = testEmail.toUpperCase();

    // 5 attempts with mixed-casing email
    for (let i = 1; i <= 5; i++) {
      await POST(makeLoginRequest(upperEmail));
    }

    // Attempt 6 with lowercase email should be blocked under same account bucket
    const blockedRes = await POST(makeLoginRequest(testEmail.toLowerCase()));
    expect(blockedRes.status).toBe(429);
  });

  it("resets account and IP rate limiters on successful authentication", async () => {
    // 3 failed attempts
    for (let i = 1; i <= 3; i++) {
      await POST(makeLoginRequest(testEmail, "wrong"));
    }

    // 1 successful attempt
    const successRes = await POST(makeLoginRequest(testEmail, "validPassword123"));
    expect(successRes.status).toBe(200);

    // After success, can attempt again without triggering threshold
    for (let i = 1; i <= 4; i++) {
      const res = await POST(makeLoginRequest(testEmail, "wrong"));
      expect(res.status).toBe(401);
    }
  });
});
