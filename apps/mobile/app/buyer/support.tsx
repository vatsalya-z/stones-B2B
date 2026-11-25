import React from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, SPACING } from "../../src/theme/tokens";
import { TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card, ScreenHeader } from "../../src/components/ui";
import { PaymentGovernanceBanner } from "../../src/components/stone";
import { PUBLIC_ENV } from "../../src/lib/env";

export default function BuyerSupportScreen() {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Help & Trade Support" subtitle="StonesDekho Trade Desk" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={TYPOGRAPHY.sectionTitle}>StonesDekho B2B Trade Desk</Text>
          <Text style={[TYPOGRAPHY.body, { marginTop: 6 }]}>
            Need assistance matching a specialized architectural stone lot, calibrating container shipments, or resolving an enquiry?
          </Text>
          <Button
            title="Visit Help Center on Web"
            variant="outline"
            onPress={() => Linking.openURL(`${PUBLIC_ENV.siteUrl}/contact`)}
            style={{ marginTop: SPACING.md }}
          />
        </Card>

        <PaymentGovernanceBanner role="buyer" />

        <Card>
          <Text style={TYPOGRAPHY.cardTitle}>Platform Policies</Text>
          <Button
            title="Terms of Service"
            variant="ghost"
            onPress={() => Linking.openURL(`${PUBLIC_ENV.siteUrl}/terms`)}
          />
          <Button
            title="Privacy Policy"
            variant="ghost"
            onPress={() => Linking.openURL(`${PUBLIC_ENV.siteUrl}/privacy`)}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
});
