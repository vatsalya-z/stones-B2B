import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { BUSINESS_TYPES, type BusinessType } from "@stone/types";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import { Badge, Button, Card, Input, ScreenHeader, SelectSheet } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import {
  BUSINESS_TYPE_LABELS,
  decodeSellerDescription,
} from "../../src/lib/domain-meta";
import { resolveStorageImageUrl } from "../../src/theme/assets";
import { saveSellerBusinessProfile } from "../../src/services/seller.service";
import type { PickedFileInput } from "../../src/lib/storage-upload";

export default function SellerStorefrontScreen() {
  const user = useAuthStore((s) => s.user);
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const meta = decodeSellerDescription(sellerProfile?.description);
  const [businessName, setBusinessName] = useState(sellerProfile?.business_name ?? "");
  const [businessType, setBusinessType] = useState<BusinessType>(
    sellerProfile?.business_type ?? "mine_owner",
  );
  const [ownerName, setOwnerName] = useState(sellerProfile?.owner_name ?? "");
  const [businessEmail, setBusinessEmail] = useState(
    sellerProfile?.business_email ?? user?.email ?? "",
  );
  const [phone, setPhone] = useState(sellerProfile?.phone ?? "");
  const [gstNumber, setGstNumber] = useState(sellerProfile?.gst_number ?? "");
  const [address, setAddress] = useState(sellerProfile?.business_address ?? "");
  const [city, setCity] = useState(sellerProfile?.city ?? "");
  const [stateName, setStateName] = useState(sellerProfile?.state ?? "");
  const [pincode, setPincode] = useState(sellerProfile?.pincode ?? "");
  const [yearsInBusiness, setYearsInBusiness] = useState(
    sellerProfile?.years_in_business ? String(sellerProfile.years_in_business) : "",
  );
  const [description, setDescription] = useState(meta.cleanDescription);
  const [hasQuarry, setHasQuarry] = useState(meta.hasQuarry);
  const [hasManufacturing, setHasManufacturing] = useState(meta.hasManufacturing);
  const [hasExport, setHasExport] = useState(meta.hasExport);
  const [logoFile, setLogoFile] = useState<PickedFileInput | null>(null);
  const [coverFile, setCoverFile] = useState<PickedFileInput | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const existingCover = resolveStorageImageUrl(
    sellerProfile?.cover_image_url,
    "seller-cover-images",
  );

  const pickImage = async (target: "logo" | "cover") => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      const file = {
        uri: a.uri,
        mimeType: a.mimeType || "image/jpeg",
        fileName: a.fileName || `${target}.jpg`,
        fileSize: a.fileSize ?? null,
      };
      if (target === "logo") setLogoFile(file);
      else setCoverFile(file);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setMsg(null);
    setSaving(true);
    try {
      await saveSellerBusinessProfile({
        userId: user.id,
        existingSeller: sellerProfile,
        input: {
          businessName,
          businessType,
          ownerName,
          businessEmail,
          phone,
          gstNumber,
          businessAddress: address,
          city,
          state: stateName,
          country: "IN",
          pincode,
          yearsInBusiness: yearsInBusiness || null,
          description,
          hasQuarry,
          hasManufacturing,
          hasExport,
          productCategories: [],
          showWebsitePublicly: true,
          acceptBulkExportEnquiries: true,
        },
        logoFile,
        coverFile,
      });
      await refreshProfile();
      setMsg({ ok: true, text: "Storefront & quarry profile saved." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Unable to save profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScreenHeader
        overline="SUPPLIER IDENTITY"
        title="Storefront Profile"
        rightSlot={
          <Button
            title={previewMode ? "Edit" : "Preview"}
            variant="ghost"
            size="sm"
            onPress={() => setPreviewMode((p) => !p)}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {previewMode ? (
          <Card variant="command">
            {(coverFile?.uri || existingCover) ? (
              <Image
                source={{ uri: coverFile?.uri || existingCover || "" }}
                contentFit="cover"
                style={styles.cover}
              />
            ) : null}
            <Text style={TYPOGRAPHY.eyebrow}>PUBLIC STOREFRONT PREVIEW</Text>
            <Text style={[TYPOGRAPHY.sectionTitle, { marginTop: 4 }]}>
              {businessName || "Your Stone Business"}
            </Text>
            <Text style={TYPOGRAPHY.caption}>
              {BUSINESS_TYPE_LABELS[businessType]} · {[city, stateName].filter(Boolean).join(", ")}
            </Text>
            <View style={styles.capsRow}>
              {hasQuarry ? <Badge label="Direct Quarry Owner" tone="copper" /> : null}
              {hasManufacturing ? <Badge label="Processing Mill" tone="neutral" /> : null}
              {hasExport ? <Badge label="Export Ready" tone="info" /> : null}
            </View>
            {description ? (
              <Text style={[TYPOGRAPHY.body, { marginTop: SPACING.sm }]}>{description}</Text>
            ) : null}
          </Card>
        ) : (
          <View style={styles.formStack}>
            {msg ? (
              <View style={[styles.alert, msg.ok ? styles.ok : styles.err]}>
                <Text style={[styles.alertText, { color: msg.ok ? "#15803D" : COLORS.error }]}>
                  {msg.text}
                </Text>
              </View>
            ) : null}

            <Card variant="elevated">
              <Text style={TYPOGRAPHY.eyebrow}>1. BRAND MEDIA & CLASSIFICATION</Text>
              <View style={styles.mediaBtns}>
                <Button
                  title={logoFile ? "Logo Selected ✓" : "Upload Logo"}
                  variant="outline"
                  size="sm"
                  onPress={() => pickImage("logo")}
                  style={{ flex: 1 }}
                />
                <Button
                  title={coverFile ? "Cover Selected ✓" : "Upload Cover"}
                  variant="outline"
                  size="sm"
                  onPress={() => pickImage("cover")}
                  style={{ flex: 1 }}
                />
              </View>
              <Input label="Company / Quarry Name" required value={businessName} onChangeText={setBusinessName} />
              <SelectSheet
                label="Business Classification"
                required
                value={businessType}
                options={BUSINESS_TYPES.map((bt) => ({ label: BUSINESS_TYPE_LABELS[bt], value: bt }))}
                onSelect={(v) => setBusinessType(v as BusinessType)}
              />
              <Input label="Owner / Director Name" value={ownerName} onChangeText={setOwnerName} />
            </Card>

            <Card variant="elevated">
              <Text style={TYPOGRAPHY.eyebrow}>2. COMMERCIAL CONTACT & LOCATION</Text>
              <View style={{ height: SPACING.xs }} />
              <Input label="Commercial Email" required keyboardType="email-address" autoCapitalize="none" value={businessEmail} onChangeText={setBusinessEmail} />
              <Input label="Phone Number" required keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              <Input label="15-Digit GSTIN" autoCapitalize="characters" value={gstNumber} onChangeText={setGstNumber} placeholder="e.g. 08AABCU9603R1ZM" />
              <Input label="Quarry / Factory Address" required value={address} onChangeText={setAddress} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="City" required value={city} onChangeText={setCity} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="State" required value={stateName} onChangeText={setStateName} />
                </View>
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="PIN Code" required keyboardType="number-pad" value={pincode} onChangeText={setPincode} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Years in Business" keyboardType="numeric" value={yearsInBusiness} onChangeText={setYearsInBusiness} />
                </View>
              </View>
            </Card>

            <Card variant="elevated">
              <Text style={TYPOGRAPHY.eyebrow}>3. QUARRY & MILL CAPABILITIES</Text>
              <View style={{ height: SPACING.xs }} />
              <Input
                label="About Your Quarry / Processing Facility"
                multiline
                value={description}
                onChangeText={setDescription}
              />

              {[
                ["Direct Quarry / Mine Ownership", hasQuarry, setHasQuarry] as const,
                ["In-House Gangsaw / Processing Mill", hasManufacturing, setHasManufacturing] as const,
                ["Export & Container Loading", hasExport, setHasExport] as const,
              ].map(([label, val, setter]) => (
                <View key={label} style={styles.switchRow}>
                  <Text style={TYPOGRAPHY.label}>{label}</Text>
                  <Switch
                    value={val}
                    onValueChange={setter}
                    trackColor={{ true: COLORS.primary, false: COLORS.borderStrong }}
                  />
                </View>
              ))}
            </Card>

            <Button
              title="Save Business Storefront"
              fullWidth
              loading={saving}
              onPress={handleSave}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  formStack: { gap: SPACING.md },
  cover: { width: "100%", height: 156, borderRadius: RADII.sm, marginBottom: SPACING.sm },
  capsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: SPACING.sm },
  alert: { padding: SPACING.sm, borderRadius: RADII.sm },
  ok: { backgroundColor: COLORS.successSoft },
  err: { backgroundColor: COLORS.errorSoft },
  alertText: { fontFamily: FONTS.bodyMedium, fontSize: 13 },
  mediaBtns: { flexDirection: "row", gap: SPACING.xs, marginTop: SPACING.xs, marginBottom: SPACING.md },
  row: { flexDirection: "row", gap: SPACING.xs },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
});
