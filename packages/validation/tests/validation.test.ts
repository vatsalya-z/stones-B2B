import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv, registerSchema } from "../src";

describe("env", () => {
  it("accepts valid public env", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "k",
    });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });
  it("rejects missing values", () => {
    expect(() => parsePublicEnv({})).toThrow(/Invalid public environment/);
    expect(() => parseServerEnv({ SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow();
  });
});

describe("registerSchema", () => {
  const base = { fullName: "Asha Rao", email: "A@B.com", password: "Strongpass1" };
  it("normalises email", () => {
    const r = registerSchema.parse({ ...base, accountType: "buyer" });
    expect(r.email).toBe("a@b.com");
  });
  it("rejects admin account type", () => {
    expect(registerSchema.safeParse({ ...base, accountType: "admin" }).success).toBe(false);
  });
  it("strips unknown role fields", () => {
    const r = registerSchema.parse({ ...base, accountType: "seller", role: "super_admin" });
    expect("role" in r).toBe(false);
  });
  it("rejects weak passwords", () => {
    expect(
      registerSchema.safeParse({ ...base, password: "short", accountType: "buyer" }).success,
    ).toBe(false);
  });
});
