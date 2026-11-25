import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  FulfillmentStepper,
  ListScreenSkeleton,
  OrderStatusBadge,
  PaymentStatusBadge,
  ScreenHeader,
} from "../../../src/components/ui";
import { PaymentGovernanceBanner } from "../../../src/components/stone";
import { useAuthStore } from "../../../src/store/auth-store";
import {
  fetchBuyerOrderDetail,
  transitionBuyerOrder,
} from "../../../src/services/buyer.service";
import {
  formatDateShort,
  formatMoneyAmount,
  formatUnitLabel,
  getAllowedBuyerOrderTransitions,
} from "../../../src/lib/domain-meta";
import type { OrderStatus } from "@stone/types";

export default function BuyerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [pendingAction, setPendingAction] = useState<{
    status: "cancelled" | "delivered";
    label: string;
    destructive: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["buyer", "order", id],
    queryFn: () => fetchBuyerOrderDetail(user!.id, id!),
    enabled: Boolean(user?.id && id),
  });

  if (q.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader overline="BUYER ORDER TRACKER" title="Order Details" />
        <ListScreenSkeleton />
      </View>
    );
  }

  const data = q.data;
  if (!data) {
    return (
      <View style={styles.screen}>
        <ScreenHeader overline="BUYER ORDER TRACKER" title="Order Details" />
        <ErrorState title="Order not found" onRetry={() => q.refetch()} />
      </View>
    );
  }

  const { order, items, history } = data;
  const allowed = getAllowedBuyerOrderTransitions(order.status as OrderStatus);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        overline="ESCROW ORDER"
        title={order.order_number}
        subtitle={`Placed ${formatDateShort(order.created_at)}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="command">
          <Text style={TYPOGRAPHY.eyebrow}>DELIVERY & FULFILLMENT TIMELINE</Text>
          <FulfillmentStepper status={order.status} />

          <View style={styles.statesRow}>
            <View style={styles.stateCol}>
              <Text style={TYPOGRAPHY.caption}>Fulfillment Status</Text>
              <OrderStatusBadge status={order.status} />
            </View>
            <View style={styles.stateCol}>
              <Text style={TYPOGRAPHY.caption}>Payment Verification</Text>
              <PaymentStatusBadge status={order.payment_status} />
            </View>
          </View>
          <View style={styles.locStrip}>
            <Ionicons name="location-outline" size={15} color={COLORS.primary} />
            <Text style={[TYPOGRAPHY.caption, { flex: 1, color: COLORS.textPrimary }]}>
              {order.delivery_location}
            </Text>
          </View>
        </Card>

        <PaymentGovernanceBanner role="buyer" />

        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>COMMERCIAL BREAKDOWN</Text>
          <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2, marginBottom: SPACING.xs }]}>
            Order Items ({items.length})
          </Text>
          {items.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <Text style={styles.lineTitle}>{item.description}</Text>
              <View style={styles.lineMeta}>
                <Text style={TYPOGRAPHY.caption}>
                  {item.quantity} {formatUnitLabel(item.unit)} ×{" "}
                  {formatMoneyAmount(item.unit_price, order.currency)}
                </Text>
                <Text style={styles.lineVal}>
                  {formatMoneyAmount(item.total_price, order.currency)}
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={TYPOGRAPHY.cardTitle}>Total Order Value</Text>
            <Text style={styles.grandVal}>
              {formatMoneyAmount(order.total_amount, order.currency)}
            </Text>
          </View>
        </Card>

        {history.length > 0 ? (
          <Card variant="elevated">
            <Text style={TYPOGRAPHY.eyebrow}>AUDIT LOG</Text>
            <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2, marginBottom: SPACING.xs }]}>
              Order Status Audit History
            </Text>
            {history.map((h, idx) => (
              <View key={h.id} style={[styles.histRow, idx > 0 && styles.histBorder]}>
                <View style={styles.histDotCol}>
                  <View style={styles.histDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histStatus}>
                    {h.new_status.replace(/_/g, " ").toUpperCase()} · {formatDateShort(h.created_at)}
                  </Text>
                  {h.notes ? <Text style={TYPOGRAPHY.caption}>{h.notes}</Text> : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {actionError ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{actionError}</Text>
          </View>
        ) : null}

        {allowed.map((act) => (
          <Button
            key={act.status}
            title={act.label}
            variant={act.destructive ? "danger" : "primary"}
            onPress={() => {
              setActionError(null);
              setPendingAction(act);
            }}
          />
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={Boolean(pendingAction)}
        title={pendingAction?.label ?? "Confirm Order Update"}
        message="This updates fulfillment status only. Payment verification remains governed strictly by StonesDekho Payment Model B server webhooks."
        destructive={pendingAction?.destructive}
        loading={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction || !id) return;
          setBusy(true);
          setActionError(null);
          try {
            await transitionBuyerOrder(
              id,
              pendingAction.status,
              undefined,
              order.status as OrderStatus,
            );
            qc.invalidateQueries({ queryKey: ["buyer", "order", id] });
            qc.invalidateQueries({ queryKey: ["buyer", "orders", user?.id] });
          } catch (err) {
            setActionError(
              err instanceof Error ? err.message : "Failed to update order status.",
            );
          } finally {
            setBusy(false);
            setPendingAction(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  statesRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  stateCol: {
    flex: 1,
    backgroundColor: COLORS.ivoryElevated,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: 6,
  },
  locStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  lineItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.stoneBeige, gap: 4 },
  lineTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  lineMeta: { flexDirection: "row", justifyContent: "space-between" },
  lineVal: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary, fontVariant: ["tabular-nums"] },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: SPACING.sm },
  grandVal: { fontFamily: FONTS.displayBold, fontSize: 21, color: COLORS.primary, fontVariant: ["tabular-nums"] },
  histRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.xs, paddingVertical: 8 },
  histBorder: { borderTopWidth: 1, borderTopColor: COLORS.stoneBeige },
  histDotCol: { paddingTop: 5 },
  histDot: { width: 8, height: 8, borderRadius: RADII.pill, backgroundColor: COLORS.primary },
  histStatus: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.textPrimary },
  errBox: { backgroundColor: COLORS.errorSoft, padding: SPACING.sm, borderRadius: RADII.sm },
  errText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.error },
});
