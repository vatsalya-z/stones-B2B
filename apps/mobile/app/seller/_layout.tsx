import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, Stack, useRouter } from "expo-router";
import { COLORS, SPACING } from "../../src/theme/tokens";
import { TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { canAccessWorkspace } from "../../src/lib/role-utils";

export default function SellerRootLayout() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const roles = useAuthStore((s) => s.roles);
  const signOut = useAuthStore((s) => s.signOut);

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Strictly block access to Seller screens unless PostgreSQL user_roles grants seller/admin
  if (!canAccessWorkspace(roles, "seller")) {
    return (
      <View style={styles.blocked}>
        <Card style={styles.card}>
          <Text style={TYPOGRAPHY.overline}>AUTHORIZATION REQUIRED</Text>
          <Text style={[TYPOGRAPHY.sectionTitle, { marginTop: 4 }]}>
            Supplier Portal Restricted
          </Text>
          <Text style={[TYPOGRAPHY.body, { marginTop: 8, color: COLORS.textSecondary }]}>
            Your account does not hold Seller authorization in StonesDekho.
          </Text>
          {canAccessWorkspace(roles, "buyer") ? (
            <Button
              title="Return to Buyer Marketplace"
              onPress={() => router.replace("/buyer/(tabs)")}
              style={{ marginTop: SPACING.md }}
            />
          ) : (
            <Button
              title="Sign Out"
              variant="outline"
              onPress={async () => {
                await signOut();
                router.replace("/(auth)/sign-in");
              }}
              style={{ marginTop: SPACING.md }}
            />
          )}
        </Card>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="products/new" />
      <Stack.Screen name="products/[id]/edit" />
      <Stack.Screen name="leads/[id]" />
      <Stack.Screen name="quotations/index" />
      <Stack.Screen name="quotations/new" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="storefront" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="chat/[conversationId]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  card: { padding: SPACING.lg },
});
