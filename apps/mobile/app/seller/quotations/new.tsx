import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { CATALOG_UNITS, type CatalogUnit } from "@stone/validation";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import { Button, Card, Input, ScreenHeader, SelectSheet } from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { computeQuotationTotals, formatMoneyAmount, UNIT_LABELS } from "../../../src/lib/domain-meta";
import { saveSellerQuotation } from "../../../src/services/seller.service";

export default function SellerCreateQuotationScreen() {
  const params = useLocalSearchParams<{
    enquiryId?: string;
    title?: string;
    quantity?: string;
    unit?: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();
  const sellerProfile = useAuthStore((s) => s.sellerProfile);

  const [itemDesc, setItemDesc] = useState(params.title || "Natural Stone Supply");
  const [quantity, setQuantity] = useState(params.quantity || "100");
  const [unit, setUnit] = useState<CatalogUnit>((params.unit as CatalogUnit) || "sq_ft");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [shippingCharges, setShippingCharges] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [terms, setTerms] = useState(
    "Payment Terms: 100% via StonesDekho Escrow\nDelivery Terms: Ex-Works / Dispatch within 14 days",
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qtyNum = Number(quantity) || 0;
  const priceNum = Number(unitPrice) || 0;
  const taxNum = Number(taxAmount) || 0;
  const freightNum = Number(shippingCharges) || 0;

  let previewSubtotal = 0;
  let previewTotal = 0;
  try {
    const computed = computeQuotationTotals({
      items: [{ description: itemDesc || "Stone", quantity: Math.max(qtyNum, 0.01), unit, unitPrice: Math.max(priceNum, 0) }],
      taxAmount: taxNum,
      shippingCharges: freightNum,
    });
    previewSubtotal = computed.subtotal;
    previewTotal = computed.totalAmount;
  } catch {
    previewSubtotal = 0;
    previewTotal = 0;
  }

  const submit = async (sendImmediately: boolean) => {
    if (!sellerProfile || !params.enquiryId) return;
    setErr(null);
    setSaving(true);
    try {
      await saveSellerQuotation(sellerProfile.id, {
        enquiryId: params.enquiryId,
        items: [
          {
            productId: undefined,
            description: itemDesc,
            quantity: qtyNum,
            unit,
            unitPrice: priceNum,
          },
        ],
        taxAmount: taxNum,
        shippingCharges: freightNum,
        discountAmount: 0,
        currency: "INR",
        validUntil: validUntil.trim() || undefined,
        terms,
        sendImmediately,
      });
      qc.invalidateQueries({ queryKey: ["seller", "quotations", sellerProfile.id] });
      qc.invalidateQueries({ queryKey: ["seller", "lead", params.enquiryId] });
      qc.invalidateQueries({ queryKey: ["seller", "dashboard"] });
      router.back();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save quotation.");
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
        overline="COMMERCIAL COMPOSER"
        title="Prepare Quotation"
        subtitle={params.title || "B2B Stone Supply Quote"}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {err ? (
          <View style={styles.errBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errText}>{err}</Text>
          </View>
        ) : null}

        {/* Section 1: Scope & Rate */}
        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>1. STONE LOT & COMMERCIAL RATE</Text>
          <Text style={[TYPOGRAPHY.cardTitle, styles.sectionTitle]}>Material & Unit Pricing</Text>
          <Input label="Line Item Description" required value={itemDesc} onChangeText={setItemDesc} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Quantity" required keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
            </View>
            <View style={{ flex: 1 }}>
              <SelectSheet
                label="Unit"
                searchable={false}
                value={unit}
                options={CATALOG_UNITS.map((u) => ({ label: UNIT_LABELS[u], value: u }))}
                onSelect={(v) => setUnit(v as CatalogUnit)}
              />
            </View>
          </View>
          <Input
            label="Rate per Unit (INR)"
            required
            keyboardType="numeric"
            value={unitPrice}
            onChangeText={setUnitPrice}
            placeholder="e.g. 240"
          />
        </Card>

        {/* Section 2: Taxes, Freight & Validity */}
        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>2. TAXES, FREIGHT & VALIDITY</Text>
          <Text style={[TYPOGRAPHY.cardTitle, styles.sectionTitle]}>Logistics & Commercial Terms</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="GST / Taxes (INR)" keyboardType="numeric" value={taxAmount} onChangeText={setTaxAmount} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Freight / Crating (INR)" keyboardType="numeric" value={shippingCharges} onChangeText={setShippingCharges} />
            </View>
          </View>
          <Input
            label="Validity Date (YYYY-MM-DD)"
            value={validUntil}
            onChangeText={setValidUntil}
            placeholder="e.g. 2026-12-31"
          />
          <Input label="Payment & Delivery Terms" multiline value={terms} onChangeText={setTerms} />
        </Card>

        {/* Section 3: Live Commercial Summary */}
        <Card tone="deep" variant="command" style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>3. LIVE COMMERCIAL BREAKDOWN</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Material Subtotal</Text>
            <Text style={styles.breakdownVal}>{formatMoneyAmount(previewSubtotal, "INR")}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>GST & Taxes</Text>
            <Text style={styles.breakdownVal}>{formatMoneyAmount(taxNum, "INR")}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Freight & Crating</Text>
            <Text style={styles.breakdownVal}>{formatMoneyAmount(freightNum, "INR")}</Text>
          </View>

          <View style={styles.grandRow}>
            <View>
              <Text style={styles.grandLabel}>Grand Commercial Total</Text>
              <Text style={styles.escrowSub}>Settlement governed via Payment Model B</Text>
            </View>
            <Text style={styles.totalAmt}>{formatMoneyAmount(previewTotal, "INR")}</Text>
          </View>

          <View style={styles.actions}>
            <Button
              title="Save Draft"
              variant="outline"
              loading={saving}
              onPress={() => submit(false)}
              style={[styles.draftBtn, { flex: 1 }]}
            />
            <Button
              title="Send Quotation"
              variant="copper"
              loading={saving}
              onPress={() => submit(true)}
              style={{ flex: 1.3 }}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  sectionTitle: { marginTop: 2, marginBottom: SPACING.sm },
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.errorSoft,
    padding: SPACING.sm,
    borderRadius: RADII.sm,
  },
  errText: { flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.error },
  row: { flexDirection: "row", gap: SPACING.xs },
  summaryCard: { gap: SPACING.xs },
  summaryEyebrow: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.3,
    color: COLORS.accent,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  breakdownLabel: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.textOnDarkMuted },
  breakdownVal: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.sm,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.deepGreenBorder,
  },
  grandLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.white },
  escrowSub: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textOnDarkMuted, marginTop: 2 },
  totalAmt: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.accent,
    fontVariant: ["tabular-nums"],
  },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
  draftBtn: { backgroundColor: COLORS.surface, borderColor: COLORS.borderStrong },
});
