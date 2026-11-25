import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  Input,
  ProductCardSkeleton,
  SelectSheet,
} from "../../../src/components/ui";
import { CategoryCard, StoneProductCard } from "../../../src/components/stone";
import {
  fetchCatalogProducts,
  fetchCategoriesWithCounts,
  type ProductFilterOptions,
} from "../../../src/services/catalog.service";
import {
  fetchBuyerFavourites,
  toggleBuyerFavourite,
} from "../../../src/services/buyer.service";
import {
  STONE_COLOUR_SUGGESTIONS,
  STONE_FINISH_SUGGESTIONS,
  STONE_MATERIAL_SUGGESTIONS,
} from "../../../src/lib/domain-meta";
import { useAuthStore } from "../../../src/store/auth-store";

export default function BuyerExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    view?: string;
    verified?: string;
  }>();

  const [viewMode, setViewMode] = useState<"categories" | "products">(
    params.view === "categories" ? "categories" : "products",
  );
  const [search, setSearch] = useState(params.q ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(params.q ?? "");
  const [filters, setFilters] = useState<ProductFilterOptions>({
    categorySlug: params.category,
    verifiedOnly: params.verified === "true",
    sortBy: "relevant",
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (params.q !== undefined) setSearch(params.q);
    if (params.view === "categories" || params.view === "products") {
      setViewMode(params.view);
    }
    if (params.category || params.verified) {
      setFilters((prev) => ({
        ...prev,
        categorySlug: params.category || prev.categorySlug,
        verifiedOnly: params.verified === "true" ? true : prev.verifiedOnly,
      }));
    }
  }, [params.q, params.category, params.view, params.verified]);

  const categoriesQ = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategoriesWithCounts,
  });

  const activeFilters: ProductFilterOptions = {
    ...filters,
    search: debouncedSearch.trim() || undefined,
  };

  const productsQ = useQuery({
    queryKey: ["catalog", "products", activeFilters],
    queryFn: () => fetchCatalogProducts(activeFilters),
    enabled: viewMode === "products",
  });

  const favQ = useQuery({
    queryKey: ["buyer", "favourites", user?.id],
    queryFn: () => fetchBuyerFavourites(user!.id),
    enabled: Boolean(user?.id),
  });

  const favSet = new Set(favQ.data?.favouriteIds ?? []);

  const handleToggleFav = async (productId: string) => {
    if (!user?.id) return;
    await toggleBuyerFavourite(user.id, productId);
    qc.invalidateQueries({ queryKey: ["buyer", "favourites", user.id] });
  };

  const activeFilterCount = [
    filters.categorySlug,
    filters.material,
    filters.colour,
    filters.finish,
    filters.origin,
    filters.thicknessMin,
    filters.dimensionsQuery,
    filters.locationQuery,
    filters.verifiedOnly,
    filters.priceMax,
  ].filter(Boolean).length;

  return (
    <View style={styles.screen}>
      {/* Top Search & Mode Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <Text style={TYPOGRAPHY.screenTitle}>Explore Stone Exchange</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              if (viewMode === "categories" && t.trim().length > 0) {
                setViewMode("products");
              }
            }}
            placeholder="Search marble, granite, colour, quarry..."
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.modeRow}>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setViewMode("products")}
              style={[styles.segBtn, viewMode === "products" && styles.segActive]}
            >
              <Text style={[styles.segText, viewMode === "products" && styles.segTextActive]}>
                Catalogue
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode("categories")}
              style={[styles.segBtn, viewMode === "categories" && styles.segActive]}
            >
              <Text style={[styles.segText, viewMode === "categories" && styles.segTextActive]}>
                Categories
              </Text>
            </Pressable>
          </View>

          {viewMode === "products" ? (
            <View style={styles.toolBtns}>
              <Pressable
                onPress={() => setFilterOpen(true)}
                style={[styles.toolBtn, activeFilterCount > 0 && styles.toolBtnActive]}
              >
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={activeFilterCount > 0 ? COLORS.white : COLORS.textPrimary}
                />
                <Text
                  style={[
                    styles.toolBtnText,
                    activeFilterCount > 0 && { color: COLORS.white },
                  ]}
                >
                  Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSortOpen(true)} style={styles.toolBtn}>
                <Ionicons name="swap-vertical" size={16} color={COLORS.textPrimary} />
                <Text style={styles.toolBtnText}>Sort</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {viewMode === "categories" ? (
        <ScrollView contentContainerStyle={styles.gridContent}>
          <Text style={[TYPOGRAPHY.caption, { marginBottom: SPACING.sm }]}>
            Eight core architectural stone classifications sourced from verified Indian & global quarries.
          </Text>
          <View style={styles.categoryList}>
            {(categoriesQ.data ?? []).map((cat) => (
              <CategoryCard
                key={cat.slug}
                item={cat}
                onPress={() => {
                  setFilters((prev) => ({ ...prev, categorySlug: cat.slug }));
                  setViewMode("products");
                }}
              />
            ))}
          </View>
        </ScrollView>
      ) : productsQ.isLoading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </ScrollView>
      ) : productsQ.isError ? (
        <ErrorState
          message={productsQ.error instanceof Error ? productsQ.error.message : undefined}
          onRetry={() => productsQ.refetch()}
        />
      ) : (
        <FlatList
          data={productsQ.data ?? []}
          keyExtractor={(item) => item.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          refreshing={productsQ.isRefetching}
          onRefresh={() => productsQ.refetch()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            filters.categorySlug ? (
              <View style={styles.activeBanner}>
                <Text style={styles.activeBannerText}>
                  Category: {filters.categorySlug.toUpperCase()}
                </Text>
                <Pressable
                  onPress={() => setFilters((prev) => ({ ...prev, categorySlug: undefined }))}
                >
                  <Text style={styles.clearLink}>Clear</Text>
                </Pressable>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon="layers-outline"
              title="No matching stone lots"
              description="Adjust your stone material, finish, or thickness filters, or submit a direct RFQ to our quarry network."
              actionLabel="Submit Custom RFQ"
              onAction={() => router.push("/buyer/(tabs)/rfq")}
            />
          }
          renderItem={({ item }) => (
            <StoneProductCard
              item={item}
              isFavourite={favSet.has(item.id)}
              onToggleFavourite={() => handleToggleFav(item.id)}
              onPress={() => router.push(`/buyer/products/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        />
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Stone Lots"
        subtitle="Refine by architectural specification & origin"
        footer={
          <View style={styles.sheetFooter}>
            <Button
              title="Reset"
              variant="outline"
              onPress={() =>
                setFilters({ sortBy: filters.sortBy })
              }
              style={{ flex: 1 }}
            />
            <Button
              title="Apply Filters"
              onPress={() => setFilterOpen(false)}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <SelectSheet
          label="Material"
          placeholder="Any material"
          value={filters.material}
          allowClear
          options={STONE_MATERIAL_SUGGESTIONS.map((m) => ({ label: m, value: m }))}
          onSelect={(val) => setFilters((p) => ({ ...p, material: val || undefined }))}
        />
        <SelectSheet
          label="Colour"
          placeholder="Any colour"
          value={filters.colour}
          allowClear
          options={STONE_COLOUR_SUGGESTIONS.map((c) => ({ label: c, value: c }))}
          onSelect={(val) => setFilters((p) => ({ ...p, colour: val || undefined }))}
        />
        <SelectSheet
          label="Surface Finish"
          placeholder="Any finish"
          value={filters.finish}
          allowClear
          options={STONE_FINISH_SUGGESTIONS.map((f) => ({ label: f, value: f }))}
          onSelect={(val) => setFilters((p) => ({ ...p, finish: val || undefined }))}
        />
        <Input
          label="Origin (Region / Quarry)"
          placeholder="e.g. Makrana, Kishangarh, Italy"
          value={filters.origin ?? ""}
          onChangeText={(t) => setFilters((p) => ({ ...p, origin: t || undefined }))}
        />
        <Input
          label="Min Thickness (mm)"
          placeholder="e.g. 18"
          keyboardType="numeric"
          value={filters.thicknessMin ? String(filters.thicknessMin) : ""}
          onChangeText={(t) =>
            setFilters((p) => ({
              ...p,
              thicknessMin: t ? Number(t) || undefined : undefined,
            }))
          }
        />
        <Input
          label="Dimensions (Length x Width)"
          placeholder="e.g. 2400 or 600x600"
          value={filters.dimensionsQuery ?? ""}
          onChangeText={(t) => setFilters((p) => ({ ...p, dimensionsQuery: t || undefined }))}
        />
        <Input
          label="Supplier City / State"
          placeholder="e.g. Udaipur, Rajasthan"
          value={filters.locationQuery ?? ""}
          onChangeText={(t) => setFilters((p) => ({ ...p, locationQuery: t || undefined }))}
        />
        <Input
          label="Max Commercial Price (where listed)"
          placeholder="e.g. 450"
          keyboardType="numeric"
          value={filters.priceMax ? String(filters.priceMax) : ""}
          onChangeText={(t) =>
            setFilters((p) => ({
              ...p,
              priceMax: t ? Number(t) || undefined : undefined,
            }))
          }
        />
        <View style={styles.switchRow}>
          <Text style={TYPOGRAPHY.label}>Verified Suppliers Only</Text>
          <Switch
            value={Boolean(filters.verifiedOnly)}
            onValueChange={(v) => setFilters((p) => ({ ...p, verifiedOnly: v }))}
            trackColor={{ true: COLORS.primary, false: COLORS.borderStrong }}
          />
        </View>
      </BottomSheet>

      {/* Sort Bottom Sheet */}
      <BottomSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sort Listings"
      >
        {[
          { key: "relevant", label: "Most Relevant" },
          { key: "recent", label: "Recently Added" },
          { key: "price_asc", label: "Listed Price: Low to High (Comparable Lots)" },
          { key: "price_desc", label: "Listed Price: High to Low (Comparable Lots)" },
        ].map((opt) => {
          const active = (filters.sortBy ?? "relevant") === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => {
                setFilters((p) => ({
                  ...p,
                  sortBy: opt.key as ProductFilterOptions["sortBy"],
                }));
                setSortOpen(false);
              }}
              style={[styles.sortRow, active && styles.sortRowActive]}
            >
              <Text style={[styles.sortText, active && styles.sortTextActive]}>
                {opt.label}
              </Text>
              {active ? (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </BottomSheet>
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
    gap: SPACING.sm,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    minHeight: 44,
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: COLORS.stoneBeige,
    borderRadius: RADII.sm,
    padding: 3,
  },
  segBtn: {
    minHeight: 36,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.xs + 2,
    justifyContent: "center",
  },
  segActive: {
    backgroundColor: COLORS.primary,
  },
  segText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  segTextActive: {
    color: COLORS.white,
  },
  toolBtns: {
    flexDirection: "row",
    gap: 6,
  },
  toolBtn: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  toolBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toolBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  gridContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  categoryList: {
    gap: SPACING.md,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  activeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.stoneBeige,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.sm,
    marginBottom: SPACING.sm,
  },
  activeBannerText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.deepGreen,
  },
  clearLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.primary,
  },
  sheetFooter: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: TOUCH_TARGET_MIN,
    marginTop: SPACING.xs,
  },
  sortRow: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    marginBottom: 4,
  },
  sortRowActive: {
    backgroundColor: "#E6F2ED",
  },
  sortText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sortTextActive: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.primary,
  },
});
