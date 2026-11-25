import { describe, expect, it } from "vitest";
import {
  BUTTON_HEIGHT,
  COLORS,
  SPACING,
  TOUCH_TARGET_MIN,
} from "../src/theme/tokens";
import { FONTS } from "../src/theme/typography";
import { getStatusBarStyleForPath } from "../src/theme/status-bar";

describe("Nature Luxe Design System Tokens", () => {
  it("preserves exact approved Nature Luxe color palette", () => {
    expect(COLORS.primary).toBe("#0F6245");
    expect(COLORS.secondary).toBe("#1F8A67");
    expect(COLORS.accent).toBe("#D9A344");
    expect(COLORS.deepGreen).toBe("#08302E");
    expect(COLORS.background).toBe("#F8F5EE");
    expect(COLORS.surface).toBe("#FFFFFF");
    expect(COLORS.stoneBeige).toBe("#EFE6D6");
    expect(COLORS.textPrimary).toBe("#1F1F1F");
    expect(COLORS.textSecondary).toBe("#6B6B65");
    expect(COLORS.success).toBe("#16A34A");
    expect(COLORS.info).toBe("#0EA5E9");
    expect(COLORS.warning).toBe("#F59E0B");
    expect(COLORS.error).toBe("#EF4444");
  });

  it("enforces 8pt spatial multiples and >=44pt touch target minimums", () => {
    expect(TOUCH_TARGET_MIN).toBeGreaterThanOrEqual(44);
    expect(BUTTON_HEIGHT).toBeGreaterThanOrEqual(44);
    expect(SPACING.xs).toBe(8);
    expect(SPACING.md).toBe(16);
    expect(SPACING.lg).toBe(24);
    expect(SPACING.xl).toBe(32);
    expect(SPACING.xxl).toBe(48);
  });

  it("uses Playfair Display and Inter font families", () => {
    expect(FONTS.displaySemiBold).toContain("PlayfairDisplay");
    expect(FONTS.displayBold).toContain("PlayfairDisplay");
    expect(FONTS.bodyRegular).toContain("Inter");
    expect(FONTS.bodySemiBold).toContain("Inter");
  });

  it("selects high-contrast status bar style for dark vs light headers", () => {
    expect(getStatusBarStyleForPath("/")).toBe("light");
    expect(getStatusBarStyleForPath("/buyer")).toBe("light");
    expect(getStatusBarStyleForPath("/buyer/")).toBe("light");
    expect(getStatusBarStyleForPath("/seller")).toBe("light");
    expect(getStatusBarStyleForPath("/seller/")).toBe("light");

    expect(getStatusBarStyleForPath("/buyer/explore")).toBe("dark");
    expect(getStatusBarStyleForPath("/buyer/rfq")).toBe("dark");
    expect(getStatusBarStyleForPath("/buyer/messages")).toBe("dark");
    expect(getStatusBarStyleForPath("/buyer/account")).toBe("dark");
    expect(getStatusBarStyleForPath("/seller/products")).toBe("dark");
    expect(getStatusBarStyleForPath("/seller/leads")).toBe("dark");
    expect(getStatusBarStyleForPath("/seller/orders")).toBe("dark");
    expect(getStatusBarStyleForPath("/seller/account")).toBe("dark");
    expect(getStatusBarStyleForPath("/sign-in")).toBe("dark");
    expect(getStatusBarStyleForPath("/buyer/products/123")).toBe("dark");
  });
});
