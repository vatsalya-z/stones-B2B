import { afterEach, describe, expect, it, vi } from "vitest";
import { createConsoleProvider, createResendProvider } from "../src";

afterEach(() => vi.unstubAllGlobals());

describe("email providers", () => {
  it("console provider returns a dev id", async () => {
    const r = await createConsoleProvider().send({ to: "a@b.com", subject: "s", html: "x" });
    expect(r.id).toMatch(/^dev-/);
  });

  it("resend provider sends bearer auth and returns the id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "abc" }) });
    vi.stubGlobal("fetch", fetchMock);
    const p = createResendProvider({ apiKey: "key", from: "x@y.com" });
    await expect(p.send({ to: "a@b.com", subject: "s", html: "x" })).resolves.toEqual({
      id: "abc",
    });
    const init = fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe("Bearer key");
  });

  it("throws without leaking the response body on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const p = createResendProvider({ apiKey: "key", from: "x@y.com" });
    await expect(p.send({ to: "a@b.com", subject: "s", html: "x" })).rejects.toThrow("HTTP 500");
  });
});
