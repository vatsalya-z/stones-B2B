import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";
import { BUSINESS_TYPE_LABELS } from "../../lib/domain-meta";
import { Badge } from "../ui/Badge";
import type { BusinessType } from "@stone/types";

export interface SupplierCardItem {
  id: string;
  businessName: string;
  businessType: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  yearsInBusiness: number | null;
  logoUrl: string | null;
  verified: boolean;
  capabilities?: string[];
}

export function SupplierCard({
  supplier,
  onPress,
  compact = false,
}: {
  supplier: SupplierCardItem;
  onPress: () => void;
  compact?: boolean;
}) {
  const location = [supplier.city, supplier.state, supplier.country].filter(Boolean).join(", ");
  const typeLabel =
    BUSINESS_TYPE_LABELS[supplier.businessType as BusinessType] ??
    supplier.businessType ??
    "Verified Stone Supplier";
  const initials = supplier.businessName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        compact && styles.compact,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        {supplier.logoUrl ? (
          <Image source={{ uri: supplier.logoUrl }} contentFit="cover" style={styles.logo} />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.initials}>{initials || "SD"}</Text>
          </View>
        )}
        <View style={styles.headerMeta}>
          <Text numberOfLines={1} style={styles.name}>
            {supplier.businessName}
          </Text>
          <Text numberOfLines={1} style={styles.type}>
            {typeLabel}
          </Text>
        </View>
      </View>

      {location ? (
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text numberOfLines={1} style={styles.locText}>
            {location}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        {supplier.verified ? (
          <Badge
            label="Verified Quarry / Mill"
            tone="primary"
            icon={<Ionicons name="shield-checkmark" size={11} color={COLORS.primary} />}
          />
        ) : null}
        {supplier.yearsInBusiness ? (
          <Text style={styles.years}>{supplier.yearsInBusiness}+ yrs</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.xs,
    ...SHADOWS.card,
  },
  compact: {
    width: 268,
  },
  pressed: {
    opacity: 0.92,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.stoneBeige,
  },
  logoFallback: {
    width: 44,
    height: 44,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.deepGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: COLORS.accent,
  },
  headerMeta: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  type: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  years: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.accent,
  },
});
