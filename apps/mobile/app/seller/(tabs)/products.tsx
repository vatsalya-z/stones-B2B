import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import { getLocalStoneImageByMaterial } from "../../../src/theme/assets";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListScreenSkeleton,
  ModerationStatusBadge,
  ProgressBar,
  StockStatusBadge,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import {
  changeSellerProductStatus,
  fetchSellerEntitlements,
  fetchSellerProducts,
} from "../../../src/services/seller.service";
import { formatMoneyAmount, formatUnitLabel } from "../../../src/lib/domain-meta";

const STATUS_TABS = [
  { key: "all", label: "All Lots" },
  { key: "approved", label: "Published" },
  { key: "pending_review", label: "Pending" },
  { key: "draft", label: "Draft" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
] as const;

type SortMode = "recent" | "price_asc" | "price_desc" | "name";
const SORT_LABELS: Record<SortMode, string> = {
  recent: "Recent",
  price_asc: "Price ↑",
  price_desc: "Price ↓",
  name: "Name A–Z",
};
const SORT_CYCLE: SortMode[] = ["recent", "price_asc", "price_desc", "name"];

export default function SellerProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const [tab, setTab] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [actionErr, setActionErr] = useState<string | null>(null);

  const productsQ = useQuery({
    queryKey: ["seller", "products", sellerProfile?.id],
    queryFn: () => fetchSellerProducts(sellerProfile!.id),
    enabled: Boolean(sellerProfile?.id),
  });

  const entQ = useQuery({
    queryKey: ["seller", "entitlements", sellerProfile?.id],
    queryFn: () => fetchSellerEntitlements(sellerProfile!.id),
    enabled: Boolean(sellerProfile?.id),
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const item of productsQ.data ?? []) {
      counts.all = (counts.all ?? 0) + 1;
      counts[item.moderation_status] = (counts[item.moderation_status] ?? 0) + 1;
    }
    return counts;
  }, [productsQ.data]);

  const materialOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of productsQ.data ?? []) {
      if (item.material_type) set.add(item.material_type);
    }
    return ["all", ...Array.from(set)];
  }, [productsQ.data]);

  const filtered = useMemo(() => {
    const list = productsQ.data ?? [];
    const q = searchQuery.trim().toLowerCase();
    const out = list.filter((p) => {
      if (tab !== "all" && p.moderation_status !== tab) return false;
      if (materialFilter !== "all" && p.material_type !== materialFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.material_type ?? ""} ${p.colour ?? ""} ${p.finish ?? ""} ${p.stone_origin ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortMode === "price_asc") {
      return [...out].sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
    }
    if (sortMode === "price_desc") {
      return [...out].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    }
    if (sortMode === "name") {
      return [...out].sort((a, b) => a.name.localeCompare(b.name));
    }
    return out;
  }, [productsQ.data, tab, materialFilter, searchQuery, sortMode]);

  if (!sellerProfile) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
        <EmptyState
          icon="storefront-outline"
          title="Storefront Profile Required"
          description="Set up your quarry or processing business profile before listing natural stone products."
          actionLabel="Set Up Business Profile"
          onAction={() => router.push("/seller/storefront")}
        />
      </View>
    );
  }

  const cycleSort = () => {
    const nextIdx = (SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length;
    setSortMode(SORT_CYCLE[nextIdx] ?? "recent");
  };

  return (
    <View style={styles.screen}>
      {/* Editorial Catalogue Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={TYPOGRAPHY.eyebrow}>QUARRY INVENTORY</Text>
            <Text style={TYPOGRAPHY.screenTitle}>Stone Catalogue</Text>
          </View>
          <Button
            title="+ Add Lot"
            size="sm"
            onPress={() => router.push("/seller/products/new")}
          />
        </View>

        {entQ.data ? (
          <View style={styles.quotaBarCard}>
            <ProgressBar
              value={entQ.data.is_unlimited_listings ? 100 : entQ.data.active_listings_count}
              max={entQ.data.is_unlimited_listings ? 100 : Math.max(entQ.data.max_active_listings ?? 1, 1)}
              label={`${entQ.data.plan_name} Listing Quota`}
              rightLabel={
                entQ.data.is_unlimited_listings
                  ? `${entQ.data.active_listings_count} active · ∞`
                  : `${entQ.data.active_listings_count} / ${entQ.data.max_active_listings} active`
              }
              tone={entQ.data.can_create_listing ? "primary" : "warning"}
              height={5}
            />
          </View>
        ) : null}

        {/* Search & Sort Controls */}
        <View style={styles.searchSortRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search marble, colour, origin..."
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={cycleSort} style={styles.sortBtn} accessibilityRole="button">
            <Ionicons name="swap-vertical-outline" size={15} color={COLORS.deepGreen} />
            <Text style={styles.sortText}>{SORT_LABELS[sortMode]}</Text>
          </Pressable>
        </View>

        {/* Moderation Status Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {STATUS_TABS.map((t) => {
            const count = statusCounts[t.key] ?? 0;
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

        {/* Category / Material Chips */}
        {materialOptions.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matRow}>
            {materialOptions.map((mat) => {
              const active = materialFilter === mat;
              return (
                <Pressable
                  key={mat}
                  onPress={() => setMaterialFilter(mat)}
                  style={[styles.matChip, active && styles.matChipActive]}
                >
                  <Text style={[styles.matText, active && styles.matTextActive]}>
                    {mat === "all" ? "All Materials" : mat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {actionErr ? (
        <View style={styles.errBanner}>
          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errText}>{actionErr}</Text>
        </View>
      ) : null}

      {productsQ.isLoading ? (
        <ListScreenSkeleton />
      ) : productsQ.isError ? (
        <ErrorState onRetry={() => productsQ.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          refreshing={productsQ.isRefetching}
          onRefresh={() => {
            productsQ.refetch();
            entQ.refetch();
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="layers-outline"
              title={searchQuery || tab !== "all" ? "No matching stone lots" : "No stone products listed"}
              description="Publish marble, granite, sandstone, or cut-to-size slabs with quarry origin photography and B2B pricing."
              steps={[
                "Add high-resolution slab photography & quarry origin details",
                "Submit your stone lot for quick marketplace compliance review",
                "Receive direct buyer enquiries and matched project RFQs",
              ]}
              actionLabel="Add Stone Lot"
              onAction={() => router.push("/seller/products/new")}
            />
          }
          renderItem={({ item }) => {
            const fallback = getLocalStoneImageByMaterial(item.material_type);
            const specs = [
              item.colour,
              item.finish,
              item.thickness ? `${item.thickness} mm` : null,
              item.stone_origin,
            ].filter(Boolean);

            return (
              <Card padded={false} variant="elevated" style={styles.card}>
                {/* Editorial Stone Media Header */}
                <Pressable
                  onPress={() => router.push(`/seller/products/${item.id}/edit`)}
                  style={styles.mediaWrap}
                >
                  <Image
                    source={item.primaryImageUrl ? { uri: item.primaryImageUrl } : fallback}
                    placeholder={fallback}
                    contentFit="cover"
                    transition={200}
                    style={styles.heroImg}
                  />
                  <View style={styles.mediaGradient} />
                  <View style={styles.mediaTopRow}>
                    <ModerationStatusBadge status={item.moderation_status} />
                    <StockStatusBadge status={item.stock_status} />
                  </View>
                  {item.material_type ? (
                    <View style={styles.mediaBottomTag}>
                      <Text style={styles.mediaTagText}>
                        {item.material_type.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>

                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
                      {specs.length > 0 ? (
                        <Text numberOfLines={1} style={TYPOGRAPHY.caption}>
                          {specs.join(" · ")}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.priceBlock}>
                      <Text style={styles.price}>
                        {item.price_type === "on_request" || item.price === null
                          ? "Price on Request"
                          : formatMoneyAmount(item.price, item.currency)}
                      </Text>
                      {item.price_type !== "on_request" && item.price !== null ? (
                        <Text style={styles.unitCap}>per {formatUnitLabel(item.unit)}</Text>
                      ) : null}
                    </View>
                  </View>

                  {item.moderation_status === "rejected" && item.rejection_reason ? (
                    <View style={styles.rejBox}>
                      <Ionicons name="warning-outline" size={14} color={COLORS.error} />
                      <Text style={styles.rejReason}>Moderation note: {item.rejection_reason}</Text>
                    </View>
                  ) : null}

                  <View style={styles.actions}>
                    <Button
                      title="Edit Listing"
                      variant="outline"
                      size="sm"
                      onPress={() => router.push(`/seller/products/${item.id}/edit`)}
                      style={{ flex: 1 }}
                    />
                    {item.moderation_status === "draft" ? (
                      <Button
                        title="Submit Review"
                        size="sm"
                        onPress={async () => {
                          setActionErr(null);
                          try {
                            await changeSellerProductStatus(sellerProfile, item.id, "pending_review");
                            qc.invalidateQueries({ queryKey: ["seller", "products", sellerProfile.id] });
                          } catch (e) {
                            setActionErr(e instanceof Error ? e.message : "Failed.");
                          }
                        }}
                        style={{ flex: 1.2 }}
                      />
                    ) : item.moderation_status !== "archived" ? (
                      <Button
                        title="Archive"
                        variant="ghost"
                        size="sm"
                        onPress={async () => {
                          await changeSellerProductStatus(sellerProfile, item.id, "archived");
                          qc.invalidateQueries({ queryKey: ["seller", "products", sellerProfile.id] });
                          qc.invalidateQueries({ queryKey: ["seller", "entitlements", sellerProfile.id] });
                        }}
                      />
                    ) : (
                      <Badge label="Archived" tone="neutral" />
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
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
  quotaBarCard: {
    backgroundColor: COLORS.ivoryElevated,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  searchSortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  searchBox: {
    flex: 1,
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
  sortBtn: {
    minHeight: 40,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.ivoryElevated,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.deepGreen,
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
  matRow: { gap: 6, paddingTop: 2 },
  matChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.ivoryElevated,
  },
  matChipActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accentBorder,
  },
  matText: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: COLORS.textSecondary },
  matTextActive: { color: "#8A5E14", fontFamily: FONTS.bodySemiBold },
  errBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.errorSoft,
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADII.sm,
  },
  errText: { flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.error },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: { overflow: "hidden" },
  mediaWrap: {
    height: 168,
    backgroundColor: COLORS.stoneBeige,
    position: "relative",
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  mediaGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 54,
    backgroundColor: "rgba(8,48,46,0.28)",
  },
  mediaTopRow: {
    position: "absolute",
    top: SPACING.xs,
    left: SPACING.xs,
    right: SPACING.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mediaBottomTag: {
    position: "absolute",
    bottom: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: "rgba(8,48,46,0.82)",
    borderRadius: RADII.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(217,163,68,0.45)",
  },
  mediaTagText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.9,
    color: COLORS.accent,
  },
  cardBody: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  name: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 18,
    lineHeight: 23,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  price: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.primary,
    fontVariant: ["tabular-nums"],
  },
  unitCap: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  rejBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.errorSoft,
    padding: SPACING.xs,
    borderRadius: RADII.xs,
  },
  rejReason: { flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.error },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
});
