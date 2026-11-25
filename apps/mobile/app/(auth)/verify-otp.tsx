import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card, Input, ScreenHeader } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { canAccessWorkspace } from "../../src/lib/role-utils";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; type?: string }>();
  const verifyEmailOtp = useAuthStore((s) => s.verifyEmailOtp);

  const [email, setEmail] = useState(params.email ?? "");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpType =
    params.type === "recovery" ? "recovery" : params.type === "signup" ? "signup" : "email";

  const handleVerify = async () => {
    setError(null);
    if (!email.includes("@") || token.trim().length < 6) {
      setError("Enter your email and the 6-digit verification code.");
      return;
    }
    setLoading(true);
    const res = await verifyEmailOtp(email, token, otpType);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Invalid or expired OTP code.");
      return;
    }
    const { roles, activeWorkspace } = useAuthStore.getState();
    if (activeWorkspace === "seller" && canAccessWorkspace(roles, "seller")) {
      router.replace("/seller/(tabs)");
    } else {
      router.replace("/buyer/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScreenHeader title="Email Verification" subtitle="6-Digit OTP Verification" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={TYPOGRAPHY.sectionTitle}>Enter Verification Code</Text>
          <Text style={[TYPOGRAPHY.caption, styles.desc]}>
            Enter the 6-digit verification code sent to your email address.
          </Text>

          {error ? (
            <View style={styles.errBox}>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email Address"
            required
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="6-Digit OTP Code"
            required
            keyboardType="number-pad"
            maxLength={8}
            placeholder="000000"
            value={token}
            onChangeText={setToken}
          />

          <Button
            title="Verify & Continue"
            fullWidth
            loading={loading}
            onPress={handleVerify}
          />
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
});
