export const COLORS = {
  primary: "#0F6245", // Forest Green
  secondary: "#1F8A67", // Jade Green
  accent: "#D9A344", // Copper Gold
  deepGreen: "#08302E", // Deep Green
  background: "#F8F5EE", // Warm Ivory
  surface: "#FFFFFF", // Surface White
  stoneBeige: "#EFE6D6", // Stone Beige
  textPrimary: "#1F1F1F", // Obsidian Charcoal
  textSecondary: "#6B6B65", // Warm Slate
  border: "#E4DAC8", // Travertine Hairline
  borderStrong: "#CFC2AC",
  success: "#16A34A",
  successSoft: "#EAF7EE",
  info: "#0EA5E9",
  infoSoft: "#E8F6FD",
  warning: "#F59E0B",
  warningSoft: "#FEF5E4",
  error: "#EF4444",
  errorSoft: "#FDECEC",
  overlay: "rgba(8, 48, 46, 0.56)",
  white: "#FFFFFF",
  // Derived architectural tonal micro-tokens preserving the approved palette
  deepGreenElevated: "#0D413E",
  deepGreenBorder: "#1A534F",
  primarySoft: "#E6F2ED",
  primaryBorder: "#B7DACB",
  accentSoft: "#FBF3E2",
  accentBorder: "#E6C98B",
  ivoryElevated: "#FCFBF7",
  textOnDarkMuted: "#C8DAD6",
} as const;

export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADII = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const TOUCH_TARGET_MIN = 44;
export const BUTTON_HEIGHT = 48;

export const SHADOWS = {
  subtle: {
    shadowColor: "#1F1F1F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: "#1F1F1F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: "#08302E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5,
  },
  command: {
    shadowColor: "#08302E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
} as const;
