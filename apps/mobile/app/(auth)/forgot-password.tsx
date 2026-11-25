import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card, Input, ScreenHeader } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid business email address.");
      return;
    }
    setLoading(true);
    const res = await sendPasswordReset(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Unable to send password recovery email.");
      return;
    }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScreenHeader title="Reset Password" subtitle="Email Account Recovery" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={TYPOGRAPHY.sectionTitle}>Recover Access</Text>
          <Text style={[TYPOGRAPHY.caption, styles.desc]}>
            Enter the email address associated with your StonesDekho account. We will send a recovery link and OTP code.
          </Text>

          {error ? (
            <View style={styles.errBox}>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          {sent ? (
            <View style={styles.okBox}>
              <Text style={styles.okText}>
                Recovery instructions sent to {email.trim().toLowerCase()}. Check your inbox to reset your password or verify with OTP.
              </Text>
              <Button
                title="Enter Email OTP Code"
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: "/(auth)/verify-otp",
                    params: { email: email.trim().toLowerCase(), type: "recovery" },
                  })
                }
                style={{ marginTop: SPACING.md }}
              />
            </View>
          ) : (
            <>
              <Input
                label="Registered Email"
                required
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@company.com"
                value={email}
                onChangeText={setEmail}
              />
              <Button
                title="Send Recovery Email"
                fullWidth
                loading={loading}
                onPress={handleReset}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  desc: { marginTop: 6, marginBottom: SPACING.md },
  errBox: {
    backgroundColor: COLORS.errorSoft,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.error },
  okBox: {
    backgroundColor: COLORS.successSoft,
    borderRadius: RADII.sm,
    padding: SPACING.md,
  },
  okText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: "#15803D" },
});
