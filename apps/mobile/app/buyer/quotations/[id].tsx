import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Input,
  ListScreenSkeleton,
  QuotationStatusBadge,
  ScreenHeader,
} from "../../../src/components/ui";
import { PaymentGovernanceBanner } from "../../../src/components/stone";
import { useAuthStore } from "../../../src/store/auth-store";
import {
  acceptQuotationAndCreateOrder,
  decideBuyerQuotation,
  fetchBuyerAddresses,
  fetchBuyerQuotationDetail,
} from "../../../src/services/buyer.service";
import {
  formatDateShort,
  formatMoneyAmount,
  formatUnitLabel,
  getBuyerQuotationActionEligibility,
} from "../../../src/lib/domain-meta";
import type { QuotationStatus } from "@stone/types";

export default function BuyerQuotationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [contactName, setContactName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState(profile?.city ?? "");
  const [stateName, setStateName] = useState(profile?.state ?? "");
  const [pincode, setPincode] = useState("");

  const q = useQuery({
    queryKey: ["buyer", "quotation", id],
    queryFn: () => fetchBuyerQuotationDetail(user!.id, id!),
    enabled: Boolean(user?.id && id),
  });

  const addrQ = useQuery({
    queryKey: ["buyer", "addresses", user?.id],
    queryFn: () => fetchBuyerAddresses(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    const def = addrQ.data?.[0];
    if (def && !addressLine1) {
      setContactName(def.contact_name);
      setPhone(def.phone);
      setAddressLine1(def.address_line1);
      setCity(def.city);
      setStateName(def.state);
      setPincode(def.pincode);
    }
  }, [addrQ.data, addressLine1]);

  useEffect(() => {
    if (q.data?.quotation.status === "sent" && user?.id && id) {
      decideBuyerQuotation(user.id, id, "viewed").catch(() => undefined);
    }
  }, [q.data?.quotation.status, user?.id, id]);

  if (q.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Quotation Details" />
        <ListScreenSkeleton />
      </View>
    );
  }

  const data = q.data;
  if (!data) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Quotation Details" />
        <ErrorState title="Quotation not found" onRetry={() => q.refetch()} />
      </View>
    );
  }

  const { quotation, items, seller, enquiry } = data;
  const eligibility = getBuyerQuotationActionEligibility(
    quotation.status as QuotationStatus,
    quotation.valid_until,
  );

  const handleAcceptOrder = async () => {
    if (!user?.id) return;
    setErrMsg(null);
    setBusy(true);
    try {
      const orderId = await acceptQuotationAndCreateOrder(user.id, {
        quotationId: quotation.id,
        billingAddress: {
          contactName,
          phone,
          addressLine1,
          city,
          state: stateName,
          pincode,
          country: "IN",
        },
        sameAsBilling: true,
        saveAddresses: addrQ.data?.length === 0,
      });
      qc.invalidateQueries({ queryKey: ["buyer", "quotations", user.id] });
      qc.invalidateQueries({ queryKey: ["buyer", "orders", user.id] });
      setAcceptOpen(false);
      router.replace(`/buyer/orders/${orderId}`);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Failed to accept quotation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={quotation.quote_number}
        subtitle={seller?.business_name || "Supplier Quotation"}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.topRow}>
            <Text style={TYPOGRAPHY.sectionTitle}>{seller?.business_name || "Verified Supplier"}</Text>
            <QuotationStatusBadge status={quotation.status} />
          </View>
          {enquiry ? (
            <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>
              For: {enquiry.enquiry_title}
            </Text>
          ) : null}
          <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>
            Validity: {formatDateShort(quotation.valid_until)}
          </Text>
        </Card>

        <Card>
          <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs }]}>Line Items</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <Text style={styles.lineTitle}>{item.description}</Text>
              <View style={styles.lineMeta}>
                <Text style={TYPOGRAPHY.caption}>
                  {item.quantity} {formatUnitLabel(item.unit)} ×{" "}
                  {formatMoneyAmount(item.unit_price, quotation.currency)}
                </Text>
                <Text style={styles.lineTotal}>
                  {formatMoneyAmount(item.total_price, quotation.currency)}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.totals}>
            <View style={styles.totRow}>
              <Text style={TYPOGRAPHY.caption}>Subtotal</Text>
              <Text style={TYPOGRAPHY.bodyMedium}>
                {formatMoneyAmount(quotation.subtotal, quotation.currency)}
              </Text>
            </View>
            <View style={styles.totRow}>
              <Text style={TYPOGRAPHY.caption}>Taxes</Text>
              <Text style={TYPOGRAPHY.bodyMedium}>
                {formatMoneyAmount(quotation.tax_amount, quotation.currency)}
              </Text>
            </View>
            <View style={styles.totRow}>
              <Text style={TYPOGRAPHY.caption}>Freight / Shipping</Text>
              <Text style={TYPOGRAPHY.bodyMedium}>
                {formatMoneyAmount(quotation.shipping_charges, quotation.currency)}
              </Text>
            </View>
            <View style={[styles.totRow, styles.grandRow]}>
              <Text style={TYPOGRAPHY.cardTitle}>Total Commercial Value</Text>
              <Text style={styles.grandVal}>
                {formatMoneyAmount(quotation.total_amount, quotation.currency)}
              </Text>
            </View>
          </View>
        </Card>

        {quotation.terms ? (
          <Card>
            <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: 4 }]}>Commercial Terms</Text>
            <Text style={TYPOGRAPHY.body}>{quotation.terms}</Text>
          </Card>
        ) : null}

        <PaymentGovernanceBanner role="buyer" />

        {eligibility.ineligibleReason ? (
          <Card tone="beige">
            <Text style={TYPOGRAPHY.caption}>{eligibility.ineligibleReason}</Text>
          </Card>
        ) : null}

        {eligibility.canAccept || eligibility.canReject ? (
          <View style={styles.actions}>
            {eligibility.canReject ? (
              <Button
                title="Decline Quote"
                variant="outline"
                onPress={() => setRejectOpen(true)}
                style={{ flex: 1 }}
              />
            ) : null}
            {eligibility.canAccept ? (
              <Button
                title="Accept & Create Order"
                onPress={() => setAcceptOpen(true)}
                style={{ flex: 1.4 }}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Accept & Confirm Order Addresses */}
      <BottomSheet
        visible={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Confirm Billing & Delivery"
        subtitle="Creates an order awaiting Payment Model B escrow verification"
        footer={
          <Button
            title="Confirm Order Initiation"
            fullWidth
            loading={busy}
            onPress={handleAcceptOrder}
          />
        }
      >
        {errMsg ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{errMsg}</Text>
          </View>
        ) : null}
        <Input label="Contact Name" required value={contactName} onChangeText={setContactName} />
        <Input
          label="Phone Number"
          required
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="10+ digit phone"
        />
        <Input
          label="Address Line 1"
          required
          value={addressLine1}
          onChangeText={setAddressLine1}
          placeholder="Site / Office street address"
        />
        <Input label="City" required value={city} onChangeText={setCity} />
        <Input label="State" required value={stateName} onChangeText={setStateName} />
        <Input
          label="PIN Code"
          required
          keyboardType="number-pad"
          value={pincode}
          onChangeText={setPincode}
          placeholder="6-digit Indian PIN"
        />
      </BottomSheet>

      <ConfirmDialog
        visible={rejectOpen}
        title="Decline Quotation?"
        message="The supplier will be notified that you declined this quote and may submit a revised quotation."
        confirmLabel="Decline Quote"
        destructive
        loading={busy}
        onCancel={() => setRejectOpen(false)}
        onConfirm={async () => {
          if (!user?.id || !id) return;
          setBusy(true);
          try {
            await decideBuyerQuotation(user.id, id, "rejected");
            qc.invalidateQueries({ queryKey: ["buyer", "quotation", id] });
            qc.invalidateQueries({ queryKey: ["buyer", "quotations", user.id] });
          } finally {
            setBusy(false);
            setRejectOpen(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACING.xs },
  lineItem: { paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.stoneBeige, gap: 4 },
  lineTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  lineMeta: { flexDirection: "row", justifyContent: "space-between" },
  lineTotal: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  totals: { marginTop: SPACING.sm, gap: 6 },
  totRow: { flexDirection: "row", justifyContent: "space-between" },
  grandRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  grandVal: { fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.primary },
  actions: { flexDirection: "row", gap: SPACING.sm },
  errBox: { backgroundColor: COLORS.errorSoft, padding: SPACING.sm, borderRadius: RADII.sm, marginBottom: SPACING.sm },
  errText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.error },
});
