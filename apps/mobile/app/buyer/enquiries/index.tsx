import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Badge,
  Card,
  EmptyState,
  EnquiryStatusBadge,
  ErrorState,
  ListScreenSkeleton,
  ScreenHeader,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { fetchBuyerEnquiries } from "../../../src/services/buyer.service";
import { formatDateShort, formatUnitLabel } from "../../../src/lib/domain-meta";

export default function BuyerEnquiriesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<"all" | "direct" | "broadcast">("all");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["buyer", "enquiries", user?.id],
    queryFn: () => fetchBuyerEnquiries(user!.id),
    enabled: Boolean(user?.id),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (q.data ?? []).filter((e) => {
      if (tab === "direct" && e.isBroadcast) return false;
      if (tab === "broadcast" && !e.isBroadcast) return false;
      if (!query) return true;
      return (
        e.enquiry_title.toLowerCase().includes(query) ||
        e.sellerName.toLowerCase().includes(query) ||
        (e.delivery_location ?? "").toLowerCase().includes(query)
      );
    });
  }, [q.data, tab, search]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="My Enquiries & RFQs"
        subtitle="Track supplier responses & quotes"
        rightSlot={
          <Pressable onPress={() => router.push("/buyer/(tabs)/rfq")}>
            <Ionicons name="add-circle" size={26} color={COLORS.primary} />
          </Pressable>
        }
      />

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search enquiry, supplier, city..."
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.tabs}>
          {[
            { key: "all", label: "All Enquiries" },
            { key: "direct", label: "Direct" },
            { key: "broadcast", label: "Broadcast RFQs" },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key as typeof tab)}
              style={[styles.tab, tab === item.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
              icon="document-text-outline"
              title="No enquiries found"
              description="Submit a stone RFQ to receive competitive commercial quotations from verified quarries."
              actionLabel="Create RFQ"
              onAction={() => router.push("/buyer/(tabs)/rfq")}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/buyer/enquiries/${item.id}`)}>
              <Card style={styles.card}>
                <View style={styles.topRow}>
                  <Text numberOfLines={1} style={styles.title}>
                    {item.enquiry_title}
                  </Text>
                  <EnquiryStatusBadge status={item.status} />
                </View>
                <View style={styles.metaRow}>
                  <Badge
                    label={item.isBroadcast ? "Broadcast RFQ" : "Direct Enquiry"}
                    tone={item.isBroadcast ? "copper" : "neutral"}
                  />
                  <Text style={TYPOGRAPHY.caption}>{item.sellerName}</Text>
                </View>
                <Text style={TYPOGRAPHY.caption}>
                  Required: {item.quantity} {formatUnitLabel(item.unit)}
                  {item.delivery_location ? ` · ${item.delivery_location}` : ""}
                </Text>
                <Text style={styles.date}>Submitted {formatDateShort(item.created_at)}</Text>
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
  filterBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    minHeight: 42,
  },
  searchInput: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 14, color: COLORS.textPrimary },
  tabs: { flexDirection: "row", gap: SPACING.xs },
  tab: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.stoneBeige,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: { gap: 6 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACING.xs },
  title: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  date: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textSecondary },
});
