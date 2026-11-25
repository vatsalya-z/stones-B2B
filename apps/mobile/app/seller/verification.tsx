import React, { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { VERIFICATION_DOCUMENT_TYPES, type VerificationDocumentType } from "@stone/validation";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ListScreenSkeleton,
  ProgressBar,
  ScreenHeader,
  SelectSheet,
  VerificationStatusBadge,
} from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import {
  checkVerificationReadiness,
  DOCUMENT_TYPE_LABELS,
  formatDateShort,
} from "../../src/lib/domain-meta";
import {
  fetchSellerVerificationDocs,
  getVerificationDocSignedUrl,
  submitSellerVerification,
  uploadSellerVerificationDoc,
} from "../../src/services/seller.service";

export default function SellerVerificationScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [docType, setDocType] = useState<VerificationDocumentType>("gst_certificate");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const docsQ = useQuery({
    queryKey: ["seller", "docs", sellerProfile?.id],
    queryFn: () => fetchSellerVerificationDocs(sellerProfile!.id),
    enabled: Boolean(sellerProfile?.id),
  });

  if (!sellerProfile) {
    return (
      <View style={styles.screen}>
        <ScreenHeader overline="SUPPLIER COMPLIANCE" title="KYC & Verification" />
        <EmptyState
          icon="shield-checkmark-outline"
          title="Business Profile Required"
          description="Fill in your quarry company name, GSTIN, and facility address before uploading KYC documents."
          actionLabel="Complete Business Profile"
          onAction={() => router.replace("/seller/storefront")}
        />
      </View>
    );
  }

  const docs = docsQ.data ?? [];
  const readiness = checkVerificationReadiness(sellerProfile, docs.length);
  const completedCount = readiness.checks.filter((c) => c.complete).length;
  const totalCount = readiness.checks.length || 1;
  const pct = Math.round((completedCount / totalCount) * 100);

  const handleUpload = async () => {
    setMsg(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;

    const a = res.assets[0];
    setBusy(true);
    try {
      await uploadSellerVerificationDoc(sellerProfile.id, docType, {
        uri: a.uri,
        mimeType: a.mimeType,
        fileName: a.name,
        fileSize: a.size,
      });
      qc.invalidateQueries({ queryKey: ["seller", "docs", sellerProfile.id] });
      setMsg({ ok: true, text: "Document uploaded privately for compliance review." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitVerification = async () => {
    setMsg(null);
    setBusy(true);
    try {
      await submitSellerVerification();
      await refreshProfile();
      setMsg({ ok: true, text: "Verification package submitted to StonesDekho Admin Desk." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Submission failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        overline="COMPLIANCE VAULT"
        title="KYC & Verification"
        subtitle="RLS-protected quarry credential review"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Executive Status Card */}
        <Card tone="deep" variant="command" style={styles.statusHero}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.heroOverline}>VERIFICATION STATUS</Text>
              <Text style={styles.heroPct}>{pct}% Ready for Review</Text>
            </View>
            <VerificationStatusBadge status={sellerProfile.verification_status} />
          </View>
          <ProgressBar
            value={completedCount}
            max={totalCount}
            label={`${completedCount} of ${totalCount} requirements satisfied`}
            rightLabel={`${pct}%`}
            tone="accent"
            darkTrack
          />
          {sellerProfile.verification_reason ? (
            <View style={styles.adminNoteBox}>
              <Text style={styles.adminNote}>Admin Note: {sellerProfile.verification_reason}</Text>
            </View>
          ) : (
            <Text style={styles.heroSub}>
              Documents remain encrypted in private storage visible only to you and compliance reviewers.
            </Text>
          )}
        </Card>

        {msg ? (
          <View style={[styles.alert, msg.ok ? styles.ok : styles.err]}>
            <Text style={[styles.alertText, { color: msg.ok ? "#15803D" : COLORS.error }]}>
              {msg.text}
            </Text>
          </View>
        ) : null}

        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>READINESS CHECKLIST</Text>
          <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs, marginTop: 2 }]}>
            Required Credentials
          </Text>
          {readiness.checks.map((c, idx) => (
            <View key={c.label} style={[styles.checkRow, idx > 0 && styles.checkBorder]}>
              <Ionicons
                name={c.complete ? "checkmark-circle" : "ellipse-outline"}
                size={19}
                color={c.complete ? COLORS.success : COLORS.textSecondary}
              />
              <Text style={[styles.checkLabel, c.complete && styles.checkLabelDone]}>
                {c.label}
              </Text>
              <Badge label={c.complete ? "Ready" : "Pending"} tone={c.complete ? "success" : "neutral"} />
            </View>
          ))}
        </Card>

        <Card variant="editorial">
          <Text style={TYPOGRAPHY.eyebrow}>UPLOAD DOCUMENT</Text>
          <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.sm, marginTop: 2 }]}>
            Submit Statutory / Quarry Proof
          </Text>
          <SelectSheet
            label="Document Type"
            searchable={false}
            value={docType}
            options={VERIFICATION_DOCUMENT_TYPES.map((dt) => ({
              label: DOCUMENT_TYPE_LABELS[dt],
              value: dt,
            }))}
            onSelect={(v) => setDocType(v as VerificationDocumentType)}
          />
          <Button
            title="Choose & Upload PDF / Image"
            variant="outline"
            loading={busy}
            onPress={handleUpload}
          />
        </Card>

        <Card variant="elevated">
          <Text style={TYPOGRAPHY.eyebrow}>PRIVATE VAULT</Text>
          <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.xs, marginTop: 2 }]}>
            Uploaded Documents ({docs.length})
          </Text>
          {docsQ.isLoading ? (
            <ListScreenSkeleton count={2} />
          ) : docs.length === 0 ? (
            <Text style={TYPOGRAPHY.caption}>No KYC documents uploaded yet.</Text>
          ) : (
            docs.map((doc) => (
              <View key={doc.id} style={styles.docRow}>
                <View style={styles.docIcon}>
                  <Ionicons name="document-lock-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTitle}>
                    {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                  </Text>
                  <Text style={TYPOGRAPHY.caption}>
                    Uploaded {formatDateShort(doc.uploaded_at)}
                  </Text>
                </View>
                <Badge
                  label={doc.verification_status}
                  tone={
                    doc.verification_status === "approved"
                      ? "success"
                      : doc.verification_status === "rejected"
                        ? "error"
                        : "warning"
                  }
                />
                <Button
                  title="View"
                  variant="ghost"
                  size="sm"
                  onPress={async () => {
                    const url = await getVerificationDocSignedUrl(doc.storage_path);
                    Linking.openURL(url).catch(() => undefined);
                  }}
                />
              </View>
            ))
          )}
        </Card>

        {readiness.canSubmitStatus ? (
          <Button
            title="Submit Profile for Verification"
            variant="copper"
            disabled={!readiness.isReady}
            loading={busy}
            onPress={handleSubmitVerification}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  statusHero: { gap: SPACING.sm, borderColor: COLORS.accentBorder },
  heroOverline: { fontFamily: FONTS.bodySemiBold, fontSize: 10, letterSpacing: 1.3, color: COLORS.accent },
  heroPct: { fontFamily: FONTS.displayBold, fontSize: 22, color: COLORS.white, marginTop: 2 },
  heroSub: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.textOnDarkMuted },
  adminNoteBox: { backgroundColor: COLORS.errorSoft, padding: SPACING.xs, borderRadius: RADII.xs },
  adminNote: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.error },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alert: { padding: SPACING.sm, borderRadius: RADII.sm },
  ok: { backgroundColor: COLORS.successSoft },
  err: { backgroundColor: COLORS.errorSoft },
  alertText: { fontFamily: FONTS.bodyMedium, fontSize: 13 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  checkBorder: { borderTopWidth: 1, borderTopColor: COLORS.stoneBeige },
  checkLabel: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.textPrimary, flex: 1 },
  checkLabelDone: { color: COLORS.deepGreen },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
  },
  docIcon: {
    width: 34,
    height: 34,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textPrimary },
});
