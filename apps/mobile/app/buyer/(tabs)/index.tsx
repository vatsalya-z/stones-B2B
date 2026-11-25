import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  ARCHITECTURAL_APPLICATIONS,
  STONE_ASSETS,
} from "../../../src/theme/assets";
import {
  Badge,
  Button,
  Card,
  EnquiryStatusBadge,
  QuotationStatusBadge,
  SectionHeader,
  SkeletonBox,
} from "../../../src/components/ui";
import {
  CategoryCard,
  StoneProductCard,
  SupplierCard,
} from "../../../src/components/stone";
import { useAuthStore } from "../../../src/store/auth-store";
import { canAccessWorkspace } from "../../../src/lib/role-utils";
import {
  fetchCatalogProducts,
  fetchCategoriesWithCounts,
  fetchProductsByIds,
  fetchVerifiedSuppliers,
} from "../../../src/services/catalog.service";
import {
  fetchBuyerDashboardSummary,
  fetchBuyerFavourites,
  toggleBuyerFavourite,
} from "../../../src/services/buyer.service";
import { getRecentlyViewedIds } from "../../../src/lib/recently-viewed";
import { formatMoneyAmount } from "../../../src/lib/domain-meta";

const QUICK_SOURCING_CHIPS = [
  "Statuario Marble",
  "Black Granite",
  "Agra Red Sandstone",
  "Kota Limestone",
  "Honed Travertine",
  "Backlit Onyx",
] as const;

