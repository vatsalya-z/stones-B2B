const LIGHT_STATUS_BAR_PATHS = new Set([
  "/",
  "/buyer",
  "/buyer/index",
  "/buyer/(tabs)",
  "/buyer/(tabs)/index",
  "/seller",
  "/seller/index",
  "/seller/(tabs)",
  "/seller/(tabs)/index",
]);

/**
 * Selects high-contrast system status bar icon color per route:
 * - "light" (white icons) for Deep Green (#08302E) top-edge screens
 * - "dark" (dark icons) for Warm Ivory / Surface light-header screens
 */
export function getStatusBarStyleForPath(pathname: string): "light" | "dark" {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return LIGHT_STATUS_BAR_PATHS.has(normalized) ? "light" : "dark";
}
