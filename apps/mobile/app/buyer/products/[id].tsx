import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import { getLocalStoneImageByMaterial } from "../../../src/theme/assets";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  ListScreenSkeleton,
  ScreenHeader,
  SectionHeader,
  StockStatusBadge,
} from "../../../src/components/ui";
import {
  ImageGalleryModal,
  StoneProductCard,
  SupplierCard,
} from "../../../src/components/stone";
import { fetchProductDetail } from "../../../src/services/catalog.service";
import {
  fetchBuyerFavourites,
  toggleBuyerFavourite,
} from "../../../src/services/buyer.service";
import { startOrOpenConversation } from "../../../src/services/messaging.service";
import { recordRecentlyViewedId } from "../../../src/lib/recently-viewed";
import { formatMoneyAmount, formatUnitLabel } from "../../../src/lib/domain-meta";
import { useAuthStore } from "../../../src/store/auth-store";

export default function BuyerProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [msgPending, setMsgPending] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const productQ = useQuery({
    queryKey: ["catalog", "product", id],
    queryFn: () => fetchProductDetail(id!),
    enabled: Boolean(id),
  });

  const favQ = useQuery({
    queryKey: ["buyer", "favourites", user?.id],
    queryFn: () => fetchBuyerFavourites(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (id) recordRecentlyViewedId(id);
  }, [id]);

  if (productQ.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Stone Details" />
        <ListScreenSkeleton count={3} />
      </View>
    );
  }

  const product = productQ.data;
  if (productQ.isError || !product) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Stone Details" />
        <ErrorState
          title="Stone Lot Unavailable"
          message="This product may be unpublished or removed."
          onRetry={() => productQ.refetch()}
        />
      </View>
    );
  }

  const fallbackImg = getLocalStoneImageByMaterial(product.materialType);
  const galleryImages: Array<{ uri: string } | { local: number }> =
    product.images.length > 0
      ? product.images.map((i) => ({ uri: i.url }))
      : [{ local: fallbackImg }];

  const isFav = (favQ.data?.favouriteIds ?? []).includes(product.id);
  const showPrice = product.priceType !== "on_request" && product.price !== null && product.price > 0;

  const handleToggleFav = async () => {
    if (!user?.id) return;
    await toggleBuyerFavourite(user.id, product.id);
    qc.invalidateQueries({ queryKey: ["buyer", "favourites", user.id] });
  };

  const handleContactSupplier = async () => {
    if (!user?.id) return;
    setActionErr(null);
    setMsgPending(true);
    try {
      const convId = await startOrOpenConversation({
        sellerId: product.sellerId,
        productId: product.id,
        subject: `Product Inquiry: ${product.name}`,
        callerRole: "buyer",
        userId: user.id,
      });
      router.push(`/buyer/chat/${convId}`);
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Unable to start chat.");
    } finally {
      setMsgPending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={product.materialType || "Stone Lot"}
        subtitle={product.stoneOrigin || undefined}
        rightSlot={
          <Pressable onPress={handleToggleFav} style={styles.iconBtn} accessibilityLabel="Favourite">
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={22}
              color={isFav ? COLORS.error : COLORS.textPrimary}
            />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Large Swipeable Image Gallery */}
        <FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={galleryImages}
          keyExtractor={(_, idx) => String(idx)}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => {
                setGalleryIdx(index);
                setGalleryOpen(true);
              }}
            >
              <Image
                source={"uri" in item ? { uri: item.uri } : item.local}
                contentFit="cover"
                style={[styles.heroImage, { width: screenWidth }]}
              />
            </Pressable>
          )}
        />

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <StockStatusBadge status={product.stockStatus} />
            {product.supplier?.verified ? (
              <Badge
                label="Verified Quarry"
                tone="primary"
                icon={<Ionicons name="shield-checkmark" size={11} color={COLORS.primary} />}
              />
            ) : null}
            {product.sku ? <Badge label={`SKU: ${product.sku}`} tone="neutral" /> : null}
          </View>

          <Text style={[TYPOGRAPHY.heroTitle, styles.title]}>{product.name}</Text>

          <Card tone="beige" style={styles.priceBox}>
            <Text style={TYPOGRAPHY.overline}>COMMERCIAL INDICATION</Text>
            {showPrice ? (
              <Text style={styles.priceValue}>
                {product.priceType === "starting" ? "Starting from " : ""}
                {formatMoneyAmount(product.price, product.currency)}
                <Text style={styles.priceUnit}> / {formatUnitLabel(product.unit)}</Text>
              </Text>
            ) : (
              <Text style={styles.priceValue}>Price On Request (Submit RFQ)</Text>
            )}
            {product.minimumOrderQuantity ? (
              <Text style={TYPOGRAPHY.caption}>
                Minimum Order: {product.minimumOrderQuantity} {formatUnitLabel(product.unit)}
                {product.leadTime ? ` · Dispatch Lead Time: ~${product.leadTime} days` : ""}
              </Text>
            ) : null}
          </Card>

          {actionErr ? (
            <Text style={styles.errorText}>{actionErr}</Text>
          ) : null}

          {/* Technical Specifications */}
          <Card>
            <Text style={[TYPOGRAPHY.sectionTitle, { marginBottom: SPACING.sm }]}>
              Technical Specifications
            </Text>
            {[
              ["Material", product.materialType],
              ["Origin", product.stoneOrigin],
              ["Colour", product.colour],
              ["Surface Finish", product.finish],
              ["Slab Thickness", product.thickness ? `${product.thickness} mm` : null],
              [
                "Dimensions",
                product.length && product.width
                  ? `${product.length} × ${product.width} mm`
                  : null,
              ],
              ...product.specifications.map((s) => [s.name, s.value]),
            ]
              .filter((row): row is [string, string] => Boolean(row[1]))
              .map(([k, v]) => (
                <View key={k} style={styles.specRow}>
                  <Text style={TYPOGRAPHY.caption}>{k}</Text>
                  <Text style={styles.specVal}>{v}</Text>
                </View>
              ))}
          </Card>

          {product.description ? (
            <Card>
              <Text style={[TYPOGRAPHY.sectionTitle, { marginBottom: SPACING.xs }]}>
                Architectural Notes & Description
              </Text>
              <Text style={TYPOGRAPHY.body}>{product.description}</Text>
            </Card>
          ) : null}

          {product.supplier ? (
            <View>
              <SectionHeader overline="SUPPLIER" title="Supplied By" />
              <SupplierCard
                supplier={product.supplier}
                onPress={() => router.push(`/buyer/suppliers/${product.supplier!.id}`)}
              />
            </View>
          ) : null}

          {product.similarProducts.length > 0 ? (
            <View>
              <SectionHeader overline="MORE IN THIS MATERIAL" title="Similar Stone Lots" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: SPACING.sm }}
              >
                {product.similarProducts.map((sim) => (
                  <StoneProductCard
                    key={sim.id}
                    compact
                    item={sim}
                    onPress={() => router.push(`/buyer/products/${sim.id}`)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Sticky Commercial Actions */}
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, SPACING.sm) },
        ]}
      >
        <Button
          title="Contact Supplier"
          variant="outline"
          loading={msgPending}
          onPress={handleContactSupplier}
          style={{ flex: 1 }}
        />
        <Button
          title="Get Best Price (RFQ)"
          onPress={() =>
            router.push({
              pathname: "/buyer/(tabs)/rfq",
              params: {
                productId: product.id,
                productName: product.name,
                sellerId: product.sellerId,
                sellerName: product.supplier?.businessName ?? "",
                material: product.materialType ?? "Marble",
              },
            })
          }
          style={{ flex: 1.2 }}
        />
      </View>

      <ImageGalleryModal
        visible={galleryOpen}
        images={galleryImages}
        initialIndex={galleryIdx}
        onClose={() => setGalleryOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  iconBtn: { width: TOUCH_TARGET_MIN, height: TOUCH_TARGET_MIN, alignItems: "flex-end", justifyContent: "center" },
  heroImage: { height: 290, backgroundColor: COLORS.stoneBeige },
  body: { padding: SPACING.md, gap: SPACING.md },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  title: { fontSize: 26, lineHeight: 33 },
  priceBox: { gap: 4 },
  priceValue: { fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.primary },
  priceUnit: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.textSecondary },
  errorText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.error },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stoneBeige,
    gap: SPACING.md,
  },
  specVal: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textPrimary, textAlign: "right", flex: 1 },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
