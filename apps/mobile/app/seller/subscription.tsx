import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ListScreenSkeleton,
  QuotaMeter,
  ScreenHeader,
} from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { fetchSellerSubscriptionOverview } from "../../src/services/seller.service";
import { formatDateShort, formatMoneyAmount } from "../../src/lib/domain-meta";

export default function SellerSubscriptionScreen() {
  const sellerProfile = useAuthStore((s) => s.sellerProfile);

  const q = useQuery({
    queryKey: ["seller", "subscription", sellerProfile?.id],
    queryFn: () => fetchSellerSubscriptionOverview(sellerProfile!.id),
    enabled: Boolean(sellerProfile?.id),
  });

  if (!sellerProfile) {
    return (
      <View style={styles.screen}>
        <ScreenHeader overline="MEMBERSHIP & CREDITS" title="Subscription & Credits" />
        <EmptyState
          icon="ribbon-outline"
          title="Business Profile Required"
          description="Set up your seller profile to view subscription entitlements and lead usage."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        overline="BILLING GOVERNANCE"
        title="Subscription & Credits"
        subtitle="Entitlements & Monthly Usage"
      />
      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : q.isError || !q.data ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card tone="deep" variant="command" style={{ gap: 8, borderColor: COLORS.accentBorder }}>
            <View style={styles.topRow}>
              <Text style={styles.overline}>ACTIVE MEMBERSHIP TIER</Text>
              <Badge label={q.data.entitlements.status.toUpperCase()} tone="copper" />
            </View>
            <Text style={styles.planName}>{q.data.entitlements.plan_name}</Text>
            {q.data.entitlements.current_period_end ? (
              <Text style={styles.lightCap}>
                Cycle Ends: {formatDateShort(q.data.entitlements.current_period_end)}
              </Text>
            ) : (
              <Text style={styles.lightCap}>Standard Calendar Monthly Allocation Cycle</Text>
            )}
          </Card>

          <Card variant="elevated" style={{ gap: SPACING.sm }}>
            <Text style={TYPOGRAPHY.eyebrow}>LIVE ENTITLEMENT GAUGES</Text>
            <View style={styles.meterGrid}>
              <QuotaMeter
                icon="layers-outline"
                label="Active Listings"
                used={q.data.entitlements.active_listings_count}
                limit={q.data.entitlements.max_active_listings}
                isUnlimited={q.data.entitlements.is_unlimited_listings}
                subtitle={
                  q.data.entitlements.is_unlimited_listings
                    ? "Unlimited catalogue"
                    : `${q.data.entitlements.remaining_listings ?? 0} remaining`
                }
                tone="primary"
              />
              <QuotaMeter
                icon="flash-outline"
                label="Lead Credits"
                used={q.data.entitlements.used_monthly_leads}
                limit={q.data.entitlements.max_monthly_leads}
                isUnlimited={q.data.entitlements.is_unlimited_leads}
                subtitle={
                  q.data.entitlements.is_unlimited_leads
                    ? "Unlimited leads"
                    : `${q.data.entitlements.remaining_monthly_leads ?? 0} remaining`
                }
                tone="accent"
              />
            </View>
          </Card>

          <Card variant="elevated">
            <Text style={TYPOGRAPHY.eyebrow}>MEMBERSHIP TIERS</Text>
            <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs, marginTop: 2 }]}>
              Available Plans
            </Text>
            {q.data.plans.map((plan) => {
              const isCurrent = plan.code === q.data.entitlements.plan_code;
              return (
                <View
                  key={plan.id}
                  style={[styles.planRow, isCurrent && styles.planRowActive]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.topRow}>
                      <Text style={styles.planItemTitle}>{plan.name}</Text>
                      {isCurrent ? <Badge label="Active Plan" tone="primary" /> : null}
                    </View>
                    <Text style={TYPOGRAPHY.caption}>{plan.description}</Text>
                    <Text style={styles.planLimits}>
                      Listings: {plan.max_active_listings ?? "Unlimited"} · Leads/mo:{" "}
                      {plan.max_monthly_leads ?? "Unlimited"}
                    </Text>
                  </View>
                  <Text style={styles.planPrice}>
                    {plan.price_monthly === null
                      ? "Managed Desk"
                      : `${formatMoneyAmount(plan.price_monthly, plan.currency)}/mo`}
                  </Text>
                </View>
              );
            })}
            <Text style={[TYPOGRAPHY.caption, { marginTop: SPACING.sm }]}>
              Plan upgrades & promotional grants are activated by StonesDekho Trade Operations in compliance with server billing governance.
            </Text>
          </Card>

          <Card variant="elevated">
            <Text style={TYPOGRAPHY.eyebrow}>LEDGER</Text>
            <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs, marginTop: 2 }]}>
              Subscription History
            </Text>
            {q.data.events.length === 0 ? (
              <Text style={TYPOGRAPHY.caption}>No subscription billing events recorded yet.</Text>
            ) : (
              q.data.events.map((ev) => (
                <View key={ev.id} style={styles.evRow}>
                  <Text style={styles.evType}>{ev.event_type.replace(/_/g, " ").toUpperCase()}</Text>
                  <Text style={TYPOGRAPHY.caption}>
                    {formatDateShort(ev.created_at)}
                    {ev.notes ? ` · ${ev.notes}` : ""}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  overline: { fontFamily: FONTS.bodySemiBold, fontSize: 10, letterSpacing: 1.3, color: COLORS.accent },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  planName: { fontFamily: FONTS.displayBold, fontSize: 26, color: COLORS.white },
  lightCap: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.textOnDarkMuted },
  meterGrid: { flexDirection: "row", gap: SPACING.sm },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.ivoryElevated,
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  planRowActive: {
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primarySoft,
  },
  planItemTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary },
  planLimits: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.primary, marginTop: 4 },
  planPrice: { fontFamily: FONTS.bodyBold, fontSize: 12, color: "#8A5E14", fontVariant: ["tabular-nums"] },
  evRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.stoneBeige },
  evType: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.textPrimary },
});
