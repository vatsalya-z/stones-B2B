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
  ErrorState,
  FulfillmentStepper,
  Input,
  ListScreenSkeleton,
  OrderStatusBadge,
  PaymentStatusBadge,
  ScreenHeader,
} from "../../../src/components/ui";
import { PaymentGovernanceBanner } from "../../../src/components/stone";
import { useAuthStore } from "../../../src/store/auth-store";
import {
  fetchSellerOrderDetail,
  transitionSellerOrder,
} from "../../../src/services/seller.service";
import {
  formatDateShort,
  formatMoneyAmount,
  formatUnitLabel,
  getAllowedSellerOrderTransitions,
} from "../../../src/lib/domain-meta";
import type { OrderStatus, PaymentStatus } from "@stone/types";

export default function SellerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const [dispatchNote, setDispatchNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["seller", "order", id],
    queryFn: () => fetchSellerOrderDetail(sellerProfile!.id, id!),
    enabled: Boolean(sellerProfile?.id && id),
  });

  if (q.isLoading || !sellerProfile) {
    return (
      <View style={styles.screen}>
        <ScreenHeader overline="SUPPLIER FULFILLMENT" title="Order Details" />
        <ListScreenSkeleton />
      </View>
    );
  }

  const data = q.data;
  if (!data) {
    return (
      <View style={styles.screen}>
        <ScreenHeader overline="SUPPLIER FULFILLMENT" title="Order Details" />
        <ErrorState onRetry={() => q.refetch()} />
      </View>
    );
  }

  const { order, items, history } = data;
  const allowed = getAllowedSellerOrderTransitions(
    order.status as OrderStatus,
    order.payment_status as PaymentStatus,
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        overline="SUPPLIER ORDER"
        title={order.order_number}
        subtitle={`Placed ${formatDateShort(order.created_at)}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Delivery Progress Stepper & Independent States */}
        <Card variant="command">
          <Text style={TYPOGRAPHY.eyebrow}>DELIVERY & FULFILLMENT TIMELINE</Text>
          <FulfillmentStepper status={order.status} />

          <View style={styles.statesRow}>
            <View style={styles.stateBox}>
              <Text style={TYPOGRAPHY.caption}>Fulfillment</Text>
              <OrderStatusBadge status={order.status} />
            </View>
            <View style={styles.stateBox}>
              <Text style={TYPOGRAPHY.caption}>Escrow Payment</Text>
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

        <PaymentGovernanceBanner role="seller" />

        {/* Commercial Invoice Breakdown */}
        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>COMMERCIAL INVOICE</Text>
          <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2, marginBottom: SPACING.xs }]}>
            Order Line Items ({items.length})
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
            <Text style={TYPOGRAPHY.cardTitle}>Order Total</Text>
            <Text style={styles.grandVal}>
              {formatMoneyAmount(order.total_amount, order.currency)}
            </Text>
          </View>
        </Card>

        {allowed.length > 0 ? (
          <Card variant="editorial">
            <Text style={TYPOGRAPHY.eyebrow}>DISPATCH ACTION</Text>
            <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2, marginBottom: SPACING.sm }]}>
              Update Fulfillment Milestone
            </Text>
            <Input
              label="Dispatch / LR / Crating Note"
              placeholder="e.g. Dispatched via Transport LR #48291, 14 wooden crates"
              value={dispatchNote}
              onChangeText={setDispatchNote}
            />
            {actionError ? (
              <View style={styles.errBox}>
                <Text style={styles.errText}>{actionError}</Text>
              </View>
            ) : null}
            {allowed.map((act) => (
              <Button
                key={act.status}
                title={act.label}
                variant="primary"
                loading={busy}
                onPress={async () => {
                  setBusy(true);
                  setActionError(null);
                  try {
                    await transitionSellerOrder(
                      order.id,
                      act.status,
                      dispatchNote,
                      order.status as OrderStatus,
                      order.payment_status as PaymentStatus,
                    );
                    setDispatchNote("");
                    qc.invalidateQueries({ queryKey: ["seller", "order", id] });
                    qc.invalidateQueries({ queryKey: ["seller", "orders", sellerProfile.id] });
                  } catch (err) {
                    setActionError(
                      err instanceof Error ? err.message : "Failed to update fulfillment status.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ))}
          </Card>
        ) : null}

        {history.length > 0 ? (
          <Card variant="elevated">
            <Text style={TYPOGRAPHY.eyebrow}>AUDIT LOG</Text>
            <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2, marginBottom: SPACING.sm }]}>
              Fulfillment History
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  statesRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  stateBox: {
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
  errBox: { backgroundColor: COLORS.errorSoft, padding: SPACING.sm, borderRadius: RADII.sm, marginBottom: SPACING.xs },
  errText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.error },
});
