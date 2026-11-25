import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { COLORS, SPACING } from "../src/theme/tokens";
import { FONTS } from "../src/theme/typography";
import { useAuthStore } from "../src/store/auth-store";
import { canAccessWorkspace } from "../src/lib/role-utils";

export default function IndexGate() {
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);
  const roles = useAuthStore((s) => s.roles);
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

  if (!initialized) {
    return (
      <View style={styles.splash}>
        <Text style={styles.brand}>StonesDekho</Text>
        <Text style={styles.tagline}>ARCHITECTURAL NATURAL STONE EXCHANGE</Text>
        <ActivityIndicator color={COLORS.accent} size="large" style={styles.spinner} />
      </View>
    );
  }

  if (!session) {
    return (
      <Redirect
        href={hasCompletedOnboarding ? "/(auth)/sign-in" : "/(auth)/onboarding"}
      />
    );
  }

  if (activeWorkspace === "seller" && canAccessWorkspace(roles, "seller")) {
    return <Redirect href="/seller/(tabs)" />;
  }

  return <Redirect href="/buyer/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.deepGreen,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  brand: {
    fontFamily: FONTS.displayBold,
    fontSize: 34,
    color: COLORS.white,
    letterSpacing: 0.4,
  },
  tagline: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2,
    color: COLORS.accent,
    marginTop: 8,
  },
  spinner: {
    marginTop: SPACING.xl,
  },
});