export default function BuyerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const roles = useAuthStore((s) => s.roles);
  const switchWorkspace = useAuthStore((s) => s.switchWorkspace);
  const canSwitchToSeller = canAccessWorkspace(roles, "seller");
  const [searchText, setSearchText] = useState("");

  const categoriesQ = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategoriesWithCounts,
  });

  const featuredQ = useQuery({
    queryKey: ["catalog", "featured"],
    queryFn: () => fetchCatalogProducts({ limit: 8 }),
  });

  const suppliersQ = useQuery({
    queryKey: ["catalog", "suppliers"],
    queryFn: () => fetchVerifiedSuppliers(8),
  });

  const dashboardQ = useQuery({
    queryKey: ["buyer", "dashboard", user?.id],
    queryFn: () => fetchBuyerDashboardSummary(user!.id),
    enabled: Boolean(user?.id),
  });

  const favQ = useQuery({
    queryKey: ["buyer", "favourites", user?.id],
    queryFn: () => fetchBuyerFavourites(user!.id),
    enabled: Boolean(user?.id),
  });

  const recentQ = useQuery({
    queryKey: ["buyer", "recently-viewed"],
    queryFn: async () => {
      const ids = await getRecentlyViewedIds();
      return fetchProductsByIds(ids);
    },
  });

  const refreshing =
    categoriesQ.isRefetching || featuredQ.isRefetching || dashboardQ.isRefetching;

  const onRefresh = async () => {
    await Promise.all([
      categoriesQ.refetch(),
      featuredQ.refetch(),
      suppliersQ.refetch(),
      dashboardQ.refetch(),
      recentQ.refetch(),
    ]);
  };

  const firstName = profile?.full_name?.trim().split(" ")[0] || "Partner";
  const favSet = new Set(favQ.data?.favouriteIds ?? []);

  const handleSearch = (q?: string) => {
    const query = (q ?? searchText).trim();
    router.push({
      pathname: "/buyer/(tabs)/explore",
      params: { q: query, view: "products" },
    });
  };

  const handleToggleFav = async (productId: string) => {
    if (!user?.id) return;
    await toggleBuyerFavourite(user.id, productId);
    qc.invalidateQueries({ queryKey: ["buyer", "favourites", user.id] });
  };

  return (
    <View style={styles.screen}>
      {insets.top > 0 ? (
        <View style={[styles.statusBarShield, { height: insets.top }]} />
      ) : null}
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Editorial Deep Green Greeting Header */}
        <View style={[styles.heroBanner, { paddingTop: insets.top > 0 ? 14 : 20 }]}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextWrap}>
            <Text style={styles.overlineLight}>BUYER SOURCING MARKETPLACE</Text>
            <Text style={styles.greetingTitle}>Good day, {firstName}</Text>
            <Text style={styles.greetingSub}>
              Source directly from verified Indian quarries & stone processors.
            </Text>
          </View>
          <View style={styles.headerActions}>
            {canSwitchToSeller ? (
              <Pressable
                onPress={async () => {
                  const ok = await switchWorkspace("seller");
                  if (ok) router.replace("/seller/(tabs)");
                }}
                style={styles.switchPill}
                accessibilityRole="button"
                accessibilityLabel="Switch to Seller Portal"
              >
                <Text style={styles.switchPillText}>Seller Portal ↗</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push("/buyer/notifications")}
              style={styles.notifBtn}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            </Pressable>
          </View>
        </View>

        {/* Search Stones & Suppliers */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={19} color={COLORS.textSecondary} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            placeholder="Search material, colour, variety, or supplier..."
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
          />
          <Pressable
            onPress={() => handleSearch()}
            style={styles.searchGoBtn}
            accessibilityLabel="Run search"
          >
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </Pressable>
        </View>

        {/* Quick Material/Application Search Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {QUICK_SOURCING_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => handleSearch(chip)}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Overlapping Active Trade Command Strip */}
      <View style={styles.commandWrap}>
        <Card variant="command" padded={false} style={styles.commandStrip}>
          <Pressable
            onPress={() => router.push("/buyer/enquiries")}
            style={styles.kpiCell}
          >
            <View style={[styles.kpiDot, { backgroundColor: COLORS.primarySoft }]}>
              <Ionicons name="document-text-outline" size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.kpiNum}>{dashboardQ.data?.activeEnquiriesCount ?? 0}</Text>
            <Text style={styles.kpiLabel}>Active Enquiries</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/buyer/quotations")}
            style={[styles.kpiCell, styles.kpiCellBorder]}
          >
            <View style={[styles.kpiDot, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="pricetags-outline" size={14} color="#8A5E14" />
            </View>
            <Text style={styles.kpiNum}>{dashboardQ.data?.pendingQuotesCount ?? 0}</Text>
            <Text style={styles.kpiLabel}>Open Quotations</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/buyer/favourites")}
            style={[styles.kpiCell, styles.kpiCellBorder]}
          >
            <View style={[styles.kpiDot, { backgroundColor: COLORS.stoneBeige }]}>
              <Ionicons name="heart-outline" size={14} color={COLORS.deepGreen} />
            </View>
            <Text style={styles.kpiNum}>{dashboardQ.data?.savedCount ?? 0}</Text>
            <Text style={styles.kpiLabel}>Saved Lots</Text>
          </Pressable>
        </Card>
      </View>

      {/* Project Requirement RFQ CTA */}
      <View style={styles.section}>
        <Card tone="ivory" variant="editorial" style={styles.rfqCtaCard}>
          <Image
            source={STONE_ASSETS.hero.quarry}
            contentFit="cover"
            style={styles.rfqThumb}
          />
          <View style={styles.rfqCtaBody}>
            <Text style={TYPOGRAPHY.overline}>CUSTOM CUT-TO-SIZE & BULK ORDERS</Text>
            <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2 }]}>
              Have a project BOQ or slab requirement?
            </Text>
            <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>
              Submit stone specifications once and receive verified quarry quotes.
            </Text>
            <Button
              title="Submit Project RFQ"
              size="sm"
              onPress={() => router.push("/buyer/(tabs)/rfq")}
              style={{ marginTop: SPACING.sm, alignSelf: "flex-start" }}
            />
          </View>
        </Card>
      </View>

      {/* Stone Category Shortcuts */}
      <View style={styles.section}>
        <SectionHeader
          overline="NATURAL STONE"
          title="Browse by Stone Category"
          actionLabel="All 8 Categories"
          onActionPress={() =>
            router.push({ pathname: "/buyer/(tabs)/explore", params: { view: "categories" } })
          }
        />
        {categoriesQ.isLoading ? (
          <View style={styles.skelRow}>
            <SkeletonBox width={132} height={152} />
            <SkeletonBox width={132} height={152} />
            <SkeletonBox width={132} height={152} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {(categoriesQ.data ?? []).map((cat) => (
              <CategoryCard
                key={cat.slug}
                layout="compact"
                item={cat}
                onPress={() =>
                  router.push({
                    pathname: "/buyer/(tabs)/explore",
                    params: { category: cat.slug, view: "products" },
                  })
                }
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Featured Stone Collections */}
      <View style={styles.section}>
        <SectionHeader
          overline="FEATURED SLABS & BLOCKS"
          title="Featured Stone Collections"
          actionLabel="View Catalogue"
          onActionPress={() =>
            router.push({ pathname: "/buyer/(tabs)/explore", params: { view: "products" } })
          }
        />
        {featuredQ.isLoading ? (
          <View style={styles.skelRow}>
            <SkeletonBox width={248} height={240} />
            <SkeletonBox width={248} height={240} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {(featuredQ.data ?? []).map((item) => (
              <StoneProductCard
                key={item.id}
                compact
                item={item}
                isFavourite={favSet.has(item.id)}
                onToggleFavourite={() => handleToggleFav(item.id)}
                onPress={() => router.push(`/buyer/products/${item.id}`)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Popular Architectural Applications */}
      <View style={styles.section}>
        <SectionHeader
          overline="APPLICATIONS"
          title="Architectural Environments"
        />
        <View style={styles.appGrid}>
          {[0, 2].map((startIdx) => (
            <View key={startIdx} style={styles.appRow}>
              {ARCHITECTURAL_APPLICATIONS.slice(startIdx, startIdx + 2).map((app) => (
                <Pressable
                  key={app.key}
                  onPress={() => handleSearch(app.materialQuery)}
                  style={styles.appCard}
                >
                  <Image source={app.image} contentFit="cover" style={styles.appImg} />
                  <View style={styles.appOverlay} />
                  <View style={styles.appCopy}>
                    <Text numberOfLines={2} style={styles.appTitle}>{app.title}</Text>
                    <Text numberOfLines={2} style={styles.appSub}>{app.subtitle}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Verified Supplier Highlights */}
      <View style={styles.section}>
        <SectionHeader
          overline="VETTED QUARRIES & MILLS"
          title="Verified Suppliers"
          actionLabel="Explore"
          onActionPress={() =>
            router.push({
              pathname: "/buyer/(tabs)/explore",
              params: { verified: "true", view: "products" },
            })
          }
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {(suppliersQ.data ?? []).map((sup) => (
            <SupplierCard
              key={sup.id}
              compact
              supplier={sup}
              onPress={() => router.push(`/buyer/suppliers/${sup.id}`)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Recently Viewed Products (only when buyer has viewed lots) */}
      {(recentQ.data ?? []).length > 0 ? (
        <View style={styles.section}>
          <SectionHeader overline="HISTORY" title="Recently Viewed" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {(recentQ.data ?? []).map((item) => (
              <StoneProductCard
                key={item.id}
                compact
                item={item}
                isFavourite={favSet.has(item.id)}
                onToggleFavourite={() => handleToggleFav(item.id)}
                onPress={() => router.push(`/buyer/products/${item.id}`)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Recommended Products */}
      {(featuredQ.data ?? []).length > 2 ? (
        <View style={styles.section}>
          <SectionHeader
            overline="CURATED FOR YOUR PROJECTS"
            title="Recommended Stone Lots"
          />
          <View style={styles.verticalCards}>
            {(featuredQ.data ?? []).slice(0, 3).map((item) => (
              <StoneProductCard
                key={`rec-${item.id}`}
                item={item}
                isFavourite={favSet.has(item.id)}
                onToggleFavourite={() => handleToggleFav(item.id)}
                onPress={() => router.push(`/buyer/products/${item.id}`)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Recent Quotations & Active Enquiries */}
      {(dashboardQ.data?.recentQuotations ?? []).length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            overline="QUOTES RECEIVED"
            title="Recent Quotations"
            actionLabel="Compare / All"
            onActionPress={() => router.push("/buyer/quotations")}
          />
          <View style={styles.verticalList}>
            {dashboardQ.data!.recentQuotations.map((q) => (
              <Pressable
                key={q.id}
                onPress={() => router.push(`/buyer/quotations/${q.id}`)}
              >
                <Card style={styles.summaryRowCard}>
                  <View style={styles.summaryTop}>
                    <Text style={styles.summaryTitle}>{q.quote_number}</Text>
                    <QuotationStatusBadge status={q.status} />
                  </View>
                  <Text style={TYPOGRAPHY.caption}>{q.sellerName}</Text>
                  <Text style={styles.summaryMoney}>
                    {formatMoneyAmount(q.total_amount, q.currency)}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {(dashboardQ.data?.recentEnquiries ?? []).length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            overline="SOURCING ACTIVITY"
            title="Recent Enquiries"
            actionLabel="All Enquiries"
            onActionPress={() => router.push("/buyer/enquiries")}
          />
          <View style={styles.verticalList}>
            {dashboardQ.data!.recentEnquiries.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => router.push(`/buyer/enquiries/${e.id}`)}
              >
                <Card style={styles.summaryRowCard}>
                  <View style={styles.summaryTop}>
                    <Text numberOfLines={1} style={[styles.summaryTitle, { flex: 1 }]}>
                      {e.enquiry_title}
                    </Text>
                    <EnquiryStatusBadge status={e.status} />
                  </View>
                  <Text style={TYPOGRAPHY.caption}>
                    Qty: {e.quantity} {e.unit.replace(/_/g, " ")}
                    {e.delivery_location ? ` · ${e.delivery_location}` : ""}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Badge label="Tip: Tap Explore to filter verified stone lots by finish & thickness" tone="copper" />
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statusBarShield: {
    backgroundColor: COLORS.deepGreen,
  },
  heroBanner: {
    backgroundColor: COLORS.deepGreen,
    paddingHorizontal: SPACING.md,
    paddingBottom: 34,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  greetingTextWrap: {
    flex: 1,
  },
  overlineLight: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: COLORS.accent,
  },
  greetingTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    lineHeight: 33,
    color: COLORS.white,
    marginTop: 4,
  },
  greetingSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: "#D3DFDC",
    marginTop: 4,
  },
  notifBtn: {
    width: TOUCH_TARGET_MIN - 2,
    height: TOUCH_TARGET_MIN - 2,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.deepGreenElevated,
    borderWidth: 1,
    borderColor: COLORS.deepGreenBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  switchPill: {
    minHeight: 34,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(217,163,68,0.18)",
    borderWidth: 1,
    borderColor: COLORS.accent,
    justifyContent: "center",
  },
  switchPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.accent,
  },
  searchBar: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    paddingLeft: SPACING.sm,
    paddingRight: 6,
    minHeight: 48,
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 10,
  },
  searchGoBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.xs + 2,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  quickChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADII.xs,
    backgroundColor: "rgba(255,255,255,0.11)",
    borderWidth: 1,
    borderColor: "rgba(217,163,68,0.35)",
  },
  quickChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.white,
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  commandWrap: {
    paddingHorizontal: SPACING.md,
    marginTop: -20,
  },
  commandStrip: {
    flexDirection: "row",
    overflow: "hidden",
  },
  kpiCell: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xs,
    alignItems: "center",
    gap: 3,
  },
  kpiCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  kpiDot: {
    width: 26,
    height: 26,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  kpiNum: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.primary,
    fontVariant: ["tabular-nums"],
  },
  kpiLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  rfqCtaCard: {
    flexDirection: "row",
    padding: SPACING.sm,
    gap: SPACING.sm,
    alignItems: "center",
    borderColor: COLORS.borderStrong,
  },
  rfqThumb: {
    width: 88,
    height: 110,
    borderRadius: RADII.sm,
  },
  rfqCtaBody: {
    flex: 1,
  },
  horizontalList: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  skelRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  appGrid: {
    gap: SPACING.sm,
  },
  appRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  appCard: {
    flex: 1,
    minWidth: 0,
    height: 146,
    borderRadius: RADII.md,
    overflow: "hidden",
    position: "relative",
    backgroundColor: COLORS.deepGreen,
  },
  appImg: {
    width: "100%",
    height: "100%",
  },
  appOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8,48,46,0.44)",
  },
  appCopy: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.sm,
  },
  appTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  appSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: "#E8E2D6",
    marginTop: 2,
  },
  verticalCards: {
    gap: SPACING.md,
  },
  verticalList: {
    gap: SPACING.xs,
  },
  summaryRowCard: {
    gap: 4,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  summaryTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  summaryMoney: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.primary,
    marginTop: 2,
  },
});
