import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../theme/typography";

export interface SectionHeaderProps {
  overline?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({
  overline,
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        {overline ? (
          <View style={styles.overlineRow}>
            <View style={styles.accentBar} />
            <Text style={TYPOGRAPHY.eyebrow}>{overline}</Text>
          </View>
        ) : null}
        <Text style={[TYPOGRAPHY.sectionTitle, overline ? styles.withOverline : null]}>
          {title}
        </Text>
        {subtitle ? <Text style={[TYPOGRAPHY.caption, styles.subtitle]}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  textWrap: {
    flex: 1,
  },
  overlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  accentBar: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent,
  },
  withOverline: {
    marginTop: 3,
  },
  subtitle: {
    marginTop: 2,
  },
  actionBtn: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: SPACING.xs,
  },
  actionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.primary,
  },
});
