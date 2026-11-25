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
import { registerSchema, type RegisterInput } from "@stone/validation";
import { COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import { Button, Card, Input } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { canAccessWorkspace } from "../../src/lib/role-utils";

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signUp = useAuthStore((s) => s.signUp);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      accountType: "buyer",
    },
  });

  const accountType = watch("accountType");

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    const res = await signUp(values);
    if (!res.ok) {
      setServerError(res.error || "Unable to create account.");
      return;
    }

    if (res.requiresOtp) {
      router.replace({
        pathname: "/(auth)/verify-otp",
        params: { email: values.email, type: "signup" },
      });
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
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBlock}>
          <Text style={TYPOGRAPHY.overline}>ENROLLMENT</Text>
          <Text style={[TYPOGRAPHY.heroTitle, styles.title]}>Create Your Account</Text>
          <Text style={TYPOGRAPHY.caption}>
            Choose your primary B2B trade role. Dual-role authorization is managed securely on the server.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.roleLabel}>I am registering as</Text>
          <Controller
            control={control}
            name="accountType"
            render={({ field: { onChange, value } }) => (
              <View style={styles.roleToggle}>
                <Pressable
                  onPress={() => onChange("buyer")}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === "buyer" }}
                  style={[
                    styles.roleOption,
                    value === "buyer" && styles.roleOptionActive,
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={value === "buyer" ? COLORS.white : COLORS.textPrimary}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      value === "buyer" && styles.roleTextActive,
                    ]}
                  >
                    Buyer / Architect
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onChange("seller")}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === "seller" }}
                  style={[
                    styles.roleOption,
                    value === "seller" && styles.roleOptionSeller,
                  ]}
                >
                  <Ionicons
                    name="layers-outline"
                    size={18}
                    color={value === "seller" ? COLORS.white : COLORS.textPrimary}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      value === "seller" && styles.roleTextActive,
                    ]}
                  >
                    Quarry / Seller
                  </Text>
                </Pressable>
              </View>
            )}
          />
          <Text style={styles.roleHelper}>
            {accountType === "seller"
              ? "Opens Quarry & Supplier Portal to list stone lots, reply to RFQs, and manage orders."
              : "Opens StonesDekho Sourcing Marketplace to discover blocks/slabs and request quotes."}
          </Text>

          {serverError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={accountType === "seller" ? "Owner / Contact Person Name" : "Full Name"}
                required
                placeholder="e.g. Vikram Singh Rathore"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
              />
            )}
          />

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
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
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
                placeholder="Minimum 10 characters"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                helperText="At least 10 characters with uppercase, lowercase, and a number."
              />
            )}
          />

          <Button
            title={
              accountType === "seller"
                ? "Create Quarry / Seller Account"
                : "Create Buyer Account"
            }
            fullWidth
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </Card>

        <View style={styles.footerRow}>
          <Pressable onPress={() => router.replace("/(auth)/sign-in")} style={styles.inlineBtn}>
            <Text style={styles.signInLink}>Already registered? Sign In →</Text>
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
  headerBlock: {
    marginBottom: SPACING.lg,
    gap: 6,
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
  },
  card: {
    padding: SPACING.lg,
  },
  roleLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  roleToggle: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  roleHelper: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  roleOption: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN + 4,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: SPACING.xs,
  },
  roleOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleOptionSeller: {
    backgroundColor: COLORS.deepGreen,
    borderColor: COLORS.deepGreen,
  },
  roleText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  roleTextActive: {
    color: COLORS.white,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.errorSoft,
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
  footerRow: {
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  inlineBtn: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
  },
  signInLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
});
