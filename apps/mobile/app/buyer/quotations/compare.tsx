import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { COLORS, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Badge,
  Card,
  EmptyState,
  ListScreenSkeleton,
  QuotationStatusBadge,
  ScreenHeader,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { fetchBuyerQuotations } from "../../../src/services/buyer.service";
import { formatDateShort, formatMoneyAmount } from "../../../src/lib/domain-meta";

export default function CompareQuotationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const q = useQuery({
    queryKey: ["buyer", "quotations", user?.id],
    queryFn: () => fetchBuyerQuotations(user!.id),
    enabled: Boolean(user?.id),
  });

  const quotes = q.data ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Compare Quotations"
        subtitle="Commercial & technical comparison"
      />

      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : quotes.length === 0 ? (
        <EmptyState
          icon="git-compare-outline"
          title="No quotations to compare"
          description="Request quotations from multiple stone suppliers to compare pricing, freight, and payment terms side-by-side."
          actionLabel="Create RFQ"
          onAction={() => router.push("/buyer/(tabs)/rfq")}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.outer}>
          <Text style={[TYPOGRAPHY.caption, { marginBottom: SPACING.sm }]}>
            Swipe horizontally to compare supplier terms, unit value, freight, and validity.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.columns}>
              {quotes.map((item) => {
                const firstItem = item.items[0];
                const totalQty = item.items.reduce((s, i) => s + Number(i.quantity || 0), 0);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/buyer/quotations/${item.id}`)}
                  >
                    <Card style={styles.colCard}>
                      <View style={styles.colHeader}>
                        <Text style={styles.quoteNum}>{item.quote_number}</Text>
                        <QuotationStatusBadge status={item.status} />
                      </View>
                      <Text numberOfLines={2} style={styles.supplierName}>
                        {item.sellerName}
                      </Text>
                      {item.sellerVerified ? (
                        <Badge label="Verified Supplier" tone="primary" />
                      ) : null}

                      {[
                        ["Material / Item", firstItem?.description || item.enquiryTitle],
                        [
                          "Unit Price",
                          firstItem
                            ? formatMoneyAmount(firstItem.unit_price, item.currency)
                            : "Multiple items",
                        ],
                        ["Quantity", `${totalQty} ${firstItem?.unit?.replace(/_/g, " ") || "units"}`],
                        ["Taxes", formatMoneyAmount(item.tax_amount, item.currency)],
                        ["Shipping", formatMoneyAmount(item.shipping_charges, item.currency)],
                        ["Total Value", formatMoneyAmount(item.total_amount, item.currency)],
                        ["Validity", formatDateShort(item.valid_until)],
                        ["Terms", item.terms || "Standard commercial terms"],
                      ].map(([label, val]) => (
                        <View key={label} style={styles.metricRow}>
                          <Text style={styles.metricLabel}>{label}</Text>
                          <Text numberOfLines={2} style={styles.metricValue}>
                            {val}
                          </Text>
                        </View>
                      ))}
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  outer: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  columns: { flexDirection: "row", gap: SPACING.sm },
  colCard: { width: 262, gap: 6 },
  colHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quoteNum: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.textSecondary },
  supplierName: { fontFamily: FONTS.displaySemiBold, fontSize: 17, color: COLORS.textPrimary },
  metricRow: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  metricLabel: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: COLORS.textSecondary },
  metricValue: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textPrimary, marginTop: 2 },
});
