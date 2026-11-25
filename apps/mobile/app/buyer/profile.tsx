import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS } from "../../src/theme/typography";
import { Button, Card, Input, ScreenHeader, SelectSheet } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { BUYER_TYPE_OPTIONS, decodeBuyerAddress } from "../../src/lib/domain-meta";
import { saveBuyerProfile } from "../../src/services/buyer.service";
import type { BusinessType } from "@stone/types";

export default function BuyerProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const meta = decodeBuyerAddress(profile?.address);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(meta.whatsappNumber);
  const [companyName, setCompanyName] = useState(meta.companyName);
  const [buyerType, setBuyerType] = useState<string>(meta.buyerType || "architect");
  const [city, setCity] = useState(profile?.city ?? "");
  const [stateName, setStateName] = useState(profile?.state ?? "");
  const [address, setAddress] = useState(meta.cleanAddress);
  const [pincode, setPincode] = useState(meta.pincode);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSave = async () => {
    if (!user?.id) return;
    setStatus(null);
    setSaving(true);
    try {
      await saveBuyerProfile(user.id, {
        fullName,
        phone,
        whatsappNumber,
        companyName,
        buyerType: buyerType as BusinessType,
        country: profile?.country || "IN",
        city,
        state: stateName,
        address,
        pincode,
      });
      await refreshProfile();
      setStatus({ ok: true, msg: "Buyer profile updated successfully." });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Failed to save profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScreenHeader title="Buyer Profile" subtitle={user?.email || undefined} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          {status ? (
            <View style={[styles.alert, status.ok ? styles.ok : styles.err]}>
              <Text style={[styles.alertText, { color: status.ok ? "#15803D" : COLORS.error }]}>
                {status.msg}
              </Text>
            </View>
          ) : null}

          <Input label="Full Name" required value={fullName} onChangeText={setFullName} />
          <Input label="Company / Practice Name" value={companyName} onChangeText={setCompanyName} />
          <SelectSheet
            label="Business Role"
            value={buyerType}
            options={BUYER_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
            onSelect={setBuyerType}
          />
          <Input label="Phone Number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Input label="WhatsApp Number" keyboardType="phone-pad" value={whatsappNumber} onChangeText={setWhatsappNumber} />
          <Input label="City" value={city} onChangeText={setCity} />
          <Input label="State" value={stateName} onChangeText={setStateName} />
          <Input label="Office / Site Address" multiline value={address} onChangeText={setAddress} />
          <Input label="PIN / Postal Code" value={pincode} onChangeText={setPincode} />

          <Button title="Save Buyer Profile" fullWidth loading={saving} onPress={handleSave} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  alert: { padding: SPACING.sm, borderRadius: RADII.sm, marginBottom: SPACING.md },
  ok: { backgroundColor: COLORS.successSoft },
  err: { backgroundColor: COLORS.errorSoft },
  alertText: { fontFamily: FONTS.bodyMedium, fontSize: 13 },
});
