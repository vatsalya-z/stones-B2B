import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";

export type ProgressTone = "primary" | "accent" | "success" | "warning";

const TONE_COLOR: Record<ProgressTone, string> = {
  primary: COLORS.primary,
  accent: COLORS.accent,
  success: COLORS.success,
  warning: COLORS.warning,
};

export function ProgressBar({
  value,
  max = 100,
  label,
  rightLabel,
  tone = "primary",
  height = 6,
  darkTrack = false,
}: {
  value: number;
  max?: number;
  label?: string;
  rightLabel?: string;
  tone?: ProgressTone;
  height?: number;
  darkTrack?: boolean;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));

  return (
    <View style={styles.progressWrap}>
      {label || rightLabel ? (
        <View style={styles.progressHeader}>
          {label ? (
            <Text style={[styles.progressLabel, darkTrack && styles.textDarkMuted]}>{label}</Text>
          ) : (
            <View />
          )}
          {rightLabel ? (
            <Text style={[styles.progressRight, darkTrack && styles.textDarkStrong]}>
              {rightLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.track,
          { height, borderRadius: height },
          darkTrack && styles.trackDark,
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              height,
              borderRadius: height,
              backgroundColor: TONE_COLOR[tone],
            },
          ]}
        />
      </View>
    </View>
  );
}

export interface PipelineMetricItem {
  label: string;
  value: number;
  subtitle?: string;
  stageCode?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "primary" | "secondary" | "accent" | "deepGreen";
  onPress?: () => void;
}

const PIPELINE_TONE: Record<
  NonNullable<PipelineMetricItem["tone"]>,
  { bar: string; softBg: string; border: string; fg: string }
> = {
  primary: {
    bar: COLORS.primary,
    softBg: COLORS.primarySoft,
    border: COLORS.primaryBorder,
    fg: COLORS.primary,
  },
  secondary: {
    bar: COLORS.secondary,
    softBg: COLORS.primarySoft,
    border: COLORS.primaryBorder,
    fg: COLORS.secondary,
  },
  accent: {
    bar: COLORS.accent,
    softBg: COLORS.accentSoft,
    border: COLORS.accentBorder,
    fg: "#8A5E14",
  },
  deepGreen: {
    bar: COLORS.deepGreen,
    softBg: COLORS.stoneBeige,
    border: COLORS.borderStrong,
    fg: COLORS.deepGreen,
  },
};

export function PipelineBarChart({
  items,
  conversionLabel = "Pipeline Conversion",
  conversionValue,
  totalVolume,
  footerSummary,
  footerActionLabel,
  onFooterAction,
  emptyMessage = "Enquiries, matched leads, quotes, and active orders appear here as buyers request quotes.",
}: {
  items: PipelineMetricItem[];
  conversionLabel?: string;
  conversionValue?: string;
  totalVolume?: number;
  footerSummary?: string;
  footerActionLabel?: string;
  onFooterAction?: () => void;
  emptyMessage?: string;
}) {
  const maxVal = Math.max(...items.map((i) => i.value), 0);
  const computedTotal = totalVolume ?? items.reduce((sum, i) => sum + i.value, 0);

  return (
    <View style={styles.funnelCard}>
      {/* Executive Deep Teal-Green Pipeline Velocity Header */}
      <View style={styles.funnelHeader}>
        <View style={styles.funnelHeaderLeft}>
          <Text style={styles.funnelEyebrow}>PIPELINE VELOCITY</Text>
          <View style={styles.velocityRow}>
            <Text style={styles.velocityLabel}>{conversionLabel}</Text>
            <View style={styles.velocityChip}>
              <Text style={styles.velocityChipText}>
                {conversionValue ?? (computedTotal > 0 ? `${computedTotal} active` : "Ready for RFQ")}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.funnelTotalBox}>
          <Text style={styles.funnelTotalNum}>{computedTotal}</Text>
          <Text style={styles.funnelTotalCap}>Total Events</Text>
        </View>
      </View>

      {/* Connected Stepped Funnel Stages */}
      <View style={styles.stagesBody}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const palette = PIPELINE_TONE[item.tone ?? "primary"];
          const widthPct =
            maxVal > 0
              ? Math.max(item.value > 0 ? 12 : 0, Math.round((item.value / maxVal) * 100))
              : 0;
          const sharePct =
            computedTotal > 0 ? Math.round((item.value / computedTotal) * 100) : 0;

          const RowContainer = item.onPress ? Pressable : View;

          return (
            <RowContainer
              key={item.label}
              onPress={item.onPress}
              accessibilityRole={item.onPress ? "button" : undefined}
              style={[styles.stageRow, idx > 0 && styles.stageRowDivider]}
            >
              {/* Stage Icon Medallion + Vertical Connecting Rail */}
              <View style={styles.stageRailCol}>
                <View
                  style={[
                    styles.stageIconBox,
                    { backgroundColor: palette.softBg, borderColor: palette.border },
                  ]}
                >
                  <Ionicons
                    name={item.icon ?? "analytics-outline"}
                    size={16}
                    color={palette.fg}
                  />
                </View>
                {!isLast ? <View style={styles.stageConnector} /> : null}
              </View>

              {/* Stage Info & Calibrated Bar Track */}
              <View style={styles.stageMainCol}>
                <View style={styles.stageTitleLine}>
                  <View style={styles.stageNameGroup}>
                    {item.stageCode ? (
                      <Text style={styles.stageCode}>{item.stageCode}</Text>
                    ) : null}
                    <Text numberOfLines={1} style={styles.stageLabel}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.stageMetricRight}>
                    <View
                      style={[
                        styles.stageCountPill,
                        { backgroundColor: palette.softBg, borderColor: palette.border },
                      ]}
                    >
                      <Text style={[styles.stageCountText, { color: palette.fg }]}>
                        {item.value}
                      </Text>
                    </View>
                    <Text style={styles.stageShare}>{sharePct}%</Text>
                  </View>
                </View>

                {item.subtitle ? (
                  <Text numberOfLines={1} style={styles.stageSubtitle}>
                    {item.subtitle}
                  </Text>
                ) : null}

                {/* Calibrated Architectural Track with 25/50/75% Ticks */}
                <View style={styles.calibratedTrack}>
                  <View style={[styles.trackTick, { left: "25%" }]} />
                  <View style={[styles.trackTick, { left: "50%" }]} />
                  <View style={[styles.trackTick, { left: "75%" }]} />
                  {widthPct > 0 ? (
                    <View
                      style={[
                        styles.calibratedFill,
                        { width: `${widthPct}%`, backgroundColor: palette.bar },
                      ]}
                    />
                  ) : null}
                </View>
              </View>

              {item.onPress ? (
                <Ionicons name="chevron-forward" size={15} color={COLORS.borderStrong} />
              ) : null}
            </RowContainer>
          );
        })}

        {maxVal === 0 ? (
          <View style={styles.funnelEmptyBox}>
            <Ionicons name="sparkles-outline" size={15} color={COLORS.accent} />
            <Text style={styles.funnelEmptyText}>{emptyMessage}</Text>
          </View>
        ) : null}
      </View>

      {/* Bottom Catalogue Supply Bridge */}
      {footerSummary ? (
        <View style={styles.funnelFooter}>
          <View style={styles.funnelFooterLeft}>
            <View style={styles.footerDot} />
            <Text numberOfLines={1} style={styles.funnelFooterText}>
              {footerSummary}
            </Text>
          </View>
          {footerActionLabel && onFooterAction ? (
            <Pressable onPress={onFooterAction} hitSlop={8} style={styles.funnelFooterBtn}>
              <Text style={styles.funnelFooterBtnText}>{footerActionLabel}</Text>
              <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function QuotaMeter({
  label,
  used,
  limit,
  isUnlimited,
  subtitle,
  icon = "layers-outline",
  tone = "primary",
}: {
  label: string;
  used: number;
  limit: number | null;
  isUnlimited: boolean;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: ProgressTone;
}) {
  const safeLimit = limit && limit > 0 ? limit : Math.max(used, 1);
  const pct = isUnlimited ? 100 : Math.min(100, Math.round((used / safeLimit) * 100));
  const showSlots = !isUnlimited && Boolean(limit) && (limit ?? 0) > 0 && (limit ?? 0) <= 10;
  const isAccent = tone === "accent";

  return (
    <View style={styles.quotaBox}>
      <View style={styles.quotaTopRow}>
        <View
          style={[
            styles.quotaIconWrap,
            isAccent ? styles.quotaIconAccent : styles.quotaIconPrimary,
          ]}
        >
          <Ionicons
            name={icon}
            size={15}
            color={isAccent ? "#8A5E14" : COLORS.primary}
          />
        </View>
        <View style={[styles.quotaPctChip, isAccent && styles.quotaPctAccent]}>
          <Text style={[styles.quotaPctText, isAccent && { color: "#8A5E14" }]}>
            {isUnlimited ? "∞" : `${pct}% used`}
          </Text>
        </View>
      </View>

      <Text style={styles.quotaLabel}>{label}</Text>
      <View style={styles.quotaRatioRow}>
        <Text style={styles.quotaRatioNum}>{used}</Text>
        <Text style={styles.quotaRatioDen}>
          {isUnlimited ? "active · Unlimited" : `/ ${limit ?? 0}`}
        </Text>
      </View>

      {showSlots ? (
        <View style={styles.slotRow}>
          {Array.from({ length: limit ?? 0 }).map((_, idx) => {
            const filled = idx < used;
            return (
              <View
                key={idx}
                style={[
                  styles.slotTile,
                  filled && { backgroundColor: TONE_COLOR[tone], borderColor: TONE_COLOR[tone] },
                ]}
              />
            );
          })}
        </View>
      ) : (
        <ProgressBar
          value={isUnlimited ? 100 : used}
          max={isUnlimited ? 100 : safeLimit}
          tone={isUnlimited ? "success" : tone}
          height={6}
        />
      )}

      {subtitle ? <Text style={styles.quotaSub}>{subtitle}</Text> : null}
    </View>
  );
}

const ORDER_STAGES = [
  { key: "pending_payment", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
] as const;

export function FulfillmentStepper({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <View style={styles.cancelledBanner}>
        <Ionicons name="close-circle" size={18} color={COLORS.error} />
        <Text style={styles.cancelledText}>
          Order Cancelled — Fulfillment halted under governance rules.
        </Text>
      </View>
    );
  }

  const normalized = status === "completed" ? "delivered" : status;
  const activeIdx = Math.max(
    0,
    ORDER_STAGES.findIndex((s) => s.key === normalized),
  );

  return (
    <View style={styles.stepperWrap}>
      <View style={styles.stepperRow}>
        {ORDER_STAGES.map((stage, idx) => {
          const isComplete = idx < activeIdx || (normalized === "delivered" && idx === activeIdx);
          const isCurrent = idx === activeIdx && normalized !== "delivered";
          const isLast = idx === ORDER_STAGES.length - 1;

          return (
            <React.Fragment key={stage.key}>
              <View style={styles.stepNodeCol}>
                <View
                  style={[
                    styles.stepDot,
                    isComplete && styles.stepDotDone,
                    isCurrent && styles.stepDotActive,
                  ]}
                >
                  {isComplete ? (
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  ) : isCurrent ? (
                    <View style={styles.stepInnerActive} />
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.stepLabel,
                    (isComplete || isCurrent) && styles.stepLabelActive,
                  ]}
                >
                  {stage.label}
                </Text>
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.stepLine,
                    idx < activeIdx && styles.stepLineDone,
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressWrap: { gap: 6 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.xs,
  },
  progressLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressRight: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  textDarkMuted: { color: COLORS.textOnDarkMuted },
  textDarkStrong: { color: COLORS.white },
  track: { width: "100%", backgroundColor: COLORS.stoneBeige, overflow: "hidden" },
  trackDark: { backgroundColor: COLORS.deepGreenBorder },
  fill: { minWidth: 0 },

  // Executive Commercial Funnel Card
  funnelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    overflow: "hidden",
    ...SHADOWS.elevated,
  },
  funnelHeader: {
    backgroundColor: COLORS.deepGreen,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  funnelHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  funnelEyebrow: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.3,
    color: COLORS.accent,
  },
  velocityRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  velocityLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.white,
  },
  velocityChip: {
    backgroundColor: COLORS.deepGreenElevated,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADII.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  velocityChipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.accent,
  },
  funnelTotalBox: {
    alignItems: "flex-end",
  },
  funnelTotalNum: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    lineHeight: 28,
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  funnelTotalCap: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 10,
    color: COLORS.textOnDarkMuted,
  },
  stagesBody: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  stageRowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  stageRailCol: {
    width: 34,
    alignItems: "center",
    position: "relative",
  },
  stageIconBox: {
    width: 34,
    height: 34,
    borderRadius: RADII.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stageConnector: {
    position: "absolute",
    top: 36,
    width: 1.5,
    height: 16,
    backgroundColor: COLORS.border,
  },
  stageMainCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  stageTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  stageNameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  stageCode: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: COLORS.accent,
    fontVariant: ["tabular-nums"],
  },
  stageLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  stageMetricRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stageCountPill: {
    minWidth: 26,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADII.xs,
    borderWidth: 1,
    alignItems: "center",
  },
  stageCountText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  stageShare: {
    width: 30,
    textAlign: "right",
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  stageSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  calibratedTrack: {
    height: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.stoneBeige,
    overflow: "hidden",
    position: "relative",
    marginTop: 2,
  },
  trackTick: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  calibratedFill: {
    height: 8,
    borderRadius: RADII.pill,
  },
  funnelEmptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.ivoryElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginTop: 4,
    marginBottom: SPACING.xs,
  },
  funnelEmptyText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  funnelFooter: {
    backgroundColor: COLORS.ivoryElevated,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  funnelFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.primary,
  },
  funnelFooterText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  funnelFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  funnelFooterBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.primary,
  },

  // Quota Meter
  quotaBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.ivoryElevated,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: 6,
  },
  quotaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  quotaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADII.xs + 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  quotaIconPrimary: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
  },
  quotaIconAccent: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accentBorder,
  },
  quotaPctChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.primarySoft,
  },
  quotaPctAccent: {
    backgroundColor: COLORS.accentSoft,
  },
  quotaPctText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: COLORS.primary,
    fontVariant: ["tabular-nums"],
  },
  quotaLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 2,
  },
  quotaRatioRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  quotaRatioNum: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    lineHeight: 26,
    color: COLORS.deepGreen,
    fontVariant: ["tabular-nums"],
  },
  quotaRatioDen: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  slotRow: {
    flexDirection: "row",
    gap: 4,
    marginVertical: 2,
  },
  slotTile: {
    flex: 1,
    height: 7,
    borderRadius: 3,
    backgroundColor: COLORS.stoneBeige,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  quotaSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Order Fulfillment Stepper
  stepperWrap: { paddingTop: SPACING.xs, paddingBottom: 2 },
  stepperRow: { flexDirection: "row", alignItems: "flex-start" },
  stepNodeCol: { alignItems: "center", width: 56, gap: 6 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: RADII.pill,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepDotActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  stepInnerActive: {
    width: 8,
    height: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accent,
  },
  stepLabel: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  stepLabelActive: { fontFamily: FONTS.bodySemiBold, color: COLORS.textPrimary },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginTop: 10,
    marginHorizontal: -6,
  },
  stepLineDone: { backgroundColor: COLORS.primary },
  cancelledBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.errorSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: RADII.sm,
    padding: SPACING.sm,
  },
  cancelledText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.error,
  },
});
