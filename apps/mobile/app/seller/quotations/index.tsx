import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Card,
  EmptyState,
  ErrorState,
  ListScreenSkeleton,
  QuotationStatusBadge,
  ScreenHeader,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { fetchSellerQuotations } from "../../../src/services/seller.service";
import { formatDateShort, formatMoneyAmount } from "../../../src/lib/domain-meta";

const QUOTE_TABS = [
  { key: "all", label: "All Quotes" },
  { key: "sent", label: "Sent / Viewed" },
  { key: "accepted", label: "Accepted" },
  { key: "draft", label: "Drafts" },
] as const;

export default function SellerQuotationsScreen() {
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  useSafeAreaInsets();
  const [tab, setTab] = useState("all");

  const q = useQuery({
    queryKey: ["seller", "quotations", sellerProfile?.id],
    queryFn: () => fetchSellerQuotations(sellerProfile!.id),
    enabled: Boolean(sellerProfile?.id),
  });

  const summary = useMemo(() => {
    const list = q.data ?? [];
    const acceptedVal = list
      .filter((i) => i.status === "accepted")
      .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    return {
      total: list.length,
      sent: list.filter((i) => i.status === "sent" || i.status === "viewed").length,
      accepted: list.filter((i) => i.status === "accepted").length,
      acceptedVal,
    };
  }, [q.data]);

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    switch (tab) {
      case "sent":
        return list.filter((i) => i.status === "sent" || i.status === "viewed");
      case "accepted":
        return list.filter((i) => i.status === "accepted");
      case "draft":
        return list.filter((i) => i.status === "draft");
      default:
        return list;
    }
  }, [q.data, tab]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        overline="COMMERCIAL LEDGER"
        title="Quotation History"
        subtitle="Issued & draft buyer quotations"
      />

      {!q.isLoading && !q.isError && (q.data?.length ?? 0) > 0 ? (
        <View style={styles.subHeader}>
          <View style={styles.summaryStrip}>
            <View style={styles.sumCell}>
              <Text style={styles.sumVal}>{summary.total}</Text>
              <Text style={styles.sumLabel}>Total Quotes</Text>
            </View>
            <View style={[styles.sumCell, styles.sumBorder]}>
              <Text style={styles.sumVal}>{summary.sent}</Text>
              <Text style={styles.sumLabel}>Awaiting Decision</Text>
            </View>
            <View style={[styles.sumCell, styles.sumBorder]}>
              <Text style={[styles.sumVal, { color: COLORS.success }]}>{summary.accepted}</Text>
              <Text style={styles.sumLabel}>Won</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {QUOTE_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="pricetags-outline"
              title="No quotations issued yet"
              description="Open any buyer lead and tap Create Quote to prepare itemized commercial terms."
              steps={[
                "Review material grade, volume, and destination on a lead",
                "Enter per-unit stone rate, GST, freight & validity",
                "Send formal quote directly to the buyer's inbox",
              ]}
            />
          }
          renderItem={({ item }) => (
            <Card
              variant="elevated"
              style={[
                styles.card,
                item.status === "accepted" && { borderLeftWidth: 4, borderLeftColor: COLORS.success },
              ]}
            >
              <View style={styles.top}>
                <View style={styles.numWrap}>
                  <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.num}>{item.quote_number}</Text>
                </View>
                <QuotationStatusBadge status={item.status} />
              </View>

              <Text style={styles.amt}>{formatMoneyAmount(item.total_amount, item.currency)}</Text>

              <View style={styles.metaFooter}>
                <Text style={TYPOGRAPHY.caption}>Issued {formatDateShort(item.created_at)}</Text>
                <Text style={styles.validTxt}>
                  Valid until {formatDateShort(item.valid_until)}
                </Text>
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  subHeader: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    ...SHADOWS.subtle,
  },
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: COLORS.ivoryElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingVertical: SPACING.xs,
  },
  sumCell: { flex: 1, alignItems: "center" },
  sumBorder: { borderLeftWidth: 1, borderLeftColor: COLORS.border },
  sumVal: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: COLORS.deepGreen,
    fontVariant: ["tabular-nums"],
  },
  sumLabel: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: COLORS.textSecondary },
  tabs: { gap: SPACING.xs, paddingTop: 2 },
  tab: {
    minHeight: TOUCH_TARGET_MIN - 10,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.stoneBeige,
    justifyContent: "center",
  },
  tabActive: { backgroundColor: COLORS.deepGreen },
  tabText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: { gap: SPACING.xs },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  numWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  num: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  amt: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.primary,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  metaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  validTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.textPrimary },
});
