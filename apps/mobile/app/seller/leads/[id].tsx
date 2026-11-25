import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Badge,
  Button,
  Card,
  EnquiryStatusBadge,
  ErrorState,
  ListScreenSkeleton,
  QuotationStatusBadge,
  ScreenHeader,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import {
  fetchSellerLeadDetail,
  transitionSellerLeadStatus,
} from "../../../src/services/seller.service";
import { startOrOpenConversation } from "../../../src/services/messaging.service";
import {
  decodeRfqDescription,
  formatDateShort,
  formatMoneyAmount,
  formatUnitLabel,
  getAllowedSellerEnquiryTransitions,
} from "../../../src/lib/domain-meta";
import type { EnquiryStatus } from "@stone/types";

export default function SellerLeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["seller", "lead", id],
    queryFn: () => fetchSellerLeadDetail(sellerProfile!.id, id!),
    enabled: Boolean(sellerProfile?.id && id),
  });

  if (q.isLoading || !sellerProfile) {
    return (
      <View style={styles.screen}>
        <ScreenHeader overline="CRM LEAD DOSSIER" title="Lead Specification" />
        <ListScreenSkeleton />
      </View>
    );
  }

  const data = q.data;
  if (!data) {
    return (
      <View style={styles.screen}>
        <ScreenHeader overline="CRM LEAD DOSSIER" title="Lead Specification" />
        <ErrorState onRetry={() => q.refetch()} />
      </View>
    );
  }

  const { enquiry, assignment, buyerProfile, quotations } = data;
  const decoded = decodeRfqDescription(enquiry.description);
  const transitions = getAllowedSellerEnquiryTransitions(enquiry.status as EnquiryStatus);

  const handleChatBuyer = async () => {
    if (!user?.id || !enquiry.buyer_id) return;
    setBusy(true);
    try {
      const convId = await startOrOpenConversation({
        sellerId: sellerProfile.id,
        enquiryId: enquiry.id,
        subject: enquiry.enquiry_title,
        callerRole: "seller",
        userId: user.id,
      });
      router.push(`/seller/chat/${convId}`);
    } finally {
      setBusy(false);
    }
  };

  const specPairs = [
    ["Material", decoded.materialType],
    ["Colour / Variety", decoded.colour],
    ["Finish", decoded.finish],
    ["Thickness", decoded.thickness],
    ["Origin", decoded.stoneOrigin],
    ["Custom Specs", decoded.customSpecifications],
  ].filter((r): r is [string, string] => Boolean(r[1]));

  return (
    <View style={styles.screen}>
      <ScreenHeader
        overline={assignment ? `MATCHED RFQ · ${assignment.match_score}% FIT` : "DIRECT BUYER ENQUIRY"}
        title="Lead Specification"
        subtitle={`Received ${formatDateShort(enquiry.created_at)}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Requirement Hero Card */}
        <Card variant="editorial">
          <View style={styles.topRow}>
            <Badge
              label={assignment ? `Matched ${assignment.match_score}%` : "Direct Request"}
              tone={assignment ? "copper" : "primary"}
            />
            <EnquiryStatusBadge status={enquiry.status} />
          </View>
          <Text style={[TYPOGRAPHY.sectionTitle, { marginTop: SPACING.xs }]}>
            {enquiry.enquiry_title}
          </Text>
          <View style={styles.buyerLine}>
            <Ionicons name="business-outline" size={14} color={COLORS.textSecondary} />
            <Text style={TYPOGRAPHY.caption}>
              {buyerProfile?.full_name || enquiry.guest_name || "Registered Trade Buyer"}
              {buyerProfile?.city ? ` · ${buyerProfile.city}` : ""}
            </Text>
          </View>

          <View style={styles.callouts}>
            <View style={styles.calloutBox}>
              <Text style={styles.calloutLabel}>VOLUME / QUANTITY</Text>
              <Text style={styles.calloutVal}>
                {enquiry.quantity} {formatUnitLabel(enquiry.unit)}
              </Text>
            </View>
            <View style={styles.calloutBox}>
              <Text style={styles.calloutLabel}>DELIVERY DESTINATION</Text>
              <Text numberOfLines={2} style={styles.calloutVal}>
                {enquiry.delivery_location || "Not specified"}
              </Text>
            </View>
          </View>

          {decoded.cleanDescription ? (
            <View style={styles.notesBox}>
              <Text style={styles.calloutLabel}>BUYER BRIEF</Text>
              <Text style={[TYPOGRAPHY.body, { marginTop: 4 }]}>
                {decoded.cleanDescription}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Material Spec Matrix */}
        {decoded.isRfq && specPairs.length > 0 ? (
          <Card variant="elevated">
            <Text style={TYPOGRAPHY.eyebrow}>STONE SPECIFICATIONS</Text>
            <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.sm, marginTop: 2 }]}>
              Technical Requirements Matrix
            </Text>
            <View style={styles.matrix}>
              {Array.from({ length: Math.ceil(specPairs.length / 2) }).map((_, rowIdx) => {
                const pair = specPairs.slice(rowIdx * 2, rowIdx * 2 + 2);
                return (
                  <View key={rowIdx} style={styles.matrixRow}>
                    {pair.map(([k, v]) => (
                      <View key={k} style={styles.matrixCell}>
                        <Text style={styles.calloutLabel}>{k.toUpperCase()}</Text>
                        <Text style={styles.specVal}>{v}</Text>
                      </View>
                    ))}
                    {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                );
              })}
            </View>
          </Card>
        ) : null}

        {/* Commercial Actions Dock */}
        <Card tone="ivory" style={styles.actionDock}>
          <Text style={TYPOGRAPHY.eyebrow}>COMMERCIAL RESPONSE</Text>
          <View style={styles.ctaRow}>
            {enquiry.buyer_id ? (
              <>
                <Button
                  title="Message Buyer"
                  variant="outline"
                  loading={busy}
                  onPress={handleChatBuyer}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Create Quote"
                  variant="copper"
                  onPress={() =>
                    router.push({
                      pathname: "/seller/quotations/new",
                      params: {
                        enquiryId: enquiry.id,
                        title: enquiry.enquiry_title,
                        quantity: String(enquiry.quantity),
                        unit: enquiry.unit,
                      },
                    })
                  }
                  style={{ flex: 1.15 }}
                />
              </>
            ) : (
              <Badge
                label={`Guest Contact: ${enquiry.guest_phone || enquiry.guest_email || "On File"}`}
                tone="copper"
              />
            )}
          </View>
        </Card>

        {transitions.length > 0 ? (
          <Card>
            <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs }]}>
              Update CRM Stage
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
              {transitions.map((t) => (
                <Button
                  key={t.status}
                  title={t.label}
                  variant={t.status === "rejected" ? "danger" : "outline"}
                  size="sm"
                  loading={busy}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await transitionSellerLeadStatus(sellerProfile.id, enquiry.id, t.status);
                      qc.invalidateQueries({ queryKey: ["seller", "lead", id] });
                      qc.invalidateQueries({ queryKey: ["seller", "leads", sellerProfile.id] });
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ))}
            </View>
          </Card>
        ) : null}

        {quotations.length > 0 ? (
          <Card variant="elevated">
            <Text style={TYPOGRAPHY.eyebrow}>COMMERCIAL SUBMISSIONS</Text>
            <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs, marginTop: 2 }]}>
              Issued Quotations ({quotations.length})
            </Text>
            {quotations.map((quo) => (
              <View key={quo.id} style={styles.specRow}>
                <View>
                  <Text style={styles.specVal}>{quo.quote_number}</Text>
                  <Text style={TYPOGRAPHY.caption}>{formatDateShort(quo.created_at)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={styles.quoteAmt}>
                    {formatMoneyAmount(quo.total_amount, quo.currency)}
                  </Text>
                  <QuotationStatusBadge status={quo.status} />
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACING.xs },
  buyerLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  callouts: { flexDirection: "row", gap: SPACING.xs, marginTop: SPACING.md },
  calloutBox: {
    flex: 1,
    backgroundColor: COLORS.ivoryElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    gap: 2,
  },
  calloutLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
  },
  calloutVal: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.deepGreen,
  },
  notesBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  matrix: {
    gap: SPACING.xs,
  },
  matrixRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  matrixCell: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.ivoryElevated,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: 2,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  specVal: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textPrimary },
  quoteAmt: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.primary,
    fontVariant: ["tabular-nums"],
  },
  actionDock: {
    gap: SPACING.xs,
    borderColor: COLORS.accentBorder,
  },
  ctaRow: { flexDirection: "row", gap: SPACING.sm },
});
