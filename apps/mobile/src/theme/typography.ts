import { COLORS } from "./tokens";

export const FONTS = {
  displaySemiBold: "PlayfairDisplay_600SemiBold",
  displayBold: "PlayfairDisplay_700Bold",
  bodyRegular: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
} as const;

export const TYPOGRAPHY = {
  heroTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 30,
    lineHeight: 38,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  screenTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 24,
    lineHeight: 32,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 20,
    lineHeight: 27,
    color: COLORS.textPrimary,
  },
  cardTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  overline: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
    color: COLORS.accent,
  },
  eyebrow: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.35,
    textTransform: "uppercase" as const,
    color: COLORS.accent,
  },
  metricHero: {
    fontFamily: FONTS.displayBold,
    fontSize: 32,
    lineHeight: 36,
    color: COLORS.deepGreen,
    fontVariant: ["tabular-nums" as const],
  },
  metricValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    lineHeight: 26,
    color: COLORS.deepGreen,
    fontVariant: ["tabular-nums" as const],
  },
  body: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  bodyMedium: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  caption: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textPrimary,
  },
  micro: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
} as const;
