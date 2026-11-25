import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { buyerPasswordChangeSchema } from "@stone/validation";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card, Input, ScreenHeader } from "../../src/components/ui";
import { supabase } from "../../src/lib/supabase";
import { requestNotificationPermissions } from "../../src/lib/notifications";

export default function BuyerSettingsScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handlePasswordUpdate = async () => {
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
      <ScreenHeader title="Account Settings" subtitle="Security & device preferences" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.sm }]}>Change Password</Text>
          {msg ? (
            <View style={[styles.alert, msg.ok ? styles.ok : styles.err]}>
              <Text style={[styles.alertText, { color: msg.ok ? "#15803D" : COLORS.error }]}>
                {msg.text}
              </Text>
            </View>
          ) : null}
          <Input
            label="New Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            helperText="Min 10 characters with uppercase, lowercase, and number."
          />
          <Input
            label="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Button title="Update Password" fullWidth loading={saving} onPress={handlePasswordUpdate} />
        </Card>

        <Card>
          <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: 4 }]}>Trade Notifications</Text>
          <Text style={[TYPOGRAPHY.caption, { marginBottom: SPACING.sm }]}>
            Enable alerts for incoming supplier quotations and direct messages.
          </Text>
          <Button
            title="Enable Device Notifications"
            variant="outline"
            onPress={async () => {
              const granted = await requestNotificationPermissions();
              setMsg({
                ok: granted,
                text: granted
                  ? "Device notifications enabled."
                  : "Notification permission declined in system settings.",
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
  content: { padding: SPACING.md, gap: SPACING.md },
  alert: { padding: SPACING.sm, borderRadius: RADII.sm, marginBottom: SPACING.sm },
  ok: { backgroundColor: COLORS.successSoft },
  err: { backgroundColor: COLORS.errorSoft },
  alertText: { fontFamily: FONTS.bodyMedium, fontSize: 13 },
});
