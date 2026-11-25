import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { COLORS, RADII, SHADOWS, SPACING } from "../../theme/tokens";

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: "surface" | "ivory" | "beige" | "deep";
  variant?: "default" | "elevated" | "editorial" | "command";
}

export function Card({
  children,
  style,
  padded = true,
  tone = "surface",
  variant = "default",
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variantStyles[variant],
        toneStyles[tone],
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  padded: {
    padding: SPACING.md,
  },
});

const variantStyles: Record<NonNullable<CardProps["variant"]>, ViewStyle> = {
  default: { ...SHADOWS.card },
  elevated: { ...SHADOWS.elevated, borderColor: COLORS.borderStrong },
  editorial: { ...SHADOWS.subtle, borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  command: { ...SHADOWS.command, borderColor: COLORS.borderStrong },
};

const toneStyles: Record<NonNullable<CardProps["tone"]>, ViewStyle> = {
  surface: { backgroundColor: COLORS.surface },
  ivory: { backgroundColor: COLORS.ivoryElevated },
  beige: { backgroundColor: COLORS.stoneBeige, borderColor: COLORS.borderStrong },
  deep: { backgroundColor: COLORS.deepGreen, borderColor: COLORS.deepGreenBorder },
};
