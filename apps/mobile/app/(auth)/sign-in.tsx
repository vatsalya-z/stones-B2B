import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { loginSchema, type LoginInput } from "@stone/validation";
import { COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card, Input } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { canAccessWorkspace } from "../../src/lib/role-utils";
import { DEV_QA_ACCOUNTS } from "../../src/lib/dev-demo-accounts";

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((s) => s.signIn);
  const authError = useAuthStore((s) => s.authError);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [quickTarget, setQuickTarget] = useState<"buyer" | "seller" | null>(null);
  const visibleError = serverError || authError;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    const res = await signIn(values.email, values.password);
    if (!res.ok) {
      setServerError(res.error || "Unable to sign in.");
      return;
    }
    const { roles, activeWorkspace } = useAuthStore.getState();
    if (activeWorkspace === "seller" && canAccessWorkspace(roles, "seller")) {
      router.replace("/seller/(tabs)");
    } else {
      router.replace("/buyer/(tabs)");
    }
  };

  const handleAutoFill = (target: "buyer" | "seller") => {
    const acct = DEV_QA_ACCOUNTS[target];
    setServerError(null);
    setValue("email", acct.email, { shouldValidate: true });
    setValue("password", acct.password, { shouldValidate: true });
  };

  const handleQuickLogin = async (target: "buyer" | "seller") => {
    const acct = DEV_QA_ACCOUNTS[target];
    handleAutoFill(target);
    setQuickTarget(target);
    try {
      await onSubmit({ email: acct.email, password: acct.password });
    } finally {
      setQuickTarget(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <Text style={TYPOGRAPHY.overline}>ARCHITECTURAL B2B STONE TRADE</Text>
          <Text style={[TYPOGRAPHY.heroTitle, styles.brandTitle]}>Welcome back to StonesDekho</Text>
          <Text style={[TYPOGRAPHY.caption, styles.brandSub]}>
            Sign in with your Buyer, Architect, or Quarry Supplier account.
          </Text>
        </View>

        <Card style={styles.card}>
          {visibleError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{visibleError}</Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Business Email"
                required
                placeholder="name@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                leftAdornment={<Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                required
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                leftAdornment={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />}
                rightAdornment={
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={10}
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </Pressable>
                }
              />
            )}
          />

          <View style={styles.linkRow}>
            <Pressable
              onPress={() => router.push("/(auth)/forgot-password")}
              style={styles.inlineBtn}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(auth)/verify-otp")}
              style={styles.inlineBtn}
            >
              <Text style={styles.linkText}>Verify Email OTP</Text>
            </Pressable>
          </View>

          <Button
            title="Sign In"
            fullWidth
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />

          <View style={styles.phoneNotice}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.phoneNoticeText}>
              Phone SMS OTP sign-in is disabled on the backend; use your registered business email.
            </Text>
          </View>
        </Card>

        {__DEV__ ? (
          <Card tone="ivory" style={styles.quickCard}>
            <Text style={TYPOGRAPHY.overline}>DEV QUICK ACCESS · ONE-CLICK LOGIN</Text>
            <Text style={[TYPOGRAPHY.caption, styles.quickSub]}>
              Auto-fills credentials and signs directly into Buyer Marketplace or Seller Portal.
            </Text>

            <View style={styles.quickBtns}>
              <Button
                title={DEV_QA_ACCOUNTS.buyer.label}
                fullWidth
                loading={quickTarget === "buyer"}
                disabled={isSubmitting || quickTarget !== null}
                leftIcon={<Ionicons name="business-outline" size={18} color={COLORS.white} />}
                onPress={() => {
                  void handleQuickLogin("buyer");
                }}
              />
              <Button
                title={DEV_QA_ACCOUNTS.seller.label}
                variant="copper"
                fullWidth
                loading={quickTarget === "seller"}
                disabled={isSubmitting || quickTarget !== null}
                leftIcon={<Ionicons name="layers-outline" size={18} color={COLORS.white} />}
                onPress={() => {
                  void handleQuickLogin("seller");
                }}
              />
            </View>

            <View style={styles.fillRow}>
              <Pressable
                onPress={() => handleAutoFill("buyer")}
                style={styles.fillChip}
                accessibilityRole="button"
              >
                <Text style={styles.fillChipText}>Fill Buyer ({DEV_QA_ACCOUNTS.buyer.email})</Text>
              </Pressable>
              <Pressable
                onPress={() => handleAutoFill("seller")}
                style={styles.fillChip}
                accessibilityRole="button"
              >
                <Text style={styles.fillChipText}>Fill Seller ({DEV_QA_ACCOUNTS.seller.email})</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={TYPOGRAPHY.caption}>New to StonesDekho?</Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-up")}
            style={styles.inlineBtn}
          >
            <Text style={styles.registerText}>Create Buyer or Seller Account →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    justifyContent: "center",
  },
  brandBlock: {
    marginBottom: SPACING.lg,
  },
  brandTitle: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 35,
  },
  brandSub: {
    marginTop: 6,
  },
  card: {
    padding: SPACING.lg,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.errorSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.error,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  inlineBtn: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
  },
  linkText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.primary,
  },
  phoneNotice: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: COLORS.stoneBeige,
    padding: SPACING.xs,
    borderRadius: RADII.sm,
  },
  phoneNoticeText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  footerRow: {
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  registerText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  quickCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderColor: COLORS.accent,
  },
  quickSub: {
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
  quickBtns: {
    gap: SPACING.xs,
  },
  fillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  fillChip: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 6,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.stoneBeige,
  },
  fillChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.deepGreen,
  },
});
