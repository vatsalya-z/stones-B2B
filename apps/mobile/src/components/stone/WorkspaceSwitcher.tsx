import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../theme/typography";
import { useAuthStore } from "../../store/auth-store";
import { canAccessWorkspace } from "../../lib/role-utils";

/**
 * Only renders when the authenticated user holds BOTH buyer and seller roles
 * in PostgreSQL `public.user_roles`. Single-role accounts never see this control.
 */
export function WorkspaceSwitcher() {
  const router = useRouter();
  const roles = useAuthStore((s) => s.roles);
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const switchWorkspace = useAuthStore((s) => s.switchWorkspace);

  const hasBuyer = canAccessWorkspace(roles, "buyer");
  const hasSeller = canAccessWorkspace(roles, "seller");

  if (!hasBuyer || !hasSeller) {
    return null;
  }

  const handleSelect = async (target: "buyer" | "seller") => {
    if (target === activeWorkspace) return;
    Haptics.selectionAsync().catch(() => undefined);
    const ok = await switchWorkspace(target);
    if (ok) {
      router.replace(target === "seller" ? "/seller/(tabs)" : "/buyer/(tabs)");
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="swap-horizontal" size={15} color={COLORS.accent} />
          </View>
          <View>
            <Text style={TYPOGRAPHY.eyebrow}>DUAL ROLE WORKSPACE</Text>
            <Text style={styles.title}>Active Portal Mode</Text>
          </View>
        </View>
        <View style={styles.activePill}>
          <Text style={styles.activePillText}>
            {activeWorkspace === "seller" ? "Supplier" : "Buyer"}
          </Text>
        </View>
      </View>

      <View style={styles.segment}>
        <Pressable
          onPress={() => handleSelect("buyer")}
          accessibilityRole="button"
          accessibilityState={{ selected: activeWorkspace === "buyer" }}
          style={[
            styles.btn,
            activeWorkspace === "buyer" && styles.btnActive,
          ]}
        >
          <Ionicons
            name={activeWorkspace === "buyer" ? "business" : "business-outline"}
            size={15}
            color={activeWorkspace === "buyer" ? COLORS.white : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.btnText,
              activeWorkspace === "buyer" && styles.btnTextActive,
            ]}
          >
            Buyer Sourcing
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleSelect("seller")}
          accessibilityRole="button"
          accessibilityState={{ selected: activeWorkspace === "seller" }}
          style={[
            styles.btn,
            activeWorkspace === "seller" && styles.btnActiveSeller,
          ]}
        >
          <Ionicons
            name={activeWorkspace === "seller" ? "storefront" : "storefront-outline"}
            size={15}
            color={activeWorkspace === "seller" ? COLORS.white : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.btnText,
              activeWorkspace === "seller" && styles.btnTextActive,
            ]}
          >
            Seller Portal
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  activePill: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  activePillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.primary,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: COLORS.stoneBeige,
    borderRadius: RADII.sm,
    padding: 4,
    gap: 4,
  },
  btn: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.xs + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.subtle,
  },
  btnActiveSeller: {
    backgroundColor: COLORS.deepGreen,
    ...SHADOWS.subtle,
  },
  btnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  btnTextActive: {
    color: COLORS.white,
  },
});
