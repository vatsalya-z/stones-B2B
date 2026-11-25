import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  VerificationStatusBadge,
} from "../../../src/components/ui";
import { WorkspaceSwitcher } from "../../../src/components/stone";
import { useAuthStore } from "../../../src/store/auth-store";
import { canAccessWorkspace } from "../../../src/lib/role-utils";
import { BUSINESS_TYPE_LABELS } from "../../../src/lib/domain-meta";

type MenuRow = {
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const COMMERCIAL_MENU: MenuRow[] = [
  { label: "Storefront & Business Profile", subtitle: "Company, quarry capabilities & logo", icon: "storefront-outline", route: "/seller/storefront" },
  { label: "Quotations History", subtitle: "Draft & sent buyer commercial quotes", icon: "pricetags-outline", route: "/seller/quotations" },
  { label: "Buyer Messages", subtitle: "Active trade & RFQ conversations", icon: "chatbubbles-outline", route: "/seller/messages" },
];

const COMPLIANCE_MENU: MenuRow[] = [
  { label: "KYC & Verification", subtitle: "GSTIN, mining lease & admin review", icon: "shield-checkmark-outline", route: "/seller/verification" },
  { label: "Subscription & Lead Credits", subtitle: "Plan tier, listings & monthly lead quotas", icon: "ribbon-outline", route: "/seller/subscription" },
];

const SETTINGS_MENU: MenuRow[] = [
  { label: "Notifications", subtitle: "Lead alerts & order milestones", icon: "notifications-outline", route: "/seller/notifications" },
  { label: "Business & Account Settings", subtitle: "Password, security & alerts", icon: "settings-outline", route: "/seller/settings" },
];

export default function SellerAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const roles = useAuthStore((s) => s.roles);
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const activateWorkspaceRole = useAuthStore((s) => s.activateWorkspaceRole);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [activatingBuyer, setActivatingBuyer] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const hasBuyerRole = canAccessWorkspace(roles, "buyer");

  const handleActivateBuyer = async () => {
    setActivationError(null);
    setActivatingBuyer(true);
    const res = await activateWorkspaceRole("buyer");
    setActivatingBuyer(false);
    if (!res.ok) {
      setActivationError(res.error || "Unable to enable Buyer marketplace.");
      return;
    }
    router.replace("/buyer/(tabs)");
  };

  const displayName = sellerProfile?.business_name || profile?.full_name || "Unconfigured Stone Business";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const metaLine = sellerProfile
    ? [
        BUSINESS_TYPE_LABELS[sellerProfile.business_type] ?? sellerProfile.business_type,
        [sellerProfile.city, sellerProfile.state].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · ")
    : "Complete your quarry profile to get verified";

  const renderGroup = (title: string, items: MenuRow[]) => (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <Card padded={false} variant="elevated" style={styles.menuCard}>
        {items.map((item, idx) => (
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
    </View>
  );

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
      {/* Executive Business Identity Card */}
      <Card tone="deep" variant="command" style={styles.profileCard}>
        <View style={styles.identityTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "SD"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>SUPPLIER WORKSPACE</Text>
            <Text numberOfLines={1} style={styles.bizName}>{displayName}</Text>
            <Text numberOfLines={1} style={styles.metaText}>{metaLine}</Text>
          </View>
        </View>

        <View style={styles.identityFooter}>
          <View style={styles.identityBadges}>
            <VerificationStatusBadge status={sellerProfile?.verification_status || "draft"} />
            <Badge
              label={roles.length > 0 ? roles.join(" · ").toUpperCase() : "PENDING"}
              tone="copper"
            />
          </View>
          <Text numberOfLines={1} style={styles.email}>{user?.email}</Text>
        </View>
      </Card>

      <View style={{ marginTop: SPACING.md }}>
        <WorkspaceSwitcher />
        {!hasBuyerRole ? (
          <Card tone="ivory" variant="editorial" style={styles.buyerPromoCard}>
            <Text style={TYPOGRAPHY.eyebrow}>DUAL-ROLE EXPANSION</Text>
            <Text style={TYPOGRAPHY.cardTitle}>Source Stone as a Buyer</Text>
            <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>
              Enable Buyer Sourcing on your trade account to discover quarry lots and submit project RFQs.
            </Text>
            {activationError ? (
              <Text style={styles.activationErr}>{activationError}</Text>
            ) : null}
            <Button
              title="Enable Buyer Marketplace"
              variant="outline"
              loading={activatingBuyer}
              onPress={handleActivateBuyer}
              style={{ marginTop: SPACING.sm }}
            />
          </Card>
        ) : null}
      </View>

      {renderGroup("Commercial Operations", COMMERCIAL_MENU)}
      {renderGroup("Compliance & Billing", COMPLIANCE_MENU)}
      {renderGroup("Workspace Settings", SETTINGS_MENU)}

      <Button
        title="Sign Out"
        variant="outline"
        fullWidth
        onPress={() => setConfirmLogout(true)}
        style={{ marginTop: SPACING.lg }}
      />

      <ConfirmDialog
        visible={confirmLogout}
        title="Sign Out of Supplier Portal?"
        message="Your encrypted session will be removed from this device."
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
  bizName: { fontFamily: FONTS.displayBold, fontSize: 21, color: COLORS.white, marginTop: 2 },
  metaText: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.textOnDarkMuted, marginTop: 2 },
  identityFooter: {
    backgroundColor: COLORS.deepGreenElevated,
    borderWidth: 1,
    borderColor: COLORS.deepGreenBorder,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    gap: 6,
  },
  identityBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  email: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.textOnDarkMuted },
  group: { marginTop: SPACING.md },
  groupTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: COLORS.textSecondary,
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
  buyerPromoCard: { marginBottom: SPACING.sm },
  activationErr: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
});
