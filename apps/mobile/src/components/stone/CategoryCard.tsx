import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING } from "../../theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../theme/typography";

export interface CategoryCardItem {
  id?: string;
  slug: string;
  name: string;
  description: string;
  imageSource: ImageSource | number | string;
  productCount?: number | null;
}

export function CategoryCard({
  item,
  onPress,
  layout = "tile",
}: {
  item: CategoryCardItem;
  onPress: () => void;
  layout?: "tile" | "compact";
}) {
  const source =
    typeof item.imageSource === "string" ? { uri: item.imageSource } : item.imageSource;

  if (layout === "compact") {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.compactCard, pressed && styles.pressed]}
      >
        <Image source={source} contentFit="cover" transition={200} style={styles.compactImg} />
        <View style={styles.compactScrim} />
        <View style={styles.compactLabelWrap}>
          <Text numberOfLines={1} style={styles.compactTitle}>
            {item.name}
          </Text>
          {typeof item.productCount === "number" ? (
            <Text style={styles.compactCount}>{item.productCount} listings</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={source} contentFit="cover" transition={200} style={styles.image} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={TYPOGRAPHY.cardTitle}>{item.name}</Text>
          {typeof item.productCount === "number" ? (
            <Text style={styles.countPill}>{item.productCount} lots</Text>
          ) : null}
        </View>
        <Text numberOfLines={2} style={styles.desc}>
          {item.description}
        </Text>
        <View style={styles.exploreRow}>
          <Text style={styles.exploreText}>Explore collection</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    width: 132,
    height: 152,
    borderRadius: RADII.md,
    overflow: "hidden",
    backgroundColor: COLORS.deepGreen,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactImg: {
    width: "100%",
    height: "100%",
  },
  compactScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8, 48, 46, 0.38)",
  },
  compactLabelWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xs,
  },
  compactTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: COLORS.white,
  },
  compactCount: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: "#E8E2D6",
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...SHADOWS.card,
  },
  pressed: {
    opacity: 0.92,
  },
  image: {
    width: "100%",
    height: 144,
    backgroundColor: COLORS.stoneBeige,
  },
  body: {
    padding: SPACING.sm,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  countPill: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.primary,
    backgroundColor: "#E6F2ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.xs,
  },
  desc: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  exploreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  exploreText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.primary,
  },
});
