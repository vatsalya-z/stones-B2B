import { describe, expect, it } from "vitest";
import { getEmailProvider } from "../src/lib/email.js";

describe("getEmailProvider", () => {
  it("falls back to console provider without credentials", async () => {
    const p = getEmailProvider({});
    const r = await p.send({ to: "a@b.com", subject: "s", html: "<p>x</p>" });
    expect(r.id.startsWith("dev-")).toBe(true);
  });
});
