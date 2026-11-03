import { describe, expect, it } from "vitest";
import {
  adminReasonSchema,
  sanitizeAdminSearchTerm,
  sellerAdminActionSchema,
  documentReviewSchema,
  productAdminActionSchema,
  bulkProductModerationSchema,
  accountStatusActionSchema,
  categoryFormSchema,
  deleteCategorySchema,
  grantAdminRoleSchema,
  revokeAdminRoleSchema,
  savePlatformSettingSchema,
  parseAdminDate,
  pickAllowed,
} from "../src";

const VALID_UUID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const VALID_UUID_2 = "7a85f643-5717-4562-b3fc-2c963f66afa7";

describe("Admin Console Validation Schemas (@stone/validation)", () => {
  describe("adminReasonSchema", () => {
    it("accepts valid reason and normalizes whitespace", () => {
      const res = adminReasonSchema.safeParse("   GSTIN   certificate   is expired   ");
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe("GSTIN certificate is expired");
      }
    });

    it("rejects reason with fewer than 10 characters", () => {
      const res = adminReasonSchema.safeParse("Too short");
      expect(res.success).toBe(false);
    });

    it("rejects reason exceeding 1000 characters", () => {
      const longReason = "A".repeat(1001);
      const res = adminReasonSchema.safeParse(longReason);
      expect(res.success).toBe(false);
    });
  });

  describe("sanitizeAdminSearchTerm", () => {
    it("strips filter syntax and SQL wildcards", () => {
      const sanitized = sanitizeAdminSearchTerm("Makrana, (Marble)% *test*");
      expect(sanitized).toBe("Makrana Marble test");
    });

    it("limits length to 80 characters", () => {
      const long = "A".repeat(100);
      expect(sanitizeAdminSearchTerm(long).length).toBe(80);
    });

    it("handles non-string input safely", () => {
      expect(sanitizeAdminSearchTerm(null)).toBe("");
      expect(sanitizeAdminSearchTerm(123)).toBe("");
    });
  });

  describe("sellerAdminActionSchema", () => {
    it("requires reason for reject, suspend, and request_documents", () => {
      const rejectWithoutReason = sellerAdminActionSchema.safeParse({
        sellerId: VALID_UUID,
        action: "reject",
      });
      expect(rejectWithoutReason.success).toBe(false);

      const rejectWithReason = sellerAdminActionSchema.safeParse({
        sellerId: VALID_UUID,
        action: "reject",
        reason: "Valid business license not provided.",
      });
      expect(rejectWithReason.success).toBe(true);

      const suspendWithoutReason = sellerAdminActionSchema.safeParse({
        sellerId: VALID_UUID,
        action: "suspend",
      });
      expect(suspendWithoutReason.success).toBe(false);

      const reqDocsWithReason = sellerAdminActionSchema.safeParse({
        sellerId: VALID_UUID,
        action: "request_documents",
        reason: "Please upload your latest GST filing certificate.",
      });
      expect(reqDocsWithReason.success).toBe(true);
    });

    it("allows approve without reason", () => {
      const res = sellerAdminActionSchema.safeParse({
        sellerId: VALID_UUID,
        action: "approve",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.reason).toBeNull();
      }
    });
  });

  describe("documentReviewSchema", () => {
    it("requires reason when rejecting a document", () => {
      const rejectedWithoutReason = documentReviewSchema.safeParse({
        documentId: VALID_UUID,
        status: "rejected",
      });
      expect(rejectedWithoutReason.success).toBe(false);

      const rejectedWithReason = documentReviewSchema.safeParse({
        documentId: VALID_UUID,
        status: "rejected",
        reason: "Uploaded scan is unreadable and blurred.",
      });
      expect(rejectedWithReason.success).toBe(true);
    });

    it("allows approving a document without reason", () => {
      const approved = documentReviewSchema.safeParse({
        documentId: VALID_UUID,
        status: "approved",
      });
      expect(approved.success).toBe(true);
    });
  });

  describe("productAdminActionSchema & bulkProductModerationSchema", () => {
    it("requires reason for restore, archive, reject, request_changes", () => {
      const restoreWithoutReason = productAdminActionSchema.safeParse({
        productId: VALID_UUID,
        action: "restore",
      });
      expect(restoreWithoutReason.success).toBe(false);

      const restoreWithReason = productAdminActionSchema.safeParse({
        productId: VALID_UUID,
        action: "restore",
        reason: "Product restored upon seller request for re-review.",
      });
      expect(restoreWithReason.success).toBe(true);

      const approveWithoutReason = productAdminActionSchema.safeParse({
        productId: VALID_UUID,
        action: "approve",
      });
      expect(approveWithoutReason.success).toBe(true);
    });

    it("bulk moderation limits to 50 items and unique UUIDs", () => {
      const validBulk = bulkProductModerationSchema.safeParse({
        productIds: [VALID_UUID, VALID_UUID_2],
        action: "approve",
      });
      expect(validBulk.success).toBe(true);

      const overLimitIds = Array.from({ length: 51 }, () => VALID_UUID);
      const overLimit = bulkProductModerationSchema.safeParse({
        productIds: overLimitIds,
        action: "approve",
      });
      expect(overLimit.success).toBe(false);
    });
  });

  describe("accountStatusActionSchema", () => {
    it("requires reason when suspending an account", () => {
      const suspendNoReason = accountStatusActionSchema.safeParse({
        userId: VALID_UUID,
        status: "suspended",
      });
      expect(suspendNoReason.success).toBe(false);

      const suspendWithReason = accountStatusActionSchema.safeParse({
        userId: VALID_UUID,
        status: "suspended",
        reason: "Policy violation: fraudulent commercial contact info.",
      });
      expect(suspendWithReason.success).toBe(true);

      const activeNoReason = accountStatusActionSchema.safeParse({
        userId: VALID_UUID,
        status: "active",
      });
      expect(activeNoReason.success).toBe(true);
    });
  });

  describe("categoryFormSchema & deleteCategorySchema", () => {
    it("validates and normalizes category form inputs", () => {
      const valid = categoryFormSchema.safeParse({
        name: "Makrana Marble",
        slug: "makrana-marble",
        displayOrder: 1,
        isActive: true,
      });
      expect(valid.success).toBe(true);

      const invalidSlug = categoryFormSchema.safeParse({
        name: "Makrana Marble",
        slug: "Makrana Marble With Spaces!",
      });
      expect(invalidSlug.success).toBe(false);
    });

    it("validates delete category UUID", () => {
      expect(deleteCategorySchema.safeParse({ categoryId: VALID_UUID }).success).toBe(true);
      expect(deleteCategorySchema.safeParse({ categoryId: "not-a-uuid" }).success).toBe(false);
    });
  });

  describe("role delegation and platform settings schemas", () => {
    it("grantAdminRoleSchema accepts admin or super_admin with userId or email", () => {
      expect(
        grantAdminRoleSchema.safeParse({ userId: VALID_UUID, role: "admin" }).success,
      ).toBe(true);
      expect(
        grantAdminRoleSchema.safeParse({ email: "admin@stonesdekho.com", role: "super_admin" }).success,
      ).toBe(true);
      expect(
        grantAdminRoleSchema.safeParse({ userId: VALID_UUID, role: "buyer" }).success,
      ).toBe(false);
      expect(
        grantAdminRoleSchema.safeParse({ role: "admin" }).success,
      ).toBe(false);
    });

    it("revokeAdminRoleSchema accepts valid userId and admin role", () => {
      expect(
        revokeAdminRoleSchema.safeParse({ userId: VALID_UUID, role: "admin" }).success,
      ).toBe(true);
      expect(
        revokeAdminRoleSchema.safeParse({ userId: VALID_UUID, role: "buyer" }).success,
      ).toBe(false);
      expect(
        revokeAdminRoleSchema.safeParse({ userId: "invalid-uuid", role: "admin" }).success,
      ).toBe(false);
    });

    it("savePlatformSettingSchema validates known keys and object payload", () => {
      const validSetting = savePlatformSettingSchema.safeParse({
        key: "marketplace",
        value: {
          name: "StonesDekho India",
          default_currency: "INR",
        },
        isPublic: true,
      });
      expect(validSetting.success).toBe(true);

      const invalidKey = savePlatformSettingSchema.safeParse({
        key: "unknown_key",
        value: {},
      });
      expect(invalidKey.success).toBe(false);
    });
  });

  describe("query helpers (parseAdminDate, pickAllowed)", () => {
    it("parses valid dates and returns null for invalid dates", () => {
      expect(parseAdminDate("2026-10-31")).toBe("2026-10-31");
      expect(parseAdminDate("invalid-date")).toBeNull();
      expect(parseAdminDate(null)).toBeNull();
    });

    it("pickAllowed picks only matching values or returns fallback", () => {
      const allowed = ["approved", "rejected"] as const;
      expect(pickAllowed("approved", allowed, "approved")).toBe("approved");
      expect(pickAllowed("invalid", allowed, "approved")).toBe("approved");
    });
  });
});
