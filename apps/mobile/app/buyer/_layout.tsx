import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, Stack, useRouter } from "expo-router";
import { COLORS, SPACING } from "../../src/theme/tokens";
import { TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { canAccessWorkspace } from "../../src/lib/role-utils";

export default function BuyerRootLayout() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const roles = useAuthStore((s) => s.roles);
  const signOut = useAuthStore((s) => s.signOut);

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Strictly block access to Buyer screens unless PostgreSQL user_roles grants buyer/admin
  if (!canAccessWorkspace(roles, "buyer")) {
    return (
      <View style={styles.blocked}>
        <Card style={styles.card}>
          <Text style={TYPOGRAPHY.overline}>AUTHORIZATION REQUIRED</Text>
          <Text style={[TYPOGRAPHY.sectionTitle, { marginTop: 4 }]}>
            Buyer Marketplace Restricted
          </Text>
          <Text style={[TYPOGRAPHY.body, { marginTop: 8, color: COLORS.textSecondary }]}>
            Your account does not hold Buyer marketplace authorization in StonesDekho.
          </Text>
          {canAccessWorkspace(roles, "seller") ? (
            <Button
              title="Return to Supplier Portal"
              onPress={() => router.replace("/seller/(tabs)")}
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
      <Stack.Screen name="products/[id]" />
      <Stack.Screen name="suppliers/[id]" />
      <Stack.Screen name="enquiries/index" />
      <Stack.Screen name="enquiries/[id]" />
      <Stack.Screen name="quotations/index" />
      <Stack.Screen name="quotations/[id]" />
      <Stack.Screen name="quotations/compare" />
      <Stack.Screen name="orders/index" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="chat/[conversationId]" />
      <Stack.Screen name="favourites" />
      <Stack.Screen name="projects" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="support" />
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
