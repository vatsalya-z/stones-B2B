import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { COLORS, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Button,
  Card,
  ConfirmDialog,
  EnquiryStatusBadge,
  ErrorState,
  ListScreenSkeleton,
  QuotationStatusBadge,
  ScreenHeader,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import {
  fetchBuyerEnquiryDetail,
  transitionBuyerEnquiry,
} from "../../../src/services/buyer.service";
import { startOrOpenConversation } from "../../../src/services/messaging.service";
import {
  decodeRfqDescription,
  formatDateShort,
  formatMoneyAmount,
  formatUnitLabel,
  getAllowedBuyerEnquiryTransitions,
} from "../../../src/lib/domain-meta";
import type { EnquiryStatus } from "@stone/types";

export default function BuyerEnquiryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [confirmAction, setConfirmAction] = useState<{ status: "cancelled" | "closed"; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["buyer", "enquiry", id],
    queryFn: () => fetchBuyerEnquiryDetail(user!.id, id!),
    enabled: Boolean(user?.id && id),
  });

  if (q.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Enquiry Details" />
        <ListScreenSkeleton />
      </View>
    );
  }

  const data = q.data;
  if (!data) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Enquiry Details" />
        <ErrorState title="Enquiry not found" onRetry={() => q.refetch()} />
      </View>
    );
  }

  const { enquiry, seller, history, quotations } = data;
  const decoded = decodeRfqDescription(enquiry.description);
  const allowed = getAllowedBuyerEnquiryTransitions(enquiry.status as EnquiryStatus);

  const handleMessageSupplier = async () => {
    if (!seller || !user?.id) return;
    const convId = await startOrOpenConversation({
      sellerId: seller.id,
      enquiryId: enquiry.id,
      subject: enquiry.enquiry_title,
      callerRole: "buyer",
      userId: user.id,
    });
    router.push(`/buyer/chat/${convId}`);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Enquiry Details"
        subtitle={seller ? seller.business_name : "Broadcast RFQ"}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.topRow}>
            <Text style={[TYPOGRAPHY.sectionTitle, { flex: 1 }]}>{enquiry.enquiry_title}</Text>
            <EnquiryStatusBadge status={enquiry.status} />
          </View>
          <Text style={[TYPOGRAPHY.caption, { marginTop: 6 }]}>
            Quantity: {enquiry.quantity} {formatUnitLabel(enquiry.unit)} · Delivery:{" "}
            {enquiry.delivery_location || "Not specified"}
          </Text>
          {enquiry.required_delivery_date ? (
            <Text style={TYPOGRAPHY.caption}>
              Target Delivery: {formatDateShort(enquiry.required_delivery_date)}
            </Text>
          ) : null}
          {decoded.cleanDescription ? (
            <Text style={[TYPOGRAPHY.body, { marginTop: SPACING.sm }]}>
              {decoded.cleanDescription}
            </Text>
          ) : null}

          {seller ? (
            <Button
              title="Message Supplier"
              variant="outline"
              size="sm"
              onPress={handleMessageSupplier}
              style={{ marginTop: SPACING.md }}
            />
          ) : null}
        </Card>

        {decoded.isRfq ? (
          <Card>
            <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs }]}>
              Stone Specifications
            </Text>
            {[
              ["Material", decoded.materialType],
              ["Colour", decoded.colour],
              ["Finish", decoded.finish],
              ["Thickness", decoded.thickness],
              ["Origin", decoded.stoneOrigin],
              ["Custom Specs", decoded.customSpecifications],
            ]
              .filter((r): r is [string, string] => Boolean(r[1]))
              .map(([k, v]) => (
                <View key={k} style={styles.specRow}>
                  <Text style={TYPOGRAPHY.caption}>{k}</Text>
                  <Text style={styles.specVal}>{v}</Text>
                </View>
              ))}
          </Card>
        ) : null}

        <Card>
          <View style={styles.topRow}>
            <Text style={TYPOGRAPHY.cardTitle}>Supplier Quotations ({quotations.length})</Text>
            {quotations.length >= 2 ? (
              <Pressable onPress={() => router.push("/buyer/quotations/compare")}>
                <Text style={styles.compareLink}>Compare</Text>
              </Pressable>
            ) : null}
          </View>

          {quotations.length === 0 ? (
            <Text style={[TYPOGRAPHY.caption, { marginTop: 6 }]}>
              No quotations received yet. Verified suppliers respond here once reviewed.
            </Text>
          ) : (
            <View style={{ gap: SPACING.xs, marginTop: SPACING.sm }}>
              {quotations.map((quo) => (
                <Pressable
                  key={quo.id}
                  onPress={() => router.push(`/buyer/quotations/${quo.id}`)}
                  style={styles.quoteRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quoteNum}>{quo.quote_number}</Text>
                    <Text style={TYPOGRAPHY.caption}>{quo.sellerName}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.quoteAmt}>
                      {formatMoneyAmount(quo.total_amount, quo.currency)}
                    </Text>
                    <QuotationStatusBadge status={quo.status} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        {history.length > 0 ? (
          <Card>
            <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs }]}>Status Timeline</Text>
            {history.map((h) => (
              <View key={h.id} style={styles.histRow}>
                <Text style={styles.histTitle}>
                  {h.new_status.toUpperCase()} · {formatDateShort(h.created_at)}
                </Text>
                {h.notes ? <Text style={TYPOGRAPHY.caption}>{h.notes}</Text> : null}
              </View>
            ))}
          </Card>
        ) : null}

        {allowed.map((act) => (
          <Button
            key={act.status}
            title={act.label}
            variant={act.destructive ? "danger" : "outline"}
            onPress={() => setConfirmAction(act)}
          />
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={Boolean(confirmAction)}
        title={confirmAction?.label ?? "Confirm"}
        message="This will permanently update the enquiry status in StonesDekho."
        destructive={confirmAction?.status === "cancelled"}
        loading={busy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction || !id) return;
          setBusy(true);
          try {
            await transitionBuyerEnquiry(id, confirmAction.status);
            qc.invalidateQueries({ queryKey: ["buyer", "enquiry", id] });
            qc.invalidateQueries({ queryKey: ["buyer", "enquiries", user?.id] });
          } finally {
            setBusy(false);
            setConfirmAction(null);
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
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stoneBeige,
  },
  specVal: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textPrimary },
  compareLink: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.primary },
  quoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quoteNum: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  quoteAmt: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.primary },
  histRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.stoneBeige },
  histTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.textPrimary },
});
