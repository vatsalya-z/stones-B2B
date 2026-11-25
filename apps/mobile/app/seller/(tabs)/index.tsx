import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Badge,
  Button,
  Card,
  DashboardSkeleton,
  ErrorState,
  PipelineBarChart,
  QuotaMeter,
  SectionHeader,
  VerificationStatusBadge,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { canAccessWorkspace } from "../../../src/lib/role-utils";
import { fetchSellerDashboardData } from "../../../src/services/seller.service";
import { BUSINESS_TYPE_LABELS, formatDateShort } from "../../../src/lib/domain-meta";

export default function SellerDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const roles = useAuthStore((s) => s.roles);
  const switchWorkspace = useAuthStore((s) => s.switchWorkspace);
  const canSwitchToBuyer = canAccessWorkspace(roles, "buyer");

  const q = useQuery({
    queryKey: ["seller", "dashboard", user?.id],
    queryFn: () => fetchSellerDashboardData(user!.id),
    enabled: Boolean(user?.id),
  });

  if (q.isLoading) {
    return (
      <View style={styles.screen}>
        {insets.top > 0 ? (
          <View style={[styles.statusBarShield, { height: insets.top }]} />
        ) : null}
        <View style={{ flex: 1, paddingTop: insets.top > 0 ? 12 : 16 }}>
          <DashboardSkeleton />
        </View>
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View style={styles.screen}>
        {insets.top > 0 ? (
          <View style={[styles.statusBarShield, { height: insets.top }]} />
        ) : null}
        <ErrorState onRetry={() => q.refetch()} />
      </View>
    );
  }

  const { seller, entitlements, readiness, metrics, recentActivity } = q.data;
  const completedChecks = readiness.checks.filter((c) => c.complete).length;
  const totalChecks = readiness.checks.length || 1;
  const readinessPct = Math.round((completedChecks / totalChecks) * 100);
  const firstPendingCheck = readiness.checks.find((c) => !c.complete);
  const shortCheckLabels = ["Identity", "Contact", "GSTIN", "Address", "KYC Doc"];
  const pipelineConversionPct =
    metrics.totalEnquiries > 0
      ? Math.min(
          100,
          Math.round(((metrics.pendingQuotes + metrics.activeOrders) / metrics.totalEnquiries) * 100),
        )
      : 0;
  const displayName = seller?.business_name || profile?.full_name || "Complete Quarry Setup";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const locationLine = seller
    ? [
        BUSINESS_TYPE_LABELS[seller.business_type] ?? seller.business_type,
        [seller.city, seller.state].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · ")
    : "Quarry & Stone Processor Workspace";

  return (
    <View style={styles.screen}>
      {insets.top > 0 ? (
        <View style={[styles.statusBarShield, { height: insets.top }]} />
      ) : null}
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        refreshControl={
          <RefreshControl refreshing={q.isRefetching} onRefresh={() => { void q.refetch(); }} />
        }
      >
        {/* Executive Deep Teal-Green Architectural Header */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 14 : 20 }]}>
        <View style={styles.headerTop}>
          <View style={styles.monogram}>
            <Text style={styles.monogramText}>{initials || "SD"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>QUARRY & SUPPLIER PORTAL</Text>
            <Text numberOfLines={1} style={styles.bizName}>
              {displayName}
            </Text>
            <Text numberOfLines={1} style={styles.bizSub}>
              {locationLine}
            </Text>
          </View>
          <View style={styles.headerBtns}>
            <Pressable
              onPress={() => router.push("/seller/messages")}
              style={styles.iconBtn}
              accessibilityLabel="Seller Messages"
            >
              <Ionicons name="chatbubbles-outline" size={19} color={COLORS.white} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/seller/notifications")}
              style={styles.iconBtn}
              accessibilityLabel="Seller Notifications"
            >
              <Ionicons name="notifications-outline" size={19} color={COLORS.white} />
            </Pressable>
          </View>
        </View>

        {/* Embedded Status Deck */}
        <View style={styles.statusDeck}>
          <View style={styles.statusLeft}>
            <VerificationStatusBadge status={seller?.verification_status || "draft"} />
            <Badge label={`${entitlements.plan_name} Tier`} tone="copper" />
          </View>
          {canSwitchToBuyer ? (
            <Pressable
              onPress={async () => {
                const ok = await switchWorkspace("buyer");
                if (ok) router.replace("/buyer/(tabs)");
              }}
              style={styles.switchPill}
              accessibilityRole="button"
              accessibilityLabel="Switch to Buyer Mode"
            >
              <Ionicons name="swap-horizontal" size={13} color={COLORS.accent} />
              <Text style={styles.switchPillText}>Buyer Mode</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Overlapping Trade Command Hero Card */}
      <View style={styles.commandWrap}>
        <Card variant="command" padded={false} style={styles.commandCard}>
          <View style={styles.heroKpiRow}>
            <Pressable
              onPress={() => router.push("/seller/(tabs)/leads")}
              style={styles.heroKpiCell}
            >
              <View style={styles.heroKpiTop}>
                <Text style={TYPOGRAPHY.eyebrow}>PRIORITY INBOX</Text>
                <Ionicons name="flash-outline" size={15} color={COLORS.accent} />
              </View>
              <Text style={TYPOGRAPHY.metricHero}>{metrics.newLeads}</Text>
              <Text style={TYPOGRAPHY.caption}>New Buyer Leads</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            <Pressable
              onPress={() => router.push("/seller/(tabs)/orders")}
              style={styles.heroKpiCell}
            >
              <View style={styles.heroKpiTop}>
                <Text style={TYPOGRAPHY.eyebrow}>FULFILLMENT</Text>
                <Ionicons name="cube-outline" size={15} color={COLORS.primary} />
              </View>
              <Text style={TYPOGRAPHY.metricHero}>{metrics.activeOrders}</Text>
              <Text style={TYPOGRAPHY.caption}>Active Orders</Text>
            </Pressable>
          </View>

          <View style={styles.secondaryStrip}>
            {[
              { label: "Enquiries", val: metrics.totalEnquiries, route: "/seller/(tabs)/leads" },
              { label: "Quotes", val: metrics.pendingQuotes, route: "/seller/quotations" },
              { label: "Listings", val: metrics.totalProducts, route: "/seller/(tabs)/products" },
              { label: "Published", val: metrics.publishedProducts, route: "/seller/(tabs)/products" },
            ].map((item, idx) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route as never)}
                style={[styles.secCell, idx > 0 && styles.secCellBorder]}
              >
                <Text style={styles.secVal}>{item.val}</Text>
                <Text style={styles.secLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.body}>
        {/* Onboarding or Verification Progress Panel */}
        {!seller ? (
          <Card tone="ivory" variant="editorial" style={styles.verifyCard}>
            <Text style={TYPOGRAPHY.eyebrow}>STOREFRONT SETUP</Text>
            <Text style={[TYPOGRAPHY.sectionTitle, { marginTop: 2 }]}>
              Set Up Your Quarry & Stone Business
            </Text>
            <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>
              Add company details, GSTIN, and processing capabilities to publish stone lots and unlock broadcast buyer RFQs.
            </Text>
            <Button
              title="Complete Business Profile"
              onPress={() => router.push("/seller/storefront")}
              style={{ marginTop: SPACING.sm }}
            />
          </Card>
        ) : seller.verification_status !== "verified" ? (
          <Card tone="ivory" variant="editorial" style={styles.verifyCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.eyebrow}>SUPPLIER VERIFICATION</Text>
                <Text style={TYPOGRAPHY.cardTitle}>KYC & Quarry Readiness</Text>
              </View>
              <Badge label={`${completedChecks}/${totalChecks} · ${readinessPct}%`} tone="copper" />
            </View>

            {/* 5-Segment Architectural Milestone Bar */}
            <View style={styles.milestoneTrack}>
              {readiness.checks.map((check, idx) => {
                const isNext = !check.complete && readiness.checks.findIndex((c) => !c.complete) === idx;
                return (
                  <View
                    key={check.label}
                    style={[
                      styles.milestoneSeg,
                      check.complete && styles.milestoneSegDone,
                      isNext && styles.milestoneSegNext,
                    ]}
                  />
                );
              })}
            </View>

            {/* Compact Scannable Milestone Pills */}
            <View style={styles.checkPillsWrap}>
              {readiness.checks.map((check, idx) => (
                <View
                  key={check.label}
                  style={[styles.checkPill, check.complete && styles.checkPillDone]}
                >
                  <Ionicons
                    name={check.complete ? "checkmark-circle" : "ellipse-outline"}
                    size={12}
                    color={check.complete ? COLORS.success : COLORS.textSecondary}
                  />
                  <Text
                    style={[styles.checkPillText, check.complete && styles.checkPillTextDone]}
                  >
                    {shortCheckLabels[idx] ?? check.label}
                  </Text>
                </View>
              ))}
            </View>

            {firstPendingCheck ? (
              <View style={styles.nextStepRow}>
                <View style={styles.nextStepBadge}>
                  <Text style={styles.nextStepLabel}>NEXT</Text>
                </View>
                <Text style={styles.nextStepText}>{firstPendingCheck.label}</Text>
              </View>
            ) : null}

            <Button
              title="Open Verification & KYC"
              variant="copper"
              size="sm"
              onPress={() => router.push("/seller/verification")}
              style={{ marginTop: SPACING.xs, alignSelf: "flex-start" }}
            />
          </Card>
        ) : null}

        {/* Enquiry & Commercial Pipeline Funnel */}
        <View>
          <SectionHeader
            overline="COMMERCIAL ANALYTICS"
            title="Enquiry & Fulfillment Pipeline"
            subtitle="Live conversion funnel from buyer interest to order fulfillment"
            actionLabel="All Leads"
            onActionPress={() => router.push("/seller/(tabs)/leads")}
          />
          <PipelineBarChart
            conversionLabel="Quote & Order Rate"
            conversionValue={
              metrics.totalEnquiries > 0 ? `${pipelineConversionPct}% active` : "Ready for RFQ"
            }
            totalVolume={
              metrics.totalEnquiries + metrics.newLeads + metrics.pendingQuotes + metrics.activeOrders
            }
            footerSummary={`${metrics.publishedProducts} published stone lot(s) live in marketplace`}
            footerActionLabel="Manage Lots"
            onFooterAction={() => router.push("/seller/(tabs)/products")}
            items={[
              {
                stageCode: "01",
                label: "Enquiries Received",
                subtitle: "Direct buyer & matched RFQs",
                value: metrics.totalEnquiries,
                icon: "mail-open-outline",
                tone: "primary",
                onPress: () => router.push("/seller/(tabs)/leads"),
              },
              {
                stageCode: "02",
                label: "Actionable New Leads",
                subtitle: "Awaiting supplier quotation",
                value: metrics.newLeads,
                icon: "flash-outline",
                tone: "accent",
                onPress: () => router.push("/seller/(tabs)/leads"),
              },
              {
                stageCode: "03",
                label: "Quotations Issued",
                subtitle: "Sent & under buyer review",
                value: metrics.pendingQuotes,
                icon: "pricetags-outline",
                tone: "secondary",
                onPress: () => router.push("/seller/quotations"),
              },
              {
                stageCode: "04",
                label: "Active Escrow Orders",
                subtitle: "Confirmed & in dispatch queue",
                value: metrics.activeOrders,
                icon: "cube-outline",
                tone: "deepGreen",
                onPress: () => router.push("/seller/(tabs)/orders"),
              },
            ]}
          />
        </View>

        {/* Subscription & Lead Credit Panel */}
        <View>
          <SectionHeader
            overline="ENTITLEMENTS & QUOTA"
            title={`${entitlements.plan_name} Membership`}
            actionLabel="Details"
            onActionPress={() => router.push("/seller/subscription")}
          />
          <Card variant="elevated" padded={false} style={styles.quotaShell}>
            <View style={styles.quotaShellTop}>
              <View style={styles.quotaPlanLeft}>
                <Ionicons name="ribbon-outline" size={16} color={COLORS.accent} />
                <Text style={styles.quotaPlanTitle}>
                  {entitlements.plan_name} Plan · Monthly Allocation
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/seller/subscription")}
                hitSlop={8}
                style={styles.quotaManageBtn}
              >
                <Text style={styles.quotaManageText}>View Plans →</Text>
              </Pressable>
            </View>
            <View style={styles.meterGrid}>
              <QuotaMeter
                icon="layers-outline"
                label="Active Listings"
                used={entitlements.active_listings_count}
                limit={entitlements.max_active_listings}
                isUnlimited={entitlements.is_unlimited_listings}
                subtitle={
                  entitlements.is_unlimited_listings
                    ? "Unlimited active lots"
                    : `${entitlements.remaining_listings ?? 0} slot(s) left`
                }
                tone="primary"
              />
              <QuotaMeter
                icon="flash-outline"
                label="Monthly Leads"
                used={entitlements.used_monthly_leads}
                limit={entitlements.max_monthly_leads}
                isUnlimited={entitlements.is_unlimited_leads}
                subtitle={
                  entitlements.is_unlimited_leads
                    ? "Unlimited lead access"
                    : `${entitlements.remaining_monthly_leads ?? 0} credit(s) left`
                }
                tone="accent"
              />
            </View>
          </Card>
        </View>

        {/* 2x2 Quick Operations Grid */}
        <View>
          <SectionHeader overline="QUICK OPERATIONS" title="Command Shortcuts" />
          <View style={styles.opsGrid}>
            {(
              [
                [
                  {
                    label: "Add Stone Lot",
                    sub: "Publish slab or block",
                    icon: "add-circle-outline",
                    route: "/seller/products/new",
                    primary: true,
                  },
                  {
                    label: "Buyer Leads",
                    sub: `${metrics.newLeads} awaiting review`,
                    icon: "flash-outline",
                    route: "/seller/(tabs)/leads",
                  },
                ],
                [
                  {
                    label: "Quotations",
                    sub: `${metrics.pendingQuotes} active quotes`,
                    icon: "pricetags-outline",
                    route: "/seller/quotations",
                  },
                  {
                    label: "Storefront",
                    sub: "Quarry & GST profile",
                    icon: "storefront-outline",
                    route: "/seller/storefront",
                  },
                ],
              ] as Array<
                Array<{
                  label: string;
                  sub: string;
                  icon: keyof typeof Ionicons.glyphMap;
                  route: string;
                  primary?: boolean;
                }>
              >
            ).map((row, rIdx) => (
              <View key={rIdx} style={styles.opsRow}>
                {row.map((op) => (
                  <Pressable
                    key={op.label}
                    onPress={() => router.push(op.route as never)}
                    style={[styles.opTile, op.primary && styles.opTilePrimary]}
                  >
                    <View style={[styles.opIconWrap, op.primary && styles.opIconPrimary]}>
                      <Ionicons
                        name={op.icon}
                        size={20}
                        color={op.primary ? COLORS.white : COLORS.primary}
                      />
                    </View>
                    <Text style={[styles.opTitle, op.primary && styles.opTitlePrimary]}>
                      {op.label}
                    </Text>
                    <Text numberOfLines={1} style={[styles.opSub, op.primary && styles.opSubPrimary]}>
                      {op.sub}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity Timeline */}
        <View>
          <SectionHeader overline="LIVE AUDIT TRAIL" title="Recent Activity" />
          {recentActivity.length === 0 ? (
            <Card variant="elevated" style={styles.emptyActivityCard}>
              <View style={styles.emptyActRow}>
                <View style={styles.emptyActIcon}>
                  <Ionicons name="pulse-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.liveTagRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveTagText}>TRADE FEED STANDBY</Text>
                  </View>
                  <Text style={TYPOGRAPHY.cardTitle}>No recent trade events</Text>
                  <Text style={[TYPOGRAPHY.caption, { marginTop: 2 }]}>
                    Enquiries, issued quotations, and accepted orders appear here in real time.
                  </Text>
                </View>
              </View>
              <View style={styles.emptyActLinks}>
                <Pressable
                  onPress={() => router.push("/seller/products/new")}
                  style={styles.emptyActChip}
                >
                  <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.emptyActChipText}>Publish First Lot</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/seller/verification")}
                  style={styles.emptyActChip}
                >
                  <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.deepGreen} />
                  <Text style={styles.emptyActChipText}>Complete KYC</Text>
                </Pressable>
              </View>
            </Card>
          ) : (
            <Card padded={false}>
              {recentActivity.map((act, idx) => {
                const isLast = idx === recentActivity.length - 1;
                const dotColor = act.id.startsWith("ord")
                  ? COLORS.success
                  : act.id.startsWith("quo")
                    ? COLORS.accent
                    : COLORS.primary;

                return (
                  <View
                    key={act.id}
                    style={[styles.timelineRow, idx > 0 && styles.actBorder]}
                  >
                    <View style={styles.railCol}>
                      <View style={[styles.railDot, { backgroundColor: dotColor }]} />
                      {!isLast ? <View style={styles.railLine} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.actTitle}>{act.title}</Text>
                      <Text style={TYPOGRAPHY.caption}>{act.subtitle}</Text>
                    </View>
                    <Text style={styles.actDate}>{formatDateShort(act.createdAt)}</Text>
                  </View>
                );
              })}
            </Card>
          )}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  statusBarShield: { backgroundColor: COLORS.deepGreen },
  header: {
    backgroundColor: COLORS.deepGreen,
    paddingHorizontal: SPACING.md,
    paddingBottom: 34,
    gap: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  headerTop: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  monogram: {
    width: 46,
    height: 46,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.deepGreenElevated,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  monogramText: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.accent,
  },
  overline: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: COLORS.accent,
  },
  bizName: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    lineHeight: 27,
    color: COLORS.white,
    marginTop: 2,
  },
  bizSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textOnDarkMuted,
    marginTop: 2,
  },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  iconBtn: {
    width: TOUCH_TARGET_MIN - 2,
    height: TOUCH_TARGET_MIN - 2,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.deepGreenElevated,
    borderWidth: 1,
    borderColor: COLORS.deepGreenBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDeck: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.deepGreenElevated,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.deepGreenBorder,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 },
  switchPill: {
    minHeight: 30,
    paddingHorizontal: SPACING.xs + 2,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(217,163,68,0.16)",
    borderWidth: 1,
    borderColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  switchPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.accent,
  },
  commandWrap: {
    paddingHorizontal: SPACING.md,
    marginTop: -22,
  },
  commandCard: {
    overflow: "hidden",
  },
  heroKpiRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  heroKpiCell: {
    flex: 1,
    padding: SPACING.md,
    gap: 4,
  },
  heroKpiTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verticalDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  secondaryStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.ivoryElevated,
  },
  secCell: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    gap: 2,
  },
  secCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  secVal: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.deepGreen,
    fontVariant: ["tabular-nums"],
  },
  secLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  body: { padding: SPACING.md, gap: SPACING.lg },
  verifyCard: { borderColor: COLORS.accentBorder, gap: SPACING.sm },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.xs,
  },
  milestoneTrack: {
    flexDirection: "row",
    gap: 5,
    marginTop: 2,
  },
  milestoneSeg: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.stoneBeige,
  },
  milestoneSegDone: {
    backgroundColor: COLORS.primary,
  },
  milestoneSegNext: {
    backgroundColor: COLORS.accent,
  },
  checkPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  checkPill: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkPillDone: {
    backgroundColor: COLORS.successSoft,
    borderColor: "#B8E5C6",
  },
  checkPillText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
    flexShrink: 1,
    color: COLORS.textSecondary,
  },
  checkPillTextDone: {
    color: "#15803D",
  },
  nextStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
  },
  nextStepBadge: {
    backgroundColor: COLORS.deepGreen,
    borderRadius: RADII.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nextStepLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: COLORS.accent,
  },
  nextStepText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.deepGreen,
  },
  quotaShell: {
    overflow: "hidden",
  },
  quotaShellTop: {
    backgroundColor: COLORS.deepGreen,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.accent,
  },
  quotaPlanLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  quotaPlanTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.white,
    flexShrink: 1,
  },
  quotaManageBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  quotaManageText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.accent,
  },
  meterGrid: { flexDirection: "row", gap: SPACING.sm, padding: SPACING.md },
  opsGrid: {
    gap: SPACING.sm,
  },
  opsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  opTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 4,
    ...SHADOWS.card,
  },
  opTilePrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  opIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  opIconPrimary: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  opTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  opTitlePrimary: {
    color: COLORS.white,
  },
  opSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  opSubPrimary: {
    color: "#D8EDE5",
  },
  emptyActivityCard: {
    gap: SPACING.sm,
  },
  emptyActRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyActIcon: {
    width: 42,
    height: 42,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  liveTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.primary,
  },
  liveTagText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.primary,
  },
  emptyActLinks: {
    flexDirection: "row",
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  emptyActChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.ivoryElevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  emptyActChipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.deepGreen,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  actBorder: { borderTopWidth: 1, borderTopColor: COLORS.stoneBeige },
  railCol: {
    width: 14,
    alignItems: "center",
    paddingTop: 5,
  },
  railDot: {
    width: 9,
    height: 9,
    borderRadius: RADII.pill,
  },
  railLine: {
    width: 2,
    height: 22,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  actTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textPrimary },
  actDate: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textSecondary },
});
