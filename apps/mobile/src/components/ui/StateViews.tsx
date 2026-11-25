import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../theme/typography";
import { Button } from "./Button";

export function ScreenHeader({
  title,
  subtitle,
  overline,
  showBack = true,
  rightSlot,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  overline?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
  dark?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fg = dark ? COLORS.white : COLORS.textPrimary;

  return (
    <View
      style={[
        styles.headerWrap,
        dark && styles.headerDark,
        { paddingTop: Math.max(insets.top, 12) + 4 },
      ]}
    >
      <View style={styles.headerRow}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.backBtn, dark && styles.backBtnDark]}
          >
            <Ionicons name="arrow-back" size={20} color={fg} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.headerTitleWrap}>
          {overline ? <Text style={TYPOGRAPHY.eyebrow}>{overline}</Text> : null}
          <Text numberOfLines={1} style={[TYPOGRAPHY.screenTitle, styles.headerTitle, { color: fg }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[
                TYPOGRAPHY.caption,
                { color: dark ? COLORS.textOnDarkMuted : COLORS.textSecondary },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightWrap}>{rightSlot}</View>
      </View>
    </View>
  );
}

export function EmptyState({
  icon = "layers-outline",
  title,
  description,
  steps,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  steps?: string[];
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      <View style={styles.outerRing}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={26} color={COLORS.primary} />
        </View>
      </View>
      <Text style={[TYPOGRAPHY.sectionTitle, styles.stateTitle]}>{title}</Text>
      <Text style={[TYPOGRAPHY.caption, styles.stateDesc]}>{description}</Text>

      {steps && steps.length > 0 ? (
        <View style={styles.guideBox}>
          <Text style={styles.guideEyebrow}>HOW IT WORKS</Text>
          {steps.map((step, idx) => (
            <View key={step} style={[styles.guideRow, idx > 0 && styles.guideRowBorder]}>
              <View style={styles.guideIndex}>
                <Text style={styles.guideIndexText}>{idx + 1}</Text>
              </View>
              <Text style={styles.guideText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={styles.stateBtn}
        />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = "Unable to load data",
  message,
  onRetry,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      <View style={[styles.outerRing, { borderColor: "#FECACA" }]}>
        <View style={[styles.iconCircle, { backgroundColor: COLORS.errorSoft }]}>
          <Ionicons name="alert-circle-outline" size={26} color={COLORS.error} />
        </View>
      </View>
      <Text style={[TYPOGRAPHY.sectionTitle, styles.stateTitle]}>{title}</Text>
      <Text style={[TYPOGRAPHY.caption, styles.stateDesc]}>
        {message || "Please check your connection and try again."}
      </Text>
      {onRetry ? (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="outline"
          size="sm"
          style={styles.stateBtn}
        />
      ) : null}
    </View>
  );
}

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.offline}>
      <Ionicons name="cloud-offline-outline" size={16} color={COLORS.white} />
      <Text style={styles.offlineText}>
        Network connection unavailable. Showing cached data where available.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    ...SHADOWS.subtle,
  },
  headerDark: {
    backgroundColor: COLORS.deepGreen,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: TOUCH_TARGET_MIN,
    gap: SPACING.xs,
  },
  backBtn: {
    width: TOUCH_TARGET_MIN - 4,
    height: TOUCH_TARGET_MIN - 4,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnDark: {
    backgroundColor: COLORS.deepGreenElevated,
    borderColor: COLORS.deepGreenBorder,
  },
  backPlaceholder: {
    width: 4,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 25,
  },
  rightWrap: {
    minWidth: TOUCH_TARGET_MIN,
    alignItems: "flex-end",
  },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: SPACING.md,
    ...SHADOWS.card,
  },
  outerRing: {
    width: 70,
    height: 70,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.ivoryElevated,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    textAlign: "center",
  },
  stateDesc: {
    textAlign: "center",
    marginTop: 6,
    maxWidth: 290,
  },
  guideBox: {
    width: "100%",
    marginTop: SPACING.md,
    backgroundColor: COLORS.ivoryElevated,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  guideEyebrow: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: COLORS.accent,
    marginBottom: 6,
  },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: 6,
  },
  guideRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  guideIndex: {
    width: 20,
    height: 20,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.stoneBeige,
    alignItems: "center",
    justifyContent: "center",
  },
  guideIndexText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.deepGreen,
  },
  guideText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textPrimary,
  },
  stateBtn: {
    marginTop: SPACING.md,
  },
  offline: {
    backgroundColor: COLORS.deepGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
  },
  offlineText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.white,
  },
});
