import React, { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { CATALOG_UNITS, type CatalogUnit } from "@stone/validation";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Button,
  Card,
  Input,
  SelectSheet,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import {
  STONE_COLOUR_SUGGESTIONS,
  STONE_FINISH_SUGGESTIONS,
  STONE_MATERIAL_SUGGESTIONS,
  UNIT_LABELS,
} from "../../../src/lib/domain-meta";
import { fetchVerifiedSuppliers } from "../../../src/services/catalog.service";
import { submitBuyerRfq } from "../../../src/services/buyer.service";
import type { PickedFileInput } from "../../../src/lib/storage-upload";

export default function BuyerRfqScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const params = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    sellerId?: string;
    sellerName?: string;
    material?: string;
  }>();

  const isProductMode = Boolean(params.productId);
  const suppliersQ = useQuery({
    queryKey: ["catalog", "suppliers", "rfq-picker"],
    queryFn: () => fetchVerifiedSuppliers(40),
  });

  const [selectedSellerId, setSelectedSellerId] = useState(params.sellerId ?? "");
  const [materialType, setMaterialType] = useState(params.material ?? "Marble");
  const [varietyColour, setVarietyColour] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<CatalogUnit>("sq_ft");
  const [thickness, setThickness] = useState("18 mm");
  const [finish, setFinish] = useState("Polished");
  const [dimensions, setDimensions] = useState("");
  const [deliveryCity, setDeliveryCity] = useState(profile?.city ?? "");
  const [deliveryState, setDeliveryState] = useState(profile?.state ?? "");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<PickedFileInput | null>(null);
  const [reviewStep, setReviewStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRequestIdRef = useRef(Crypto.randomUUID());

  const supplierOptions = useMemo(
    () =>
      (suppliersQ.data ?? []).map((s) => ({
        label: s.businessName,
        value: s.id,
        subtitle: [s.city, s.state].filter(Boolean).join(", "),
      })),
    [suppliersQ.data],
  );

  const pickAttachment = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setAttachment({
        uri: a.uri,
        fileName: a.name,
        mimeType: a.mimeType,
        fileSize: a.size,
      });
    }
  };

  const handleReview = () => {
    setError(null);
    if (!isProductMode && !selectedSellerId) {
      setError("Select a verified stone supplier to receive your RFQ.");
      return;
    }
    if (!materialType.trim() || !varietyColour.trim()) {
      setError("Specify stone category/material and variety/colour.");
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setError("Enter a valid required quantity greater than zero.");
      return;
    }
    if (!deliveryCity.trim() || deliveryCity.trim().length < 2) {
      setError("Enter the delivery city or port.");
      return;
    }
    setReviewStep(true);
  };

  const handleSubmit = async () => {
    if (!user?.id || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const title = isProductMode && params.productName
        ? `RFQ: ${params.productName}`
        : `${materialType} — ${varietyColour}`.slice(0, 180);

      const description =
        notes.trim().length >= 10
          ? notes.trim()
          : `Architectural sourcing request for ${quantity} ${UNIT_LABELS[unit]} of ${varietyColour} ${materialType} (${thickness}, ${finish}${dimensions ? `, ${dimensions}` : ""}).`;

      const res = await submitBuyerRfq({
        userId: user.id,
        input: {
          mode: isProductMode ? "product" : "general",
          clientRequestId: draftRequestIdRef.current,
          productId: params.productId ?? undefined,
          sellerId: isProductMode ? undefined : selectedSellerId ?? undefined,
          enquiryTitle: title,
          categorySlug: materialType.toLowerCase(),
          materialType,
          colour: varietyColour,
          finish,
          thickness,
          customSpecifications: dimensions ? `Format / Dimensions: ${dimensions}` : undefined,
          description,
          quantity: Number(quantity),
          unit,
          deliveryCountry: profile?.country || "IN",
          deliveryState: deliveryState || undefined,
          deliveryCity: deliveryCity.trim(),
          requiredDeliveryDate: targetDate.trim() || undefined,
          currency: "INR",
        },
        attachment,
      });

      draftRequestIdRef.current = Crypto.randomUUID();
      qc.invalidateQueries({ queryKey: ["buyer", "enquiries", user.id] });
      qc.invalidateQueries({ queryKey: ["buyer", "dashboard", user.id] });
      setReviewStep(false);
      router.push(`/buyer/enquiries/${res.enquiryId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RFQ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <Text style={TYPOGRAPHY.overline}>STREAMLINED B2B SOURCING</Text>
        <Text style={TYPOGRAPHY.screenTitle}>Request Quotation (RFQ)</Text>
        <Text style={TYPOGRAPHY.caption}>
          Buyer details automatically pulled from your profile ({profile?.full_name || user?.email}).
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {params.productName ? (
          <Card tone="beige" style={styles.contextCard}>
            <Text style={TYPOGRAPHY.overline}>SELECTED PRODUCT</Text>
            <Text style={TYPOGRAPHY.cardTitle}>{params.productName}</Text>
            {params.sellerName ? (
              <Text style={TYPOGRAPHY.caption}>Supplier: {params.sellerName}</Text>
            ) : null}
          </Card>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!reviewStep ? (
          <Card>
            {!isProductMode ? (
              <SelectSheet
                label="Verified Stone Supplier"
                required
                placeholder="Choose supplier or quarry"
                value={selectedSellerId}
                options={supplierOptions}
                onSelect={setSelectedSellerId}
              />
            ) : null}

            <SelectSheet
              label="Stone Material Category"
              required
              value={materialType}
              options={STONE_MATERIAL_SUGGESTIONS.map((m) => ({ label: m, value: m }))}
              onSelect={setMaterialType}
            />

            <Input
              label="Variety / Colour / Code"
              required
              placeholder="e.g. Agra Red, Statuario Venato, White"
              value={varietyColour}
              onChangeText={setVarietyColour}
            />

            <View style={styles.quickColours}>
              {STONE_COLOUR_SUGGESTIONS.slice(0, 6).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setVarietyColour((prev) => (prev ? prev : c))}
                  style={styles.miniChip}
                >
                  <Text style={styles.miniChipText}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Required Quantity"
                  required
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SelectSheet
                  label="Unit"
                  required
                  value={unit}
                  searchable={false}
                  options={CATALOG_UNITS.map((u) => ({
                    label: UNIT_LABELS[u],
                    value: u,
                  }))}
                  onSelect={(v) => setUnit(v as CatalogUnit)}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Slab Thickness"
                  required
                  placeholder="e.g. 18 mm, 20 mm"
                  value={thickness}
                  onChangeText={setThickness}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SelectSheet
                  label="Surface Finish"
                  required
                  value={finish}
                  options={STONE_FINISH_SUGGESTIONS.map((f) => ({ label: f, value: f }))}
                  onSelect={setFinish}
                />
              </View>
            </View>

            <Input
              label="Dimensions / Cut-to-Size Format"
              required
              placeholder="e.g. Gangsaw Slabs 2400x1200mm or 600x600 Tiles"
              value={dimensions}
              onChangeText={setDimensions}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Delivery City / Port"
                  required
                  placeholder="e.g. Gurugram"
                  value={deliveryCity}
                  onChangeText={setDeliveryCity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="State"
                  placeholder="e.g. Haryana"
                  value={deliveryState}
                  onChangeText={setDeliveryState}
                />
              </View>
            </View>

            <Input
              label="Target Delivery Date (Optional)"
              placeholder="YYYY-MM-DD"
              value={targetDate}
              onChangeText={setTargetDate}
              helperText="Optional — YYYY-MM-DD format"
            />

            <Input
              label="Project Notes (Optional)"
              multiline
              placeholder="Site unloading constraints, edge profile, packing specs..."
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.attachWrap}>
              <Text style={TYPOGRAPHY.label}>Reference Image or BOQ PDF (Optional)</Text>
              <Button
                title={attachment ? `Attached: ${attachment.fileName}` : "Attach Reference / BOQ"}
                variant="outline"
                size="sm"
                onPress={pickAttachment}
                leftIcon={<Ionicons name="attach" size={16} color={COLORS.primary} />}
              />
            </View>

            <Button title="Review RFQ Requirement" fullWidth onPress={handleReview} />
          </Card>
        ) : (
          <Card>
            <Text style={TYPOGRAPHY.overline}>REVIEW REQUIREMENT</Text>
            <Text style={[TYPOGRAPHY.sectionTitle, { marginTop: 4, marginBottom: SPACING.md }]}>
              Confirm Technical Specifications
            </Text>

            {[
              ["Material", materialType],
              ["Variety / Colour", varietyColour],
              ["Quantity", `${quantity} ${UNIT_LABELS[unit]}`],
              ["Thickness & Finish", `${thickness} · ${finish}`],
              ["Dimensions / Format", dimensions || "Standard supply"],
              ["Delivery Location", [deliveryCity, deliveryState].filter(Boolean).join(", ")],
              ["Target Date", targetDate || "Flexible"],
              ["Attachment", attachment?.fileName || "None"],
            ].map(([k, v]) => (
              <View key={k} style={styles.reviewRow}>
                <Text style={TYPOGRAPHY.caption}>{k}</Text>
                <Text style={styles.reviewVal}>{v}</Text>
              </View>
            ))}

            <View style={styles.reviewActions}>
              <Button
                title="Edit Details"
                variant="outline"
                onPress={() => setReviewStep(false)}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <Button
                title="Submit RFQ"
                loading={submitting}
                onPress={handleSubmit}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 2,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  contextCard: {
    gap: 4,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.errorSoft,
    padding: SPACING.sm,
    borderRadius: RADII.sm,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.error,
  },
  quickColours: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: -8,
    marginBottom: SPACING.md,
  },
  miniChip: {
    backgroundColor: COLORS.stoneBeige,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.xs,
  },
  miniChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  twoCol: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  attachWrap: {
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stoneBeige,
    gap: SPACING.md,
  },
  reviewVal: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: "right",
    flex: 1,
  },
  reviewActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
});
