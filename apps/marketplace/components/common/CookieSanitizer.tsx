"use client";

import { useEffect } from "react";

const ACTIVE_SUPABASE_PROJECT_REF = "rgmasamasslqintssyrh";

/**
 * CookieSanitizer
 * Client-side defense against HTTP 431 Request Header Fields Too Large.
 * Inspects document.cookie on mount and removes obsolete/orphaned cookies
 * left over from local Docker Supabase runs (sb-127-*, sb-localhost-*)
 * or obsolete projects.
 */
export function CookieSanitizer() {
  useEffect(() => {
    try {
      if (typeof document === "undefined" || !document.cookie) return;

      const cookies = document.cookie.split(";");
      let cleaned = 0;

      for (const item of cookies) {
        const trimmed = item.trim();
        const eqPos = trimmed.indexOf("=");
        const name = (eqPos > -1 ? trimmed.slice(0, eqPos) : trimmed).trim();

        const isStaleLocal =
          name.startsWith("sb-127-") ||
          name.startsWith("sb-localhost-") ||
          name.includes("127-0-0-1");

        const isObsoleteRef =
          name.startsWith("sb-") &&
          !name.startsWith(`sb-${ACTIVE_SUPABASE_PROJECT_REF}-`) &&
          !name.startsWith(`sb-${ACTIVE_SUPABASE_PROJECT_REF}`);

        if (isStaleLocal || isObsoleteRef) {
          // Clear across current host and root path
          document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.info(`[CookieSanitizer] Cleaned up ${cleaned} stale cookie(s) to optimize header size.`);
      }
    } catch {
      // Non-critical, ignore
    }
  }, []);

  return null;
}
