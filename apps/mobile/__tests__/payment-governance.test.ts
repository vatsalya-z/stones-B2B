import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAllowedBuyerOrderTransitions,
  getAllowedSellerOrderTransitions,
} from "../src/lib/domain-meta";

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe("Payment Model B & Client Security Invariants", () => {
  it("restricts buyer order transitions strictly to cancel (pending_payment) and confirm delivery (dispatched)", () => {
    expect(getAllowedBuyerOrderTransitions("pending_payment").map((a) => a.status)).toEqual([
      "cancelled",
    ]);
    expect(getAllowedBuyerOrderTransitions("dispatched").map((a) => a.status)).toEqual([
      "delivered",
    ]);
    expect(getAllowedBuyerOrderTransitions("confirmed")).toEqual([]);
    expect(getAllowedBuyerOrderTransitions("processing")).toEqual([]);
    expect(getAllowedBuyerOrderTransitions("delivered")).toEqual([]);
  });

  it("restricts seller fulfillment transitions and forbids seller from confirming unpaid orders", () => {
    expect(getAllowedSellerOrderTransitions("pending_payment", "pending")).toEqual([]);
    expect(getAllowedSellerOrderTransitions("pending_payment", "paid").map((a) => a.status)).toEqual([
      "confirmed",
    ]);
    expect(getAllowedSellerOrderTransitions("confirmed", "paid").map((a) => a.status)).toEqual([
      "processing",
    ]);
    expect(getAllowedSellerOrderTransitions("processing", "paid").map((a) => a.status)).toEqual([
      "dispatched",
    ]);
  });

  it("never exposes server-only secrets, server imports, or client-side payment_status mutations in apps/mobile", () => {
    const root = path.resolve(__dirname, "..");
    const sourceFiles = [
      ...collectFiles(path.join(root, "app")),
      ...collectFiles(path.join(root, "src")),
    ];
    expect(sourceFiles.length).toBeGreaterThan(20);

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(content).not.toContain("SUPABASE_SECRET_KEY");
      expect(content).not.toContain("sb_secret_");
      expect(content).not.toContain("@stone/auth/server");
      expect(content).not.toContain("@stone/database/server");
      expect(content).not.toContain("@stone/database/admin");
      expect(content).not.toContain("@stone/database/pg");
      expect(content).not.toMatch(/from\s+["']server-only["']/);
      expect(content).not.toMatch(/\.update\(\s*\{[^}]*payment_status\s*:/);
    }
  });
});
