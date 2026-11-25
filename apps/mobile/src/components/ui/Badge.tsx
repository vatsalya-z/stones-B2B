import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { COLORS, RADII, SPACING } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "copper"
  | "success"
  | "info"
  | "warning"
  | "error";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const TONE_MAP: Record<BadgeTone, { bg: string; border: string; text: string }> = {
  neutral: { bg: COLORS.stoneBeige, border: COLORS.border, text: COLORS.textPrimary },
  primary: { bg: "#E6F2ED", border: "#B7DACB", text: COLORS.primary },
  copper: { bg: "#FBF3E2", border: "#EAD09C", text: "#8A5E14" },
  success: { bg: COLORS.successSoft, border: "#B8E5C6", text: "#15803D" },
  info: { bg: COLORS.infoSoft, border: "#BAE6FD", text: "#0369A1" },
  warning: { bg: COLORS.warningSoft, border: "#FDE68A", text: "#B45309" },
  error: { bg: COLORS.errorSoft, border: "#FECACA", text: "#B91C1C" },
};

export function Badge({ label, tone = "neutral", icon, style }: BadgeProps) {
  const palette = TONE_MAP[tone];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      {icon}
      <Text numberOfLines={1} style={[styles.text, { color: palette.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: RADII.xs,
    borderWidth: 1,
  },
  text: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    lineHeight: 14,
  },
});
