import { describe, expect, it } from "vitest";
import {
  createChunkedSecureStorage,
  type KeyValueDriver,
} from "../src/lib/secure-storage";

function createMemoryDriver(): { driver: KeyValueDriver; store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    driver: {
      getItem: async (k) => store.get(k) ?? null,
      setItem: async (k, v) => {
        store.set(k, v);
      },
      removeItem: async (k) => {
        store.delete(k);
      },
    },
  };
}

describe("Chunked SecureStore Adapter", () => {
  it("stores and retrieves small payloads directly without chunking", async () => {
    const { driver, store } = createMemoryDriver();
    const storage = createChunkedSecureStorage(driver);

    await storage.setItem("sb-session", "short-token-value");
    expect(store.get("sb-session")).toBe("short-token-value");
    expect(await storage.getItem("sb-session")).toBe("short-token-value");
  });

  it("splits >4KB Supabase JWT sessions into <=1800B chunks and reassembles cleanly", async () => {
    const { driver, store } = createMemoryDriver();
    const storage = createChunkedSecureStorage(driver);

    const bigSession = JSON.stringify({
      access_token: "a".repeat(2400),
      refresh_token: "r".repeat(1200),
      user: { id: "user-123", meta: "m".repeat(1200) },
    });
    expect(bigSession.length).toBeGreaterThan(4500);

    await storage.setItem("sb-auth", bigSession);

    expect(store.get("sb-auth")).toBeUndefined();
    expect(store.get("sb-auth__chunks")).toBe("3");
    for (const [k, v] of store.entries()) {
      if (k.includes("__chunk_")) {
        expect(v.length).toBeLessThanOrEqual(1800);
      }
    }

    const restored = await storage.getItem("sb-auth");
    expect(restored).toBe(bigSession);

    await storage.removeItem("sb-auth");
    expect(store.size).toBe(0);
    expect(await storage.getItem("sb-auth")).toBeNull();
  });

  it("returns null gracefully if any chunk is missing or corrupted", async () => {
    const { driver, store } = createMemoryDriver();
    const storage = createChunkedSecureStorage(driver);

    await storage.setItem("sb-auth", "x".repeat(4000));
    store.delete("sb-auth__chunk_1");

    expect(await storage.getItem("sb-auth")).toBeNull();
  });
});
