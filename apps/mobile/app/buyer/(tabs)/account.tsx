import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import { Badge, Button, Card, ConfirmDialog } from "../../../src/components/ui";
import { WorkspaceSwitcher } from "../../../src/components/stone";
import { useAuthStore } from "../../../src/store/auth-store";
import { canAccessWorkspace } from "../../../src/lib/role-utils";

interface MenuRow {
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const SOURCING_MENU: MenuRow[] = [
  { label: "My Enquiries & RFQs", subtitle: "Track direct & broadcast requests", icon: "document-text-outline", route: "/buyer/enquiries" },
  { label: "Quotations", subtitle: "Review & decide supplier quotes", icon: "pricetags-outline", route: "/buyer/quotations" },
  { label: "Compare Quotations", subtitle: "Side-by-side commercial terms", icon: "git-compare-outline", route: "/buyer/quotations/compare" },
  { label: "Orders & Fulfillment", subtitle: "Escrow-protected stone orders", icon: "cube-outline", route: "/buyer/orders" },
  { label: "Saved Products", subtitle: "Favourites & architectural shortlist", icon: "heart-outline", route: "/buyer/favourites" },
  { label: "My Projects", subtitle: "Group RFQs by project site", icon: "business-outline", route: "/buyer/projects" },
];

const ACCOUNT_MENU: MenuRow[] = [
  { label: "Notifications", icon: "notifications-outline", route: "/buyer/notifications" },
  { label: "Saved Addresses", subtitle: "Billing & site delivery locations", icon: "location-outline", route: "/buyer/addresses" },
  { label: "Buyer Profile", subtitle: "Company & contact details", icon: "person-circle-outline", route: "/buyer/profile" },
  { label: "Account Settings", subtitle: "Security & password", icon: "settings-outline", route: "/buyer/settings" },
  { label: "Help & Support", icon: "help-circle-outline", route: "/buyer/support" },
];

export default function BuyerAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const roles = useAuthStore((s) => s.roles);
  const signOut = useAuthStore((s) => s.signOut);
  const activateWorkspaceRole = useAuthStore((s) => s.activateWorkspaceRole);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [activatingSeller, setActivatingSeller] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const hasSellerRole = canAccessWorkspace(roles, "seller");

  const handleActivateSeller = async () => {
    setActivationError(null);
    setActivatingSeller(true);
    const res = await activateWorkspaceRole("seller");
    setActivatingSeller(false);
    if (!res.ok) {
      setActivationError(res.error || "Unable to activate Seller workspace.");
      return;
    }
    router.replace("/seller/(tabs)");
  };

  const initials = (profile?.full_name || user?.email || "SD")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={styles.screen}>
      {insets.top > 0 ? (
        <View style={{ height: insets.top, backgroundColor: COLORS.background }} />
      ) : null}
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top > 0 ? 14 : 20,
          paddingHorizontal: SPACING.md,
          paddingBottom: SPACING.xxl,
        }}
      >
      <Card tone="deep" variant="command" style={styles.profileCard}>
        <View style={styles.identityTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "SD"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>BUYER WORKSPACE</Text>
            <Text numberOfLines={1} style={styles.name}>
              {profile?.full_name || "Registered Buyer"}
            </Text>
            <Text numberOfLines={1} style={styles.email}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.roleStrip}>
          <Badge
            label={`Authorized Roles: ${roles.length > 0 ? roles.join(" · ").toUpperCase() : "PENDING"}`}
            tone="copper"
          />
        </View>
      </Card>

      <View style={{ marginTop: SPACING.md }}>
        <WorkspaceSwitcher />
        {!hasSellerRole ? (
          <Card tone="ivory" variant="editorial" style={styles.sellerPromoCard}>
            <View style={styles.promoHeaderRow}>
              <Ionicons name="storefront-outline" size={16} color={COLORS.accent} />
              <Text style={TYPOGRAPHY.eyebrow}>SUPPLIER ENROLLMENT</Text>
            </View>
            <Text style={TYPOGRAPHY.cardTitle}>Sell Natural Stone on StonesDekho</Text>
            <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>
              Switch or expand your trade account into the Quarry & Supplier Portal to list stone lots and quote on RFQs.
            </Text>
            {activationError ? (
              <Text style={styles.activationErr}>{activationError}</Text>
            ) : null}
            <Button
              title="Activate Quarry / Seller Portal"
              variant="copper"
              loading={activatingSeller}
              onPress={handleActivateSeller}
              style={{ marginTop: SPACING.sm }}
            />
          </Card>
        ) : null}
      </View>

      <Text style={styles.groupTitle}>Trade & Sourcing</Text>
      <Card padded={false} variant="elevated" style={styles.menuCard}>
        {SOURCING_MENU.map((item, idx) => (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route as never)}
            style={[styles.menuRow, idx > 0 && styles.menuBorder]}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={19} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.subtitle ? <Text style={TYPOGRAPHY.caption}>{item.subtitle}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={17} color={COLORS.textSecondary} />
          </Pressable>
        ))}
      </Card>

      <Text style={styles.groupTitle}>Account & Settings</Text>
      <Card padded={false} variant="elevated" style={styles.menuCard}>
        {ACCOUNT_MENU.map((item, idx) => (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route as never)}
            style={[styles.menuRow, idx > 0 && styles.menuBorder]}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={19} color={COLORS.deepGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.subtitle ? <Text style={TYPOGRAPHY.caption}>{item.subtitle}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={17} color={COLORS.textSecondary} />
          </Pressable>
        ))}
      </Card>

      <Button
        title="Sign Out"
        variant="outline"
        fullWidth
        onPress={() => setConfirmLogout(true)}
        style={{ marginTop: SPACING.lg }}
      />

      <ConfirmDialog
        visible={confirmLogout}
        title="Sign Out of StonesDekho?"
        message="Your session tokens will be removed securely from this device."
        confirmLabel="Sign Out"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await signOut();
          router.replace("/(auth)/sign-in");
        }}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  profileCard: { gap: SPACING.sm, borderColor: COLORS.accentBorder },
  identityTop: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.deepGreenElevated,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: FONTS.displayBold, fontSize: 18, color: COLORS.accent },
  overline: { fontFamily: FONTS.bodySemiBold, fontSize: 10, letterSpacing: 1.3, color: COLORS.accent },
  name: { fontFamily: FONTS.displaySemiBold, fontSize: 20, color: COLORS.white, marginTop: 2 },
  email: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.textOnDarkMuted, marginTop: 2 },
  roleStrip: {
    backgroundColor: COLORS.deepGreenElevated,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.deepGreenBorder,
    padding: SPACING.xs,
  },
  groupTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  menuCard: { overflow: "hidden" },
  menuRow: {
    minHeight: TOUCH_TARGET_MIN + 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  menuBorder: { borderTopWidth: 1, borderTopColor: COLORS.stoneBeige },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  sellerPromoCard: {
    borderColor: COLORS.accentBorder,
    marginBottom: SPACING.sm,
  },
  promoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  activationErr: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
});
