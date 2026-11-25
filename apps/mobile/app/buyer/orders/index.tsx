import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Card,
  EmptyState,
  ErrorState,
  ListScreenSkeleton,
  OrderStatusBadge,
  PaymentStatusBadge,
  ScreenHeader,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { fetchBuyerOrders } from "../../../src/services/buyer.service";
import { formatDateShort, formatMoneyAmount } from "../../../src/lib/domain-meta";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending Payment" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default function BuyerOrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const q = useQuery({
    queryKey: ["buyer", "orders", user?.id],
    queryFn: () => fetchBuyerOrders(user!.id),
    enabled: Boolean(user?.id),
  });

  const filtered = useMemo(() => {
    if (statusFilter === "all") return q.data ?? [];
    return (q.data ?? []).filter((o) => o.status === statusFilter);
  }, [q.data, statusFilter]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My Orders" subtitle="Fulfillment & Escrow Tracking" />

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {STATUS_TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setStatusFilter(t.key)}
              style={[styles.tab, statusFilter === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, statusFilter === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
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
              title="No orders in this stage"
              description="Accept a supplier quotation to initiate a governed StonesDekho B2B stone order."
              actionLabel="View Quotations"
              onAction={() => router.push("/buyer/quotations")}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/buyer/orders/${item.id}`)}>
              <Card style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.orderNum}>{item.order_number}</Text>
                  <Text style={styles.total}>{formatMoneyAmount(item.total_amount, item.currency)}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <OrderStatusBadge status={item.status} />
                  <PaymentStatusBadge status={item.payment_status} />
                </View>
                <Text numberOfLines={1} style={TYPOGRAPHY.caption}>
                  Delivery: {item.delivery_location}
                </Text>
                <Text style={styles.date}>Placed {formatDateShort(item.created_at)}</Text>
              </Card>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabs: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, gap: SPACING.xs },
  tab: { paddingHorizontal: SPACING.sm, paddingVertical: 7, borderRadius: RADII.xs, backgroundColor: COLORS.stoneBeige },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: { gap: 6 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNum: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary },
  total: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.primary },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  date: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textSecondary },
});
