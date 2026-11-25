import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { BUTTON_HEIGHT, COLORS, RADII, SPACING } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "copper"
  | "outline"
  | "ghost"
  | "danger";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "md" | "sm";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
  size = "md",
  leftIcon,
  rightIcon,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.selectionAsync().catch(() => undefined);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost"
              ? COLORS.primary
              : COLORS.white
          }
        />
      ) : (
        <View style={styles.inner}>
          {leftIcon ? <View style={styles.iconWrap}>{leftIcon}</View> : null}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              size === "sm" && styles.labelSm,
              labelVariantStyles[variant],
            ]}
          >
            {title}
          </Text>
          {rightIcon ? <View style={styles.iconWrap}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADII.sm,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  md: {
    minHeight: BUTTON_HEIGHT,
  },
  sm: {
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
  },
  fullWidth: {
    width: "100%",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    letterSpacing: 0.15,
  },
  labelSm: {
    fontSize: 13,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.deepGreen,
    borderColor: COLORS.deepGreen,
  },
  copper: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  outline: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.borderStrong,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
};

const labelVariantStyles: Record<ButtonVariant, { color: string }> = {
  primary: { color: COLORS.white },
  secondary: { color: COLORS.white },
  copper: { color: COLORS.deepGreen },
  outline: { color: COLORS.textPrimary },
  ghost: { color: COLORS.primary },
  danger: { color: COLORS.white },
};
