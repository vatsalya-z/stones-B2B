import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { COLORS, SPACING } from "../../../src/theme/tokens";
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
import { fetchBuyerQuotations } from "../../../src/services/buyer.service";
import { formatDateShort, formatMoneyAmount } from "../../../src/lib/domain-meta";

export default function BuyerQuotationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const q = useQuery({
    queryKey: ["buyer", "quotations", user?.id],
    queryFn: () => fetchBuyerQuotations(user!.id),
    enabled: Boolean(user?.id),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Received Quotations"
        subtitle="Commercial quotes from suppliers"
        rightSlot={
          (q.data ?? []).length >= 2 ? (
            <Pressable onPress={() => router.push("/buyer/quotations/compare")}>
              <Text style={styles.compareText}>Compare</Text>
            </Pressable>
          ) : null
        }
      />

      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(item) => item.id}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="pricetags-outline"
              title="No quotations received yet"
              description="Once suppliers respond to your RFQs, their commercial quotes will appear here for review and comparison."
              actionLabel="Submit RFQ"
              onAction={() => router.push("/buyer/(tabs)/rfq")}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/buyer/quotations/${item.id}`)}>
              <Card style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.quoteNum}>{item.quote_number}</Text>
                  <QuotationStatusBadge status={item.status} />
                </View>
                <Text style={TYPOGRAPHY.cardTitle}>{item.sellerName}</Text>
                <Text numberOfLines={1} style={TYPOGRAPHY.caption}>
                  {item.enquiryTitle}
                </Text>
                <View style={styles.footer}>
                  <Text style={styles.total}>{formatMoneyAmount(item.total_amount, item.currency)}</Text>
                  <Text style={TYPOGRAPHY.caption}>
                    Valid until: {formatDateShort(item.valid_until)}
                  </Text>
                </View>
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
  compareText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.primary },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: { gap: 4 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quoteNum: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textSecondary },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  total: { fontFamily: FONTS.bodyBold, fontSize: 17, color: COLORS.primary },
});
