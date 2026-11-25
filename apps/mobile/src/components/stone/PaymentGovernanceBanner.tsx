import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";

/**
 * Payment Model B Governance Banner:
 * Discloses escrow settlement and clarifies that payment states are exclusively
 * server/webhook-verified (never manually marked paid by buyer or seller).
 */
export function PaymentGovernanceBanner({ role }: { role: "buyer" | "seller" }) {
  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
        <Text style={styles.title}>StonesDekho Payment Model B — Escrow Protected</Text>
      </View>
      <Text style={styles.body}>
        {role === "buyer"
          ? "Payments are routed strictly through StonesDekho's RBI-authorized Payment Aggregator escrow arrangement and verified server-side before seller release. Order fulfillment and payment verification states are tracked independently."
          : "Buyer payments settle via StonesDekho's RBI-authorized Payment Aggregator nodal/escrow account after delivery milestones. Payment status is verified exclusively server-side and cannot be updated manually during fulfillment."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#EEF5F1",
    borderWidth: 1,
    borderColor: "#C5DFD0",
    borderRadius: RADII.md,
    padding: SPACING.md,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.deepGreen,
  },
  body: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
});
