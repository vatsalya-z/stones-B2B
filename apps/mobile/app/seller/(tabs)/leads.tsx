import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Badge,
  Card,
  EmptyState,
  EnquiryStatusBadge,
  ErrorState,
  ListScreenSkeleton,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { fetchSellerEntitlements, fetchSellerLeads } from "../../../src/services/seller.service";
import { formatDateShort, formatUnitLabel } from "../../../src/lib/domain-meta";

const LEAD_TABS = [
  { key: "all", label: "All Leads" },
  { key: "new", label: "New" },
  { key: "direct", label: "Direct" },
  { key: "assigned", label: "Broadcast" },
  { key: "quoted", label: "Quoted" },
] as const;

export default function SellerLeadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["seller", "leads", sellerProfile?.id],
    queryFn: () => fetchSellerLeads(sellerProfile!.id),
    enabled: Boolean(sellerProfile?.id),
  });

  const entQ = useQuery({
    queryKey: ["seller", "entitlements", sellerProfile?.id],
    queryFn: () => fetchSellerEntitlements(sellerProfile!.id),
    enabled: Boolean(sellerProfile?.id),
  });

  const stats = useMemo(() => {
    const list = q.data ?? [];
    const newCount = list.filter(
      (l) => l.status === "submitted" || l.leadAssignment?.status === "assigned",
    ).length;
    const directCount = list.filter((l) => l.sourceType === "direct").length;
    const assignedCount = list.filter((l) => l.sourceType === "assigned").length;
    const quotedCount = list.filter((l) => l.status === "quoted" || l.status === "accepted").length;
    return {
      all: list.length,
      new: newCount,
      direct: directCount,
      assigned: assignedCount,
      quoted: quotedCount,
    };
  }, [q.data]);

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((l) => {
      if (tab === "new" && !(l.status === "submitted" || l.leadAssignment?.status === "assigned")) {
        return false;
      }
      if (tab === "direct" && l.sourceType !== "direct") return false;
      if (tab === "assigned" && l.sourceType !== "assigned") return false;
      if (tab === "quoted" && !(l.status === "quoted" || l.status === "accepted")) return false;
      if (term) {
        const hay = `${l.enquiry_title} ${l.delivery_location ?? ""} ${l.description ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [q.data, tab, search]);

  if (!sellerProfile) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
        <EmptyState
          icon="flash-outline"
          title="Complete Quarry Profile"
          description="Set up your seller profile to receive direct buyer enquiries and matched RFQs."
          actionLabel="Open Business Profile"
          onAction={() => router.push("/seller/storefront")}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* B2B CRM Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={TYPOGRAPHY.eyebrow}>B2B TRADE PIPELINE</Text>
            <Text style={TYPOGRAPHY.screenTitle}>Buyer Leads & RFQs</Text>
          </View>
          {entQ.data ? (
            <Pressable
              onPress={() => router.push("/seller/subscription")}
              style={styles.creditPill}
            >
              <Ionicons name="sparkles" size={13} color={COLORS.accent} />
              <Text style={styles.creditText}>
                {entQ.data.is_unlimited_leads
                  ? "∞ Credits"
                  : `${entQ.data.remaining_monthly_leads ?? 0} Credits`}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Compact CRM KPI Strip */}
        <View style={styles.crmKpiStrip}>
          {[
            { label: "Total", val: stats.all },
            { label: "Actionable", val: stats.new, highlight: true },
            { label: "Direct", val: stats.direct },
            { label: "Matched", val: stats.assigned },
          ].map((k, idx) => (
            <View key={k.label} style={[styles.crmCell, idx > 0 && styles.crmCellBorder]}>
              <Text style={[styles.crmVal, k.highlight && { color: COLORS.accent }]}>{k.val}</Text>
              <Text style={styles.crmLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filter by stone requirement or destination..."
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {LEAD_TABS.map((t) => {
            const count = stats[t.key];
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.label} ({count})
                </Text>
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
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          refreshing={q.isRefetching}
          onRefresh={() => {
            q.refetch();
            entQ.refetch();
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="flash-outline"
              title="No matching buyer leads"
              description="Verified suppliers with published stone products receive direct enquiries and matched RFQs here."
              steps={[
                "Complete your KYC verification checklist in Supplier Account",
                "Publish approved stone lots in your Stone Catalogue",
                "Receive matched buyer RFQs and issue formal quotations",
              ]}
            />
          }
          renderItem={({ item }) => {
            const isNew = item.status === "submitted" || item.leadAssignment?.status === "assigned";
            const accentColor = isNew
              ? COLORS.accent
              : item.status === "quoted" || item.status === "accepted"
                ? COLORS.secondary
                : COLORS.primary;

            return (
              <Pressable onPress={() => router.push(`/seller/leads/${item.id}`)}>
                <Card
                  variant="elevated"
                  style={[styles.card, { borderLeftWidth: 4, borderLeftColor: accentColor }]}
                >
                  <View style={styles.metaRow}>
                    <Badge
                      label={item.sourceType === "assigned" ? "Matched RFQ" : "Direct Enquiry"}
                      tone={item.sourceType === "assigned" ? "copper" : "primary"}
                      icon={
                        <Ionicons
                          name={item.sourceType === "assigned" ? "git-network-outline" : "mail-open-outline"}
                          size={11}
                          color={item.sourceType === "assigned" ? "#8A5E14" : COLORS.primary}
                        />
                      }
                    />
                    {item.leadAssignment ? (
                      <Badge label={`${item.leadAssignment.match_score}% Match`} tone="info" />
                    ) : null}
                    <View style={{ flex: 1 }} />
                    <EnquiryStatusBadge status={item.status} />
                  </View>

                  <Text numberOfLines={2} style={styles.title}>{item.enquiry_title}</Text>

                  <View style={styles.specTiles}>
                    <View style={styles.specTile}>
                      <Text style={styles.specTileLabel}>REQUIRED QTY</Text>
                      <Text style={styles.specTileVal}>
                        {item.quantity} {formatUnitLabel(item.unit)}
                      </Text>
                    </View>
                    <View style={styles.specTile}>
                      <Text style={styles.specTileLabel}>DELIVERY SITE</Text>
                      <Text numberOfLines={1} style={styles.specTileVal}>
                        {item.delivery_location || "Pan-India / TBD"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.date}>Received {formatDateShort(item.created_at)}</Text>
                    <View style={styles.ctaLink}>
                      <Text style={styles.ctaLinkText}>Review & Quote</Text>
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
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACING.sm },
  creditPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.deepGreen,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  creditText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  crmKpiStrip: {
    flexDirection: "row",
    backgroundColor: COLORS.ivoryElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingVertical: SPACING.xs,
  },
  crmCell: {
    flex: 1,
    alignItems: "center",
  },
  crmCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  crmVal: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: COLORS.deepGreen,
    fontVariant: ["tabular-nums"],
  },
  crmLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  searchBox: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  tabs: { gap: SPACING.xs, paddingVertical: 2 },
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
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 17,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  specTiles: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  specTile: {
    flex: 1,
    backgroundColor: COLORS.ivoryElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: 2,
  },
  specTileLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
  },
  specTileVal: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.deepGreen,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  date: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textSecondary },
  ctaLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  ctaLinkText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primary },
});
