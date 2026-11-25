import React from "react";
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";
import { formatMoneyAmount, formatUnitLabel } from "../../lib/domain-meta";
import { getLocalStoneImageByMaterial } from "../../theme/assets";
import { Badge } from "../ui/Badge";
import { StockStatusBadge } from "../ui/StatusBadge";

export interface StoneProductCardItem {
  id: string;
  name: string;
  materialType: string | null;
  colour: string | null;
  finish: string | null;
  thickness: number | null;
  length?: number | null;
  width?: number | null;
  origin: string | null;
  priceType: string;
  price: number | null;
  currency: string;
  unit: string;
  stockStatus: string;
  imageUrl: string | null;
  supplierName: string | null;
  supplierLocation?: string | null;
  supplierVerified: boolean;
}

export const StoneProductCard = React.memo(function StoneProductCard({
  item,
  onPress,
  isFavourite,
  onToggleFavourite,
  compact = false,
}: {
  item: StoneProductCardItem;
  onPress: () => void;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  compact?: boolean;
}) {
  const fallbackSource: ImageSourcePropType = getLocalStoneImageByMaterial(item.materialType);
  const showCommercialPrice =
    item.priceType !== "on_request" && item.price !== null && item.price > 0;

  const specsLine = [
    item.materialType,
    item.colour,
    item.finish,
    item.thickness ? `${item.thickness} mm` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View style={[styles.mediaWrap, compact && styles.mediaCompact]}>
          <Image
            source={item.imageUrl ? { uri: item.imageUrl } : fallbackSource}
            placeholder={fallbackSource}
            contentFit="cover"
            transition={200}
            style={styles.image}
          />
          <View style={styles.topOverlay}>
            <StockStatusBadge status={item.stockStatus} />
          </View>
        </View>

        <View style={styles.body}>
          {item.origin ? (
            <Text numberOfLines={1} style={styles.originText}>
              {item.origin.toUpperCase()}
            </Text>
          ) : null}
          <Text numberOfLines={2} style={styles.title}>
            {item.name}
          </Text>
          {specsLine ? (
            <Text numberOfLines={1} style={styles.specs}>
              {specsLine}
            </Text>
          ) : null}

          <View style={styles.supplierRow}>
            <Text numberOfLines={1} style={styles.supplierName}>
              {item.supplierName || "Registered Stone Supplier"}
            </Text>
            {item.supplierVerified ? (
              <Badge
                label="Verified"
                tone="primary"
                icon={<Ionicons name="shield-checkmark" size={11} color={COLORS.primary} />}
              />
            ) : null}
          </View>

          <View style={styles.priceRow}>
            {showCommercialPrice ? (
              <Text style={styles.priceText}>
                {item.priceType === "starting" ? "From " : ""}
                {formatMoneyAmount(item.price, item.currency)}
                <Text style={styles.unitText}> / {formatUnitLabel(item.unit)}</Text>
              </Text>
            ) : (
              <Text style={styles.poaText}>Price on Request</Text>
            )}
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </View>
        </View>
      </Pressable>

      {onToggleFavourite ? (
        <Pressable
          onPress={onToggleFavourite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isFavourite ? "Remove from saved" : "Save product"}
          style={styles.favBtn}
        >
          <Ionicons
            name={isFavourite ? "heart" : "heart-outline"}
            size={18}
            color={isFavourite ? COLORS.error : COLORS.textPrimary}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...SHADOWS.card,
  },
  cardCompact: {
    width: 248,
  },
  pressed: {
    opacity: 0.94,
  },
  mediaWrap: {
    height: 178,
    backgroundColor: COLORS.stoneBeige,
    position: "relative",
  },
  mediaCompact: {
    height: 148,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topOverlay: {
    position: "absolute",
    top: SPACING.xs,
    left: SPACING.xs,
    right: SPACING.xs + TOUCH_TARGET_MIN,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  favBtn: {
    position: "absolute",
    top: SPACING.xs,
    right: SPACING.xs,
    zIndex: 2,
    width: TOUCH_TARGET_MIN - 6,
    height: TOUCH_TARGET_MIN - 6,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: SPACING.sm,
    gap: 4,
  },
  originText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.9,
    color: COLORS.accent,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  specs: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  supplierRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
    marginTop: 4,
  },
  supplierName: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  priceText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.primary,
  },
  unitText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  poaText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.deepGreen,
  },
});
