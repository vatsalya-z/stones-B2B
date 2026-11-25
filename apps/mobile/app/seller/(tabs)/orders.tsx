import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
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
  OrderStatusBadge,
  PaymentStatusBadge,
  ProgressBar,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { fetchSellerOrders } from "../../../src/services/seller.service";
import { formatDateShort, formatMoneyAmount } from "../../../src/lib/domain-meta";

const ORDER_TABS = [
  { key: "all", label: "All Orders" },
  { key: "active", label: "In Progress" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Completed" },
] as const;

const STAGE_PROGRESS: Record<string, number> = {
  pending_payment: 20,
  confirmed: 45,
  processing: 65,
  dispatched: 85,
  delivered: 100,
  completed: 100,
  cancelled: 0,
};

export default function SellerOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const [tab, setTab] = useState("all");

  const q = useQuery({
    queryKey: ["seller", "orders", sellerProfile?.id],
    queryFn: () => fetchSellerOrders(sellerProfile!.id),
    enabled: Boolean(sellerProfile?.id),
  });

  const stats = useMemo(() => {
    const list = q.data ?? [];
    return {
      total: list.length,
      active: list.filter((o) =>
        ["pending_payment", "confirmed", "processing"].includes(o.status),
      ).length,
      dispatched: list.filter((o) => o.status === "dispatched").length,
      delivered: list.filter((o) => o.status === "delivered" || o.status === "completed").length,
    };
  }, [q.data]);

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    switch (tab) {
      case "active":
        return list.filter((o) =>
          ["pending_payment", "confirmed", "processing"].includes(o.status),
        );
      case "dispatched":
        return list.filter((o) => o.status === "dispatched");
      case "delivered":
        return list.filter((o) => o.status === "delivered" || o.status === "completed");
      default:
        return list;
    }
  }, [q.data, tab]);

  if (!sellerProfile) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
        <EmptyState
          icon="cube-outline"
          title="Storefront Profile Required"
          description="Accepted buyer quotations convert to governed orders in your fulfillment queue."
          actionLabel="Set Up Business Profile"
          onAction={() => router.push("/seller/storefront")}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <Text style={TYPOGRAPHY.eyebrow}>ESCROW-GOVERNED LOGISTICS</Text>
        <Text style={TYPOGRAPHY.screenTitle}>Supplier Orders</Text>
        <Text style={TYPOGRAPHY.caption}>
          Track fulfillment milestones independently from server-verified payment status.
        </Text>

        <View style={styles.summaryStrip}>
          {[
            { label: "Total", val: stats.total },
            { label: "Active", val: stats.active },
            { label: "Dispatched", val: stats.dispatched },
            { label: "Delivered", val: stats.delivered },
          ].map((c, idx) => (
            <View key={c.label} style={[styles.sumCell, idx > 0 && styles.sumBorder]}>
              <Text style={styles.sumVal}>{c.val}</Text>
              <Text style={styles.sumLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {ORDER_TABS.map((t) => {
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

      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="No supplier orders in this stage"
              description="When a buyer accepts your quotation, the escrow-governed order appears here for dispatch and fulfillment."
              steps={[
                "Issue a commercial quotation from any buyer lead",
                "Wait for buyer acceptance & Payment Model B escrow verification",
                "Confirm dispatch milestones and update LR crating notes",
              ]}
            />
          }
          renderItem={({ item }) => {
            const pct = STAGE_PROGRESS[item.status] ?? 20;
            return (
              <Pressable onPress={() => router.push(`/seller/orders/${item.id}`)}>
                <Card variant="elevated" style={styles.card}>
                  <View style={styles.topRow}>
                    <View>
                      <Text style={TYPOGRAPHY.eyebrow}>ORDER NUMBER</Text>
                      <Text style={styles.orderNum}>{item.order_number}</Text>
                    </View>
                    <Text style={styles.total}>
                      {formatMoneyAmount(item.total_amount, item.currency)}
                    </Text>
                  </View>

                  <View style={styles.badges}>
                    <OrderStatusBadge status={item.status} />
                    <PaymentStatusBadge status={item.payment_status} />
                  </View>

                  {item.status !== "cancelled" ? (
                    <ProgressBar
                      value={pct}
                      max={100}
                      label="Fulfillment Progress"
                      rightLabel={`${pct}%`}
                      tone={pct === 100 ? "success" : "primary"}
                      height={5}
                    />
                  ) : null}

                  <View style={styles.locRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                    <Text numberOfLines={1} style={[TYPOGRAPHY.caption, { flex: 1 }]}>
                      {item.delivery_location}
                    </Text>
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={styles.date}>Placed {formatDateShort(item.created_at)}</Text>
                    <View style={styles.linkRow}>
                      <Text style={styles.linkTxt}>Manage Fulfillment</Text>
                      <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
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
    marginTop: 2,
  },
  sumCell: { flex: 1, alignItems: "center" },
  sumBorder: { borderLeftWidth: 1, borderLeftColor: COLORS.border },
  sumVal: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
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
  card: { gap: SPACING.sm },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderNum: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary, marginTop: 2 },
  total: {
    fontFamily: FONTS.displayBold,
    fontSize: 19,
    color: COLORS.primary,
    fontVariant: ["tabular-nums"],
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  date: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textSecondary },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primary },
});
