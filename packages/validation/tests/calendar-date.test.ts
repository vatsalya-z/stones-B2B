import { describe, expect, it } from "vitest";
import {
  calendarDateSchema,
  isValidCalendarDate,
  optionalCalendarDateSchema,
} from "../src/date";

describe("Calendar Date Validation (Section 2)", () => {
  describe("isValidCalendarDate helper", () => {
    it("accepts strictly valid calendar dates in YYYY-MM-DD format", () => {
      expect(isValidCalendarDate("2026-12-15")).toBe(true);
      expect(isValidCalendarDate("2026-01-01")).toBe(true);
      expect(isValidCalendarDate("2026-07-31")).toBe(true);
      expect(isValidCalendarDate("2026-10-31")).toBe(true);
      expect(isValidCalendarDate("2026-04-30")).toBe(true);
    });

    it("accepts February 29 on valid leap years", () => {
      expect(isValidCalendarDate("2024-02-29")).toBe(true); // Divisible by 4
      expect(isValidCalendarDate("2028-02-29")).toBe(true); // Divisible by 4
      expect(isValidCalendarDate("2000-02-29")).toBe(true); // Divisible by 400 (century leap year)
    });

    it("rejects February 29 on non-leap years", () => {
      expect(isValidCalendarDate("2025-02-29")).toBe(false);
      expect(isValidCalendarDate("2026-02-29")).toBe(false);
      expect(isValidCalendarDate("2027-02-29")).toBe(false);
      expect(isValidCalendarDate("1900-02-29")).toBe(false); // Divisible by 100 but not 400
      expect(isValidCalendarDate("2100-02-29")).toBe(false); // Divisible by 100 but not 400
    });

    it("rejects February 30 and February 31 even on leap years", () => {
      expect(isValidCalendarDate("2024-02-30")).toBe(false);
      expect(isValidCalendarDate("2024-02-31")).toBe(false);
      expect(isValidCalendarDate("2026-02-30")).toBe(false);
    });

    it("rejects invalid month values (00 or >12)", () => {
      expect(isValidCalendarDate("2026-00-15")).toBe(false);
      expect(isValidCalendarDate("2026-13-01")).toBe(false);
      expect(isValidCalendarDate("2026-99-01")).toBe(false);
    });

    it("rejects invalid day values (00 or >31)", () => {
      expect(isValidCalendarDate("2026-01-00")).toBe(false);
      expect(isValidCalendarDate("2026-01-32")).toBe(false);
      expect(isValidCalendarDate("2026-05-32")).toBe(false);
    });

    it("rejects month-specific 31st days on 30-day months", () => {
      expect(isValidCalendarDate("2026-04-31")).toBe(false); // April has 30 days
      expect(isValidCalendarDate("2026-06-31")).toBe(false); // June has 30 days
      expect(isValidCalendarDate("2026-09-31")).toBe(false); // September has 30 days
      expect(isValidCalendarDate("2026-11-31")).toBe(false); // November has 30 days
    });

    it("rejects extreme invalid dates such as 2026-99-99", () => {
      expect(isValidCalendarDate("2026-99-99")).toBe(false);
      expect(isValidCalendarDate("9999-99-99")).toBe(false);
      expect(isValidCalendarDate("0000-00-00")).toBe(false);
    });

    it("rejects empty, malformed, non-string, or alternative formatted inputs", () => {
      expect(isValidCalendarDate("")).toBe(false);
      expect(isValidCalendarDate("   ")).toBe(false);
      expect(isValidCalendarDate("not-a-date")).toBe(false);
      expect(isValidCalendarDate("2026/12/15")).toBe(false);
      expect(isValidCalendarDate("15-12-2026")).toBe(false);
      expect(isValidCalendarDate("2026-1-5")).toBe(false);
      expect(isValidCalendarDate(null)).toBe(false);
      expect(isValidCalendarDate(undefined)).toBe(false);
      expect(isValidCalendarDate(20261215)).toBe(false);
    });
  });

  describe("calendarDateSchema (strict required schema)", () => {
    it("successfully parses valid date", () => {
      const res = calendarDateSchema.safeParse("2026-12-15");
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe("2026-12-15");
      }
    });

    it("rejects invalid date with clean error message", () => {
      const res = calendarDateSchema.safeParse("2026-02-29");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toMatch(/valid calendar date/i);
      }
    });
  });

  describe("optionalCalendarDateSchema", () => {
    it("transforms empty string or null to null", () => {
      expect(optionalCalendarDateSchema.safeParse("").data).toBe(null);
      expect(optionalCalendarDateSchema.safeParse(null).data).toBe(null);
      expect(optionalCalendarDateSchema.safeParse(undefined).data).toBe(null);
    });

    it("parses valid date string", () => {
      const res = optionalCalendarDateSchema.safeParse("2026-08-20");
      expect(res.success).toBe(true);
      expect(res.data).toBe("2026-08-20");
    });

    it("rejects invalid dates (e.g. 2026-99-99 or 2026-02-29)", () => {
      expect(optionalCalendarDateSchema.safeParse("2026-99-99").success).toBe(false);
      expect(optionalCalendarDateSchema.safeParse("2026-02-29").success).toBe(false);
      expect(optionalCalendarDateSchema.safeParse("2026-04-31").success).toBe(false);
    });
  });
});

