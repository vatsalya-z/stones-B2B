import { z } from "zod";

/**
 * Validates that a string is a strictly valid calendar date in YYYY-MM-DD format.
 * Correctly validates:
 * - Proper ISO format YYYY-MM-DD
 * - Valid month (01-12)
 * - Valid day for the specific month (including leap year checks for Feb 29)
 * - Rejects JavaScript Date roll-overs (e.g. 2026-02-29, 2026-04-31, 2026-99-99)
 */
export function isValidCalendarDate(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Construct UTC date and verify that year, month, day match without rollover
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Strict Zod schema for required calendar date in YYYY-MM-DD format.
 */
export const calendarDateSchema = z
  .string({ required_error: "Delivery date is required" })
  .trim()
  .refine(isValidCalendarDate, {
    message: "Please enter a valid calendar date in YYYY-MM-DD format",
  });

/**
 * Optional / nullable Zod schema for calendar date in YYYY-MM-DD format.
 * Converts empty strings or missing values to null.
 */
export const optionalCalendarDateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(""))
  .transform((v, ctx) => {
    if (!v) return null;
    if (!isValidCalendarDate(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide delivery date in valid YYYY-MM-DD calendar format",
      });
      return z.NEVER;
    }
    return v;
  });

