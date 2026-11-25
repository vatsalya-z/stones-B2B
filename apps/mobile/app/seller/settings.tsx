import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { buyerPasswordChangeSchema } from "@stone/validation";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card, Input, ScreenHeader } from "../../src/components/ui";
import { supabase } from "../../src/lib/supabase";
import { requestNotificationPermissions } from "../../src/lib/notifications";

export default function SellerSettingsScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handlePassword = async () => {
    setMsg(null);
    const parsed = buyerPasswordChangeSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setMsg({ ok: false, text: parsed.error.errors[0]?.message ?? "Invalid password." });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setMsg({ ok: true, text: "Password updated securely." });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        overline="SECURITY & PREFERENCES"
        title="Account Settings"
        subtitle="Credentials, alerts & storefront"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>BUSINESS OPERATIONS</Text>
          <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2, marginBottom: SPACING.sm }]}>
            Quarry Storefront Management
          </Text>
          <Button
            title="Edit Quarry Storefront & Capabilities"
            variant="outline"
            onPress={() => router.push("/seller/storefront")}
          />
        </Card>

        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>ACCOUNT SECURITY</Text>
          <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2, marginBottom: SPACING.sm }]}>
            Update Password
          </Text>
          {msg ? (
            <View style={[styles.alert, msg.ok ? styles.ok : styles.err]}>
              <Text style={[styles.alertText, { color: msg.ok ? "#15803D" : COLORS.error }]}>
                {msg.text}
              </Text>
            </View>
          ) : null}
          <Input label="New Password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <Input label="Confirm Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
          <Button title="Update Password" fullWidth loading={saving} onPress={handlePassword} />
        </Card>

        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>PUSH ALERTS</Text>
          <Text style={[TYPOGRAPHY.cardTitle, { marginTop: 2, marginBottom: SPACING.sm }]}>
            Real-Time RFQ & Order Alerts
          </Text>
          <Button
            title="Enable Device Notifications"
            variant="outline"
            onPress={async () => {
              const ok = await requestNotificationPermissions();
              setMsg({
                ok,
                text: ok ? "Lead alerts enabled." : "Permission declined in device settings.",
              });
            }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  alert: { padding: SPACING.sm, borderRadius: RADII.sm, marginBottom: SPACING.sm },
  ok: { backgroundColor: COLORS.successSoft },
  err: { backgroundColor: COLORS.errorSoft },
  alertText: { fontFamily: FONTS.bodyMedium, fontSize: 13 },
});
